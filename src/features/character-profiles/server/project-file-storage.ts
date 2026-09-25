import { randomUUID } from 'node:crypto'
import { basename, dirname, join, resolve } from 'node:path'
import type { Character, CharacterStorageIssue } from '../types/character.ts'
import type { BackupArchive, ProjectBackupBundle } from '../types/backup.ts'
import type { Project } from '../types/project.ts'
import type { Tag } from '../types/tag.ts'
import { nodeProjectFileSystem, type ProjectFileSystem } from './project-file-system.ts'
import { ProjectJsonCodecError, projectJsonCodec, type ProjectJsonCodec } from './project-json-codec.ts'

const metadataFileName = 'metadata.json'
const backupFileName = 'metadata.json.bak'
const profileDirectoryName = 'profile'
const tagsDirectoryName = 'tags'

export interface CharacterReadResult {
    characters: Character[]
    issues: CharacterStorageIssue[]
}

export class ProjectStorageError extends Error {
    constructor(
        readonly code: 'missing' | 'exists' | 'invalid-record',
        message: string
    ) {
        super(message)
        this.name = 'ProjectStorageError'
    }
}

export class ProjectFileStorage {
    private readonly dataDirectory: string

    constructor(
        dataDirectory: string,
        private readonly fileSystem: ProjectFileSystem = nodeProjectFileSystem,
        private readonly jsonCodec: ProjectJsonCodec = projectJsonCodec
    ) {
        this.dataDirectory = resolve(dataDirectory)
    }

    async listProjectDirectories(): Promise<string[]> {
        await this.recoverInterruptedReplacement()
        await this.fileSystem.mkdir(this.dataDirectory, { recursive: true })
        const entries = await this.fileSystem.readdir(this.dataDirectory, { withFileTypes: true })
        return entries
            .filter((entry) => entry.isDirectory())
            .map((entry) => entry.name)
            .sort((a, b) => a.localeCompare(b))
    }

    async createProjectDirectory(directoryName: string): Promise<void> {
        await this.fileSystem.mkdir(this.dataDirectory, { recursive: true })
        try {
            await this.fileSystem.mkdir(join(this.dataDirectory, directoryName))
        } catch (error) {
            if (isFileExistsError(error)) throw new ProjectStorageError('exists', 'Project directory already exists.')
            throw error
        }
    }

    async removeProjectDirectory(directoryName: string): Promise<void> {
        await this.fileSystem.rm(join(this.dataDirectory, directoryName), { recursive: true, force: true })
    }

    async renameProjectDirectory(currentName: string, nextName: string): Promise<void> {
        const currentPath = join(this.dataDirectory, currentName)
        const nextPath = join(this.dataDirectory, nextName)
        if (filesystemNameKey(currentName) === filesystemNameKey(nextName)) {
            const temporaryPath = `${currentPath}.rename-${randomUUID()}`
            await this.fileSystem.rename(currentPath, temporaryPath)
            try {
                await this.fileSystem.rename(temporaryPath, nextPath)
            } catch (error) {
                await this.fileSystem.rename(temporaryPath, currentPath)
                throw error
            }
            return
        }
        await this.fileSystem.rename(currentPath, nextPath)
    }

    readProject(directoryName: string): Promise<Project> {
        return this.decodeProject(join(this.dataDirectory, directoryName, metadataFileName))
    }

    readProjectBackup(directoryName: string): Promise<Project> {
        return this.decodeProject(join(this.dataDirectory, directoryName, backupFileName))
    }

    async hasValidProjectBackup(directoryName: string): Promise<boolean> {
        try {
            await this.fileSystem.stat(join(this.dataDirectory, directoryName, backupFileName))
            await this.readProjectBackup(directoryName)
            return true
        } catch {
            return false
        }
    }

    async writeProject(directoryName: string, project: Project, preservePrevious: boolean): Promise<void> {
        const directoryPath = join(this.dataDirectory, directoryName)
        const metadataPath = join(directoryPath, metadataFileName)
        if (preservePrevious) {
            await this.writeBackup(metadataPath, join(directoryPath, backupFileName), this.jsonCodec.decodeProject)
        }
        await this.writeAtomically(metadataPath, this.jsonCodec.encodeProject(project))
    }

