import { randomUUID } from 'node:crypto'
import { join, resolve } from 'node:path'
import type { Character } from '../types/character.ts'
import type { Project } from '../types/project.ts'
import type { Tag } from '../types/tag.ts'
import { nodeProjectFileSystem, type ProjectFileSystem } from './project-file-system.ts'
import { ProjectJsonCodecError, projectJsonCodec, type ProjectJsonCodec } from './project-json-codec.ts'

const metadataFileName = 'metadata.json'
const backupFileName = 'metadata.json.bak'
const profileDirectoryName = 'profile'
const tagsDirectoryName = 'tags'

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
        const profilePath = join(this.dataDirectory, directoryName, profileDirectoryName)
        let entries
        try {
            entries = await this.fileSystem.readdir(profilePath, { withFileTypes: true })
        } catch (error) {
            if (isFileMissingError(error)) return []
            throw error
        }

        const characters: Character[] = []
        for (const entry of entries.filter((item) => item.isFile() && item.name.endsWith('.json'))) {
            try {
                characters.push(await this.decodeCharacter(join(profilePath, entry.name), projectId))
            } catch (error) {
                if (error instanceof ProjectJsonCodecError) throw error
                throw new ProjectStorageError('invalid-record', 'Character file is unreadable.')
            }
        }
        return characters.sort((a, b) => a.name.localeCompare(b.name))
    }

    async writeCharacter(directoryName: string, character: Character): Promise<void> {
        const profilePath = join(this.dataDirectory, directoryName, profileDirectoryName)
        await this.fileSystem.mkdir(profilePath, { recursive: true })
        await this.writeAtomically(join(profilePath, `${character.id}.json`), this.jsonCodec.encodeCharacter(character))
    }

    async readTags(directoryName: string, projectId: string): Promise<Tag[]> {
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