    async readCharacters(directoryName: string, projectId: string): Promise<Character[]> {
        return (await this.readCharactersFromDirectory(directoryName, projectId, false)).characters
    }

    async readCharactersWithIssues(directoryName: string, projectId: string): Promise<CharacterReadResult> {
        return this.readCharactersFromDirectory(directoryName, projectId, false)
    }

    async readCharactersStrict(directoryName: string, projectId: string): Promise<Character[]> {
        return (await this.readCharactersFromDirectory(directoryName, projectId, true)).characters
    }

    private async readCharactersFromDirectory(
        directoryName: string,
        projectId: string,
        strict: boolean
    ): Promise<CharacterReadResult> {
        const profilePath = join(this.dataDirectory, directoryName, profileDirectoryName)
        let entries
        try {
            entries = await this.fileSystem.readdir(profilePath, { withFileTypes: true })
        } catch (error) {
            if (isFileMissingError(error)) return { characters: [], issues: [] }
            throw error
        }

        const characters: Character[] = []
        const issues: CharacterStorageIssue[] = []
        for (const entry of entries.filter((item) => item.isFile() && item.name.endsWith('.json'))) {
            try {
                characters.push(await this.decodeCharacter(join(profilePath, entry.name), projectId))
            } catch (error) {
                if (strict) throw new ProjectStorageError('invalid-record', `角色文件“${entry.name}”无效。`)
                issues.push(characterFileIssue(entry.name, error))
                continue
            }
        }
        return { characters: characters.sort((a, b) => a.name.localeCompare(b.name)), issues }
    }

    async writeCharacter(directoryName: string, character: Character): Promise<void> {
        const profilePath = join(this.dataDirectory, directoryName, profileDirectoryName)
        await this.fileSystem.mkdir(profilePath, { recursive: true })
        await this.writeAtomically(join(profilePath, `${character.id}.json`), this.jsonCodec.encodeCharacter(character))
    }

    async readTags(directoryName: string, projectId: string): Promise<Tag[]> {
        return this.readTagsFromDirectory(directoryName, projectId, false)
    }

    async readTagsStrict(directoryName: string, projectId: string): Promise<Tag[]> {
        return this.readTagsFromDirectory(directoryName, projectId, true)
    }

    private async readTagsFromDirectory(directoryName: string, projectId: string, strict: boolean): Promise<Tag[]> {
        const tagsPath = join(this.dataDirectory, directoryName, tagsDirectoryName)
        let entries
        try {
            entries = await this.fileSystem.readdir(tagsPath, { withFileTypes: true })
        } catch (error) {
            if (isFileMissingError(error)) return []
            throw error
        }

        const tags: Tag[] = []
        for (const entry of entries.filter((item) => item.isFile() && item.name.endsWith('.json'))) {
            try {
                tags.push(await this.decodeTag(join(tagsPath, entry.name), projectId))
            } catch {
                if (strict) throw new ProjectStorageError('invalid-record', `标签文件“${entry.name}”无效。`)
                continue
            }
        }
        return tags.sort((a, b) => a.name.localeCompare(b.name))
    }

    async writeTag(directoryName: string, tag: Tag, preservePrevious: boolean): Promise<void> {
        const tagsPath = join(this.dataDirectory, directoryName, tagsDirectoryName)
        await this.fileSystem.mkdir(tagsPath, { recursive: true })
        const filePath = join(tagsPath, `${tag.id}.json`)
        if (preservePrevious) {
            await this.writeBackup(
                filePath,
                `${filePath}.bak`,
                (contents, projectId) => this.jsonCodec.decodeTag(contents, projectId ?? ''),
                tag.projectId
            )
        }
        await this.writeAtomically(filePath, this.jsonCodec.encodeTag(tag))
    }

    async replaceDataset(bundles: ProjectBackupBundle[]): Promise<void> {
        const stagingDirectory = `${this.dataDirectory}.import-${randomUUID()}`
        const previousDirectory = `${this.dataDirectory}.backup-${Date.now()}-${randomUUID()}`
        await this.fileSystem.rm(stagingDirectory, { recursive: true, force: true })

        try {
            await this.writeDataset(stagingDirectory, bundles)
            if (!(await this.directoryExists(this.dataDirectory))) {
                await this.fileSystem.rename(stagingDirectory, this.dataDirectory)
                return
            }
            await this.fileSystem.rename(this.dataDirectory, previousDirectory)
            try {
                await this.fileSystem.rename(stagingDirectory, this.dataDirectory)
            } catch (error) {
                await this.fileSystem.rename(previousDirectory, this.dataDirectory)
                throw error
            }
        } finally {
            await this.fileSystem.rm(stagingDirectory, { recursive: true, force: true })
        }
    }

    private async directoryExists(directory: string): Promise<boolean> {
        try {
            await this.fileSystem.stat(directory)
            return true
        } catch (error) {
            if (isFileMissingError(error)) return false
            throw error
        }
    }

    async listDatasetBackups(): Promise<BackupArchive[]> {
        const parentDirectory = dirname(this.dataDirectory)
        const dataDirectoryName = basename(this.dataDirectory)
        const entries = await this.fileSystem.readdir(parentDirectory, { withFileTypes: true })
        const backups: BackupArchive[] = []
        for (const entry of entries.filter(
            (item) => item.isDirectory() && item.name.startsWith(`${dataDirectoryName}.backup-`)
        )) {
            const backupPath = join(parentDirectory, entry.name)
            const stats = await this.fileSystem.stat(backupPath)
            backups.push({
                id: entry.name.slice(`${dataDirectoryName}.backup-`.length),
                createdAt: stats.mtime.toISOString()
            })
        }
        return backups.sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    }

    async restoreDatasetBackup(id: string): Promise<void> {
        if (!/^[A-Za-z0-9-]+$/u.test(id)) throw new ProjectStorageError('invalid-record', '备份标识无效。')
        const parentDirectory = dirname(this.dataDirectory)
        const dataDirectoryName = basename(this.dataDirectory)
        const backupDirectory = join(parentDirectory, `${dataDirectoryName}.backup-${id}`)
        const currentDirectory = `${this.dataDirectory}.backup-${Date.now()}-${randomUUID()}`
        await this.fileSystem.stat(backupDirectory)
        await this.fileSystem.rename(this.dataDirectory, currentDirectory)
        try {
            await this.fileSystem.rename(backupDirectory, this.dataDirectory)
        } catch (error) {
            await this.fileSystem.rename(currentDirectory, this.dataDirectory)
            throw error
        }
    }

    private async writeDataset(directory: string, bundles: ProjectBackupBundle[]): Promise<void> {
        await this.fileSystem.mkdir(directory, { recursive: true })
        for (const bundle of bundles) {
            const projectDirectory = join(directory, bundle.project.name)
            await this.fileSystem.mkdir(projectDirectory, { recursive: true })
            await this.fileSystem.writeFile(
                join(projectDirectory, metadataFileName),
                this.jsonCodec.encodeProject(bundle.project),
                'utf8'
            )
            if (bundle.characters.length) {
                const profilePath = join(projectDirectory, profileDirectoryName)
                await this.fileSystem.mkdir(profilePath, { recursive: true })
                for (const character of bundle.characters) {
                    await this.fileSystem.writeFile(
                        join(profilePath, `${character.id}.json`),
                        this.jsonCodec.encodeCharacter(character),
                        'utf8'
                    )
                }
            }
            if (bundle.tags.length) {
                const tagsPath = join(projectDirectory, tagsDirectoryName)
                await this.fileSystem.mkdir(tagsPath, { recursive: true })
                for (const tag of bundle.tags) {
                    await this.fileSystem.writeFile(
                        join(tagsPath, `${tag.id}.json`),
                        this.jsonCodec.encodeTag(tag),
                        'utf8'
                    )
                }
            }
        }
    }

    private async recoverInterruptedReplacement(): Promise<void> {
        const parentDirectory = dirname(this.dataDirectory)
        const dataDirectoryName = basename(this.dataDirectory)
        let entries
        try {
            entries = await this.fileSystem.readdir(parentDirectory, { withFileTypes: true })
        } catch (error) {
            if (isFileMissingError(error)) return
            throw error
        }

        const stagingDirectories = entries
            .filter((entry) => entry.isDirectory() && entry.name.startsWith(`${dataDirectoryName}.import-`))
            .map((entry) => entry.name)
        const previousDirectories = entries
            .filter((entry) => entry.isDirectory() && entry.name.startsWith(`${dataDirectoryName}.backup-`))
            .map((entry) => entry.name)
            .sort()
            .reverse()
        const dataDirectoryExists = entries.some((entry) => entry.isDirectory() && entry.name === dataDirectoryName)

        if (!dataDirectoryExists && previousDirectories.length) {
            await this.fileSystem.rename(join(parentDirectory, previousDirectories[0]!), this.dataDirectory)
        }
        for (const stagingDirectory of stagingDirectories) {
            await this.fileSystem.rm(join(parentDirectory, stagingDirectory), { recursive: true, force: true })
        }
    }

    private async decodeProject(filePath: string): Promise<Project> {
        try {
            return this.jsonCodec.decodeProject(await this.fileSystem.readFile(filePath, 'utf8'))
        } catch (error) {
            if (isFileMissingError(error)) throw new ProjectStorageError('missing', 'Project metadata is missing.')
            throw error
        }
    }

    private async decodeCharacter(filePath: string, projectId: string): Promise<Character> {
        return this.jsonCodec.decodeCharacter(await this.fileSystem.readFile(filePath, 'utf8'), projectId)
    }

    private async decodeTag(filePath: string, projectId: string): Promise<Tag> {
        return this.jsonCodec.decodeTag(await this.fileSystem.readFile(filePath, 'utf8'), projectId)
    }

    private async writeBackup(
        filePath: string,
        backupPath: string,
        validate: (contents: string, projectId?: string) => unknown,
        projectId?: string
    ): Promise<void> {
        const previousContents = await this.fileSystem.readFile(filePath, 'utf8')
        validate(previousContents, projectId)
        const temporaryBackupPath = `${backupPath}.${randomUUID()}.tmp`
        try {
            await this.fileSystem.writeFile(temporaryBackupPath, previousContents, { flag: 'wx' })
            await this.fileSystem.rename(temporaryBackupPath, backupPath)
        } finally {
            await this.fileSystem.rm(temporaryBackupPath, { force: true })
        }
    }

    private async writeAtomically(filePath: string, contents: string): Promise<void> {
        const temporaryPath = `${filePath}.${randomUUID()}.tmp`
        try {
            await this.fileSystem.writeFile(temporaryPath, contents, { flag: 'wx' })
            await this.fileSystem.rename(temporaryPath, filePath)
        } finally {
            await this.fileSystem.rm(temporaryPath, { force: true })
        }
    }
}

function filesystemNameKey(value: string): string {
    return value.normalize('NFC').toUpperCase().toLowerCase().normalize('NFC')
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null
}

function isFileExistsError(error: unknown): boolean {
    return isRecord(error) && error.code === 'EEXIST'
}

function isFileMissingError(error: unknown): boolean {
    return isRecord(error) && error.code === 'ENOENT'
}

function characterFileIssue(fileName: string, error: unknown): CharacterStorageIssue {
    const reason: CharacterStorageIssue['reason'] =
        error instanceof ProjectJsonCodecError
            ? error.code === 'invalid-json'
                ? 'invalid-json'
                : error.code === 'unsupported-version'
                  ? 'unsupported-version'
                  : 'invalid-fields'
            : 'unreadable'
    return { fileName, reason }
}
