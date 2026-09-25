import { mkdir, readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { basename, join, resolve } from 'node:path'
import { Buffer } from 'node:buffer'
import { platform } from 'node:process'
import type {
    Project,
    ProjectHistoryEntry,
    ProjectListResult,
    ProjectRepairResolution,
    ProjectStorageIssue,
    ProjectInput
} from '../types/project.ts'
import type { Character, CharacterInput } from '../types/character.ts'
import type { Tag, TagInput, TagListResult } from '../types/tag.ts'
import { isRecord } from './guards.ts'

const formatVersion = 1
const metadataFileName = 'metadata.json'
const backupFileName = 'metadata.json.bak'
const profileDirectoryName = 'profile'
const tagsDirectoryName = 'tags'
const invalidDirectoryCharacters = /[<>:"/\\|?*]/u
const reservedWindowsNames = /^(con|prn|aux|nul|com[1-9¹²³]|lpt[1-9¹²³])(?:\..*)?$/iu

interface ProjectMetadata extends Project {
    formatVersion: number
}

interface CharacterMetadata extends Character {
    formatVersion: number
}

interface TagMetadata extends Tag {
    formatVersion: number
}

interface LocatedProject {
    directoryName: string
    project: Project
}

export class ProjectRepositoryError extends Error {
    constructor(
        message: string,
        readonly code: 'invalid-name' | 'duplicate-name' | 'not-found' | 'read-only' | 'invalid-data'
    ) {
        super(message)
        this.name = 'ProjectRepositoryError'
    }
}

export class ProjectRepository {
    private readonly dataDirectory: string
    private operationQueue: Promise<void> = Promise.resolve()

    constructor(dataDirectory: string) {
        this.dataDirectory = resolve(dataDirectory)
    }

    listProjects(): Promise<ProjectListResult> {
        return this.enqueueOperation(() => this.readProjects())
    }

    createProject(input: ProjectInput): Promise<Project> {
        return this.enqueueOperation(async () => {
            const { name, description } = normalizeProjectInput(input)
            await this.assertNameAvailable(name)

            const now = new Date().toISOString()
            const project: Project = {
                id: randomUUID(),
                name,
                description,
                createdAt: now,
                updatedAt: now,
                history: [{ at: now, summary: '创建项目' }]
            }
            const directoryPath = join(this.dataDirectory, name)

            await mkdir(this.dataDirectory, { recursive: true })
            try {
                await mkdir(directoryPath)
            } catch (error) {
                if (isFileExistsError(error)) throw duplicateNameError(name)
                throw error
            }

            try {
                await this.writeMetadata(directoryPath, project, false)
            } catch (error) {
                await rm(directoryPath, { recursive: true, force: true })
                throw error
            }

            return project
        })
    }

    updateProject(id: string, input: ProjectInput): Promise<Project> {
        return this.enqueueOperation(async () => {
            const { name, description } = normalizeProjectInput(input)
            const located = await this.findProject(id)
            await this.assertNameAvailable(name, id)

            const changes: string[] = []
            if (located.project.name !== name) changes.push('修改项目名称')
            if (located.project.description !== description) changes.push('修改项目简介')
            if (changes.length === 0) return located.project

            const now = new Date().toISOString()
            const updated: Project = {
                ...located.project,
                name,
                description,
                updatedAt: now,
                history: [{ at: now, summary: changes.join('、') }, ...located.project.history]
            }
            const currentPath = join(this.dataDirectory, located.directoryName)
            const nextPath = join(this.dataDirectory, name)
            await this.writeMetadata(currentPath, updated, true)

            try {
                if (located.directoryName !== name) await this.renameDirectory(currentPath, nextPath)
            } catch (error) {
                try {
                    await this.writeMetadata(currentPath, located.project, true)
                } catch {
                    throw new ProjectRepositoryError(
                        `项目改名未能完成，且无法自动恢复；目录“${located.directoryName}”中的元数据需要人工检查。`,
                        'read-only'
                    )
                }
                throw error
            }

            return updated
        })
    }

    deleteProject(id: string): Promise<Project> {
        return this.enqueueOperation(async () => {
            const located = await this.findProject(id)
            if (located.project.deletedAt) return located.project

            const now = new Date().toISOString()
            const deleted: Project = {
                ...located.project,
                deletedAt: now,
                updatedAt: now,
                history: [{ at: now, summary: '删除项目' }, ...located.project.history]
            }
            await this.writeMetadata(join(this.dataDirectory, located.directoryName), deleted, true)
            return deleted
        })
    }

    restoreProject(id: string): Promise<Project> {
        return this.enqueueOperation(async () => {
            const located = await this.findProject(id)
            if (!located.project.deletedAt) return located.project

            const now = new Date().toISOString()
            const restored: Project = {
                ...located.project,
                updatedAt: now,
                history: [{ at: now, summary: '恢复项目' }, ...located.project.history]
            }
            delete restored.deletedAt
            await this.writeMetadata(join(this.dataDirectory, located.directoryName), restored, true)
            return restored
        })
    }

    listCharacters(projectId: string): Promise<{ characters: Character[] }> {
        return this.enqueueOperation(async () => {
            const located = await this.findProject(projectId)
            const characters = await this.readCharacters(located)
            return {
                characters: characters.filter((character) => !character.deletedAt),
                deletedCharacters: characters.filter((character) => character.deletedAt)
            }
        })
    }

    listTags(projectId: string): Promise<TagListResult> {
        return this.enqueueOperation(async () => {
            const located = await this.findProject(projectId)
            return { tags: await this.readTags(located) }
        })
    }

    createTag(projectId: string, input: TagInput): Promise<Tag> {
        return this.enqueueOperation(async () => {
            const located = await this.findProject(projectId)
            const normalized = normalizeTagInput(input)
            await this.assertTagNameAvailable(located, normalized.name)

            const now = new Date().toISOString()
            const tag: Tag = { id: randomUUID(), projectId, ...normalized, createdAt: now, updatedAt: now }
            await this.writeTag(located, tag)
            return tag
        })
    }

    renameTag(projectId: string, tagId: string, input: TagInput): Promise<Tag> {
        return this.enqueueOperation(async () => {
            const located = await this.findProject(projectId)
            const tags = await this.readTags(located)
            const current = tags.find((tag) => tag.id === tagId)
            if (!current) throw new ProjectRepositoryError('找不到该标签。', 'not-found')

            const normalized = normalizeTagInput(input)
            await this.assertTagNameAvailable(located, normalized.name, tagId)
            if (current.name === normalized.name) return current

            const updated: Tag = { ...current, ...normalized, updatedAt: new Date().toISOString() }
            await this.writeTag(located, updated, true)
            return updated
        })
    }

    createCharacter(projectId: string, input: CharacterInput): Promise<Character> {
        return this.enqueueOperation(async () => {
            const located = await this.findProject(projectId)
            const normalized = normalizeCharacterInput(input)
            await this.assertCharacterNameAvailable(located, normalized.name)

            const now = new Date().toISOString()
            const character: Character = {
                id: randomUUID(),
                projectId,
                ...normalized,
                tagIds: normalized.tagIds ?? [],
                createdAt: now,
                updatedAt: now
            }
            await this.writeCharacter(located, character)
            return character
        })
    }

    updateCharacter(projectId: string, characterId: string, input: CharacterInput): Promise<Character> {
        return this.enqueueOperation(async () => {
            const located = await this.findProject(projectId)
            const characters = await this.readCharacters(located)
            const current = characters.find((character) => character.id === characterId)
            if (!current) throw new ProjectRepositoryError('找不到该角色。', 'not-found')

            const normalized = normalizeCharacterInput(input)
            await this.assertCharacterNameAvailable(located, normalized.name, characterId)
            if (JSON.stringify({ ...current, ...normalized }) === JSON.stringify(current)) return current

            const updated: Character = { ...current, ...normalized, updatedAt: new Date().toISOString() }
            await this.writeCharacter(located, updated)
            return updated
        })
    }

    deleteCharacter(projectId: string, characterId: string): Promise<Character> {
        return this.enqueueOperation(async () => {
            const located = await this.findProject(projectId)
            const characters = await this.readCharacters(located)
            const current = characters.find((character) => character.id === characterId)
            if (!current) throw new ProjectRepositoryError('找不到该角色。', 'not-found')
            if (current.deletedAt) return current

            const deleted: Character = { ...current, deletedAt: new Date().toISOString() }
            await this.writeCharacter(located, deleted)
            return deleted
        })
    }

    restoreCharacter(projectId: string, characterId: string): Promise<Character> {
        return this.enqueueOperation(async () => {
            const located = await this.findProject(projectId)
            const characters = await this.readCharacters(located)
            const current = characters.find((character) => character.id === characterId)
            if (!current) throw new ProjectRepositoryError('找不到该角色。', 'not-found')
            if (!current.deletedAt) return current

            const restored: Character = { ...current, updatedAt: new Date().toISOString() }
            delete restored.deletedAt
            await this.writeCharacter(located, restored)
            return restored
        })
    }

    repairProject(directoryName: string, resolution: ProjectRepairResolution): Promise<void> {
        return this.enqueueOperation(async () => {
            const { issues } = await this.readProjects()
            const issue = issues.find((item) => item.directoryName === directoryName)
            if (!issue) throw new ProjectRepositoryError('找不到需要修复的项目目录。', 'not-found')

            const directoryPath = join(this.dataDirectory, directoryName)
            if (resolution === 'restore-backup') {
                if (issue.projectId || !issue.backupAvailable) {
                    throw new ProjectRepositoryError('该项目没有可直接恢复的有效备份。', 'invalid-data')
                }
                const backup = await this.readMetadata(join(directoryPath, backupFileName))
                await this.writeMetadata(directoryPath, backup, false)
                return
            }

            if (!issue.projectId || !issue.metadataName) {
                throw new ProjectRepositoryError('请先恢复项目的有效元数据。', 'invalid-data')
            }

            const project = await this.readMetadata(join(directoryPath, metadataFileName))
            if (resolution === 'metadata-name') {
                const targetName = validateFilesystemProjectName(project.name)
                await this.assertNameAvailable(targetName, project.id)
                try {
                    await this.renameDirectory(directoryPath, join(this.dataDirectory, targetName))
                } catch (error) {
                    if (isFileExistsError(error)) throw duplicateNameError(targetName)
                    throw error
                }
                return
            }

            if (resolution !== 'directory-name') {
                throw new ProjectRepositoryError('项目修复方式无效。', 'invalid-name')
            }

            const targetName = validateFilesystemProjectName(directoryName)
            await this.assertNameAvailable(targetName, project.id)
            const now = new Date().toISOString()
            const repaired: Project = {
                ...project,
                name: targetName,
                updatedAt: now,
                history: [{ at: now, summary: '修复项目名称' }, ...project.history]
            }
            await this.writeMetadata(directoryPath, repaired, true)
        })
    }

    private async readProjects(): Promise<ProjectListResult> {
        await mkdir(this.dataDirectory, { recursive: true })
        const entries = await readdir(this.dataDirectory, { withFileTypes: true })
        const projects: Project[] = []
        const deletedProjects: Project[] = []
        const issues: ProjectStorageIssue[] = []

        for (const entry of entries.filter((item) => item.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))) {
            const directoryPath = join(this.dataDirectory, entry.name)
            const metadataPath = join(directoryPath, metadataFileName)

            try {
                const project = await this.readMetadata(metadataPath)
                if (project.name !== entry.name) {
                    issues.push({
                        directoryName: entry.name,
                        metadataName: project.name,
                        projectId: project.id,
                        message: `目录名“${entry.name}”与项目名“${project.name}”不一致；项目当前只读。`,
                        backupAvailable: await this.hasValidBackup(directoryPath)
                    })
                    continue
                }
                if (project.deletedAt) deletedProjects.push(project)
                else projects.push(project)
            } catch (error) {
                issues.push({
                    directoryName: entry.name,
                    message: error instanceof Error ? error.message : '项目数据无法读取。',
                    backupAvailable: await this.hasValidBackup(directoryPath)
                })
            }
        }

        return { projects, deletedProjects, issues }
    }

    private async findProject(id: string): Promise<LocatedProject> {
        const { projects, deletedProjects, issues } = await this.readProjects()
        const project = [...projects, ...deletedProjects].find((item) => item.id === id)
        if (project) return { project, directoryName: project.name }
        if (issues.some((issue) => issue.projectId === id)) {
            throw new ProjectRepositoryError('该项目的目录与元数据不一致，当前只读。', 'read-only')
        }
        throw new ProjectRepositoryError('找不到该项目。', 'not-found')
    }

    private async readCharacters(located: LocatedProject): Promise<Character[]> {
        const profilePath = join(this.dataDirectory, located.directoryName, profileDirectoryName)
        let entries
        try {
            entries = await readdir(profilePath, { withFileTypes: true })
        } catch (error) {
            if (isFileMissingError(error)) return []
            throw error
        }

        const characters: Character[] = []
        for (const entry of entries.filter((item) => item.isFile() && item.name.endsWith('.json'))) {
            characters.push(await this.readCharacter(join(profilePath, entry.name), located.project.id))
        }
        return characters.sort((a, b) => a.name.localeCompare(b.name))
    }

    private async readTags(located: LocatedProject): Promise<Tag[]> {
        const tagsPath = join(this.dataDirectory, located.directoryName, tagsDirectoryName)
        let entries
        try {
            entries = await readdir(tagsPath, { withFileTypes: true })
        } catch (error) {
            if (isFileMissingError(error)) return []
            throw error
        }

        const tags: Tag[] = []
        for (const entry of entries.filter((item) => item.isFile() && item.name.endsWith('.json'))) {
            try {
                tags.push(await this.readTag(join(tagsPath, entry.name), located.project.id))
            } catch (error) {
                if (error instanceof ProjectRepositoryError && error.code === 'invalid-data') continue
                throw error
            }
        }
        return tags.sort((a, b) => a.name.localeCompare(b.name))
    }

    private async readCharacter(filePath: string, projectId: string): Promise<Character> {
        let parsed: unknown
        try {
            parsed = JSON.parse(await readFile(filePath, 'utf8')) as unknown
        } catch {
            throw new ProjectRepositoryError('角色档案无法解析为有效 JSON。', 'invalid-data')
        }

        if (
            !isRecord(parsed) ||
            parsed.formatVersion !== formatVersion ||
            parsed.projectId !== projectId ||
            typeof parsed.id !== 'string' ||
            typeof parsed.name !== 'string' ||
            !Array.isArray(parsed.aliases) ||
            !parsed.aliases.every((alias) => typeof alias === 'string') ||
            (parsed.tagIds !== undefined &&
                (!Array.isArray(parsed.tagIds) || !parsed.tagIds.every((tagId) => typeof tagId === 'string'))) ||
            typeof parsed.introduction !== 'string' ||
            typeof parsed.appearance !== 'string' ||
            typeof parsed.personality !== 'string' ||
            typeof parsed.backstory !== 'string' ||
            typeof parsed.motivation !== 'string' ||
            typeof parsed.abilities !== 'string' ||
            typeof parsed.notes !== 'string' ||
            typeof parsed.createdAt !== 'string' ||
            typeof parsed.updatedAt !== 'string'
        ) {
            throw new ProjectRepositoryError('角色档案缺少必需字段或字段格式错误。', 'invalid-data')
        }

        return {
            id: parsed.id,
            projectId: parsed.projectId,
            name: parsed.name,
            aliases: parsed.aliases,
            tagIds: parsed.tagIds === undefined ? [] : parsed.tagIds,
            introduction: parsed.introduction,
            appearance: parsed.appearance,
            personality: parsed.personality,
            backstory: parsed.backstory,
            motivation: parsed.motivation,
            abilities: parsed.abilities,
            notes: parsed.notes,
            createdAt: parsed.createdAt,
            updatedAt: parsed.updatedAt,
            ...(typeof parsed.deletedAt === 'string' ? { deletedAt: parsed.deletedAt } : {})
        }
    }

    private async readTag(filePath: string, projectId: string): Promise<Tag> {
        let parsed: unknown
        try {
            parsed = JSON.parse(await readFile(filePath, 'utf8')) as unknown
        } catch {
            throw new ProjectRepositoryError('项目标签无法解析为有效 JSON。', 'invalid-data')
        }

        if (
            !isRecord(parsed) ||
            parsed.formatVersion !== formatVersion ||
            parsed.projectId !== projectId ||
            typeof parsed.id !== 'string' ||
            typeof parsed.name !== 'string' ||
            typeof parsed.createdAt !== 'string' ||
            typeof parsed.updatedAt !== 'string'
        ) {
            throw new ProjectRepositoryError('项目标签缺少必需字段或字段格式错误。', 'invalid-data')
        }

        return {
            id: parsed.id,
            projectId: parsed.projectId,
            name: parsed.name,
            createdAt: parsed.createdAt,
            updatedAt: parsed.updatedAt
        }
    }

    private async assertCharacterNameAvailable(
        located: LocatedProject,
        name: string,
        excludingId?: string
    ): Promise<void> {
        const duplicate = (await this.readCharacters(located)).find(
            (character) => character.id !== excludingId && characterNameKey(character.name) === characterNameKey(name)
        )
        if (duplicate) throw new ProjectRepositoryError(`角色姓名“${name}”已存在，请换一个姓名。`, 'duplicate-name')
    }

    private async assertTagNameAvailable(located: LocatedProject, name: string, excludingId?: string): Promise<void> {
        const duplicate = (await this.readTags(located)).find(
            (tag) => tag.id !== excludingId && tagNameKey(tag.name) === tagNameKey(name)
        )
        if (duplicate) throw new ProjectRepositoryError(`标签“${name}”已存在，请换一个名称。`, 'duplicate-name')
    }

    private async writeCharacter(located: LocatedProject, character: Character): Promise<void> {
        const profilePath = join(this.dataDirectory, located.directoryName, profileDirectoryName)
        await mkdir(profilePath, { recursive: true })
        const filePath = join(profilePath, `${character.id}.json`)
        const temporaryPath = `${filePath}.${randomUUID()}.tmp`
        const metadata: CharacterMetadata = { formatVersion, ...character }
        try {
            await writeFile(temporaryPath, `${JSON.stringify(metadata, null, 2)}\n`, { flag: 'wx' })
            await rename(temporaryPath, filePath)
        } finally {
            await rm(temporaryPath, { force: true })
        }
    }

    private async writeTag(located: LocatedProject, tag: Tag, preservePrevious = false): Promise<void> {
        const tagsPath = join(this.dataDirectory, located.directoryName, tagsDirectoryName)
        await mkdir(tagsPath, { recursive: true })
        const filePath = join(tagsPath, `${tag.id}.json`)
        if (preservePrevious) {
            const previousContents = await readFile(filePath, 'utf8')
            await this.readTag(filePath, tag.projectId)
            const backupPath = `${filePath}.bak`
            const temporaryBackupPath = `${backupPath}.${randomUUID()}.tmp`
            try {
                await writeFile(temporaryBackupPath, previousContents, { flag: 'wx' })
                await rename(temporaryBackupPath, backupPath)
            } finally {
                await rm(temporaryBackupPath, { force: true })
            }
        }
        const temporaryPath = `${filePath}.${randomUUID()}.tmp`
        const metadata: TagMetadata = { formatVersion, ...tag }
        try {
            await writeFile(temporaryPath, `${JSON.stringify(metadata, null, 2)}\n`, { flag: 'wx' })
            await rename(temporaryPath, filePath)
        } finally {
            await rm(temporaryPath, { force: true })
        }
    }

    private async assertNameAvailable(name: string, excludingId?: string): Promise<void> {
        const { projects, deletedProjects, issues } = await this.readProjects()
        const key = projectNameKey(name)
        const duplicateProject = [...projects, ...deletedProjects].find(
            (project) => project.id !== excludingId && projectNameKey(project.name) === key
        )
        const duplicateIssue = issues.find(
            (issue) =>
                issue.projectId !== excludingId &&
                [issue.directoryName, issue.metadataName].some((item) => item && projectNameKey(item) === key)
        )

        if (duplicateProject || duplicateIssue) throw duplicateNameError(name)
    }

    private enqueueOperation<T>(operation: () => Promise<T>): Promise<T> {
        const result = this.operationQueue.then(operation, operation)
        this.operationQueue = result.then(
            () => undefined,
            () => undefined
        )
        return result
    }

    private async readMetadata(filePath: string): Promise<Project> {
        let parsed: unknown
        try {
            parsed = JSON.parse(await readFile(filePath, 'utf8')) as unknown
        } catch (error) {
            if (isFileMissingError(error))
                throw new ProjectRepositoryError('项目 metadata.json 不存在。', 'invalid-data')
            throw new ProjectRepositoryError('项目 metadata.json 无法解析为有效 JSON。', 'invalid-data')
        }

        if (!isRecord(parsed) || parsed.formatVersion !== formatVersion) {
            throw new ProjectRepositoryError('项目数据格式版本不受支持。', 'invalid-data')
        }
        if (
            typeof parsed.id !== 'string' ||
            typeof parsed.name !== 'string' ||
            typeof parsed.description !== 'string' ||
            typeof parsed.createdAt !== 'string' ||
            typeof parsed.updatedAt !== 'string' ||
            !Array.isArray(parsed.history) ||
            !parsed.history.every(isHistoryEntry) ||
            (parsed.deletedAt !== undefined && typeof parsed.deletedAt !== 'string')
        ) {
            throw new ProjectRepositoryError('项目 metadata.json 缺少必需字段或字段格式错误。', 'invalid-data')
        }

        return {
            id: parsed.id,
            name: parsed.name,
            description: parsed.description,
            createdAt: parsed.createdAt,
            updatedAt: parsed.updatedAt,
            ...(typeof parsed.deletedAt === 'string' ? { deletedAt: parsed.deletedAt } : {}),
            history: parsed.history
        }
    }

    private async writeMetadata(directoryPath: string, project: Project, preservePrevious: boolean): Promise<void> {
        const metadataPath = join(directoryPath, metadataFileName)
        if (preservePrevious) {
            const previousContents = await readFile(metadataPath, 'utf8')
            await this.readMetadata(metadataPath)
            const backupPath = join(directoryPath, backupFileName)
            const temporaryBackupPath = `${backupPath}.${randomUUID()}.tmp`
            try {
                await writeFile(temporaryBackupPath, previousContents, { flag: 'wx' })
                await rename(temporaryBackupPath, backupPath)
            } finally {
                await rm(temporaryBackupPath, { force: true })
            }
        }

        const temporaryPath = `${metadataPath}.${randomUUID()}.tmp`
        const metadata: ProjectMetadata = { formatVersion, ...project }
        try {
            await writeFile(temporaryPath, `${JSON.stringify(metadata, null, 2)}\n`, { flag: 'wx' })
            await rename(temporaryPath, metadataPath)
        } finally {
            await rm(temporaryPath, { force: true })
        }
    }

    private async renameDirectory(currentPath: string, nextPath: string): Promise<void> {
        if (projectNameKey(basename(currentPath)) === projectNameKey(basename(nextPath))) {
            const temporaryPath = `${currentPath}.rename-${randomUUID()}`
            await rename(currentPath, temporaryPath)
            try {
                await rename(temporaryPath, nextPath)
            } catch (error) {
                await rename(temporaryPath, currentPath)
                throw error
            }
            return
        }
        await rename(currentPath, nextPath)
    }

    private async hasValidBackup(directoryPath: string): Promise<boolean> {
        try {
            await stat(join(directoryPath, backupFileName))
            await this.readMetadata(join(directoryPath, backupFileName))
            return true
        } catch {
            return false
        }
    }
}

function normalizeProjectName(value: string): string {
    return validateFilesystemProjectName(value.trim().normalize('NFC'))
}

function validateFilesystemProjectName(name: string): string {
    if (!name) throw new ProjectRepositoryError('请填写项目名称。', 'invalid-name')
    if (
        name === '.' ||
        name === '..' ||
        name !== name.trim() ||
        invalidDirectoryCharacters.test(name) ||
        hasControlCharacters(name) ||
        /[. ]$/u.test(name)
    ) {
        throw new ProjectRepositoryError('项目名称不能包含路径分隔符或文件系统不允许的字符。', 'invalid-name')
    }
    if (reservedWindowsNames.test(name)) {
        throw new ProjectRepositoryError('项目名称不能使用 Windows 保留名称。', 'invalid-name')
    }
    if (name.length > 180 || (platform !== 'win32' && Buffer.byteLength(name, 'utf8') > 255)) {
        throw new ProjectRepositoryError('项目名称过长。', 'invalid-name')
    }
    return name
}

function normalizeDescription(value: string): string {
    return value.trim()
}

function normalizeProjectInput(input: ProjectInput): ProjectInput {
    return {
        name: normalizeProjectName(input.name),
        description: normalizeDescription(input.description)
    }
}

function normalizeCharacterInput(input: CharacterInput): CharacterInput {
    if (!input.name.trim()) throw new ProjectRepositoryError('请填写角色姓名。', 'invalid-name')
    if (input.name.trim().length > 180) throw new ProjectRepositoryError('角色姓名过长。', 'invalid-name')
    return {
        name: input.name.trim(),
        aliases: input.aliases.map((alias) => alias.trim()).filter(Boolean),
        tagIds: [...new Set(input.tagIds ?? [])],
        introduction: input.introduction.trim(),
        appearance: input.appearance.trim(),
        personality: input.personality.trim(),
        backstory: input.backstory.trim(),
        motivation: input.motivation.trim(),
        abilities: input.abilities.trim(),
        notes: input.notes.trim()
    }
}

function normalizeTagInput(input: TagInput): TagInput {
    const name = input.name.trim()
    if (!name) throw new ProjectRepositoryError('请填写标签名称。', 'invalid-name')
    if (name.length > 80 || hasControlCharacters(name)) {
        throw new ProjectRepositoryError('标签名称过长或包含不可用字符。', 'invalid-name')
    }
    return { name }
}

function projectNameKey(value: string): string {
    return value.normalize('NFC').toUpperCase().toLowerCase().normalize('NFC')
}

function characterNameKey(value: string): string {
    return value.normalize('NFC').toUpperCase().toLowerCase().normalize('NFC')
}

function tagNameKey(value: string): string {
    return value.normalize('NFC').toUpperCase().toLowerCase().normalize('NFC')
}

function hasControlCharacters(value: string): boolean {
    return Array.from(value).some((character) => {
        const codePoint = character.codePointAt(0)
        return codePoint !== undefined && (codePoint <= 0x1f || (codePoint >= 0x7f && codePoint <= 0x9f))
    })
}

function duplicateNameError(name: string): ProjectRepositoryError {
    return new ProjectRepositoryError(`项目名称“${name}”已存在，请换一个名称。`, 'duplicate-name')
}

function isHistoryEntry(value: unknown): value is ProjectHistoryEntry {
    return isRecord(value) && typeof value.at === 'string' && typeof value.summary === 'string'
}

function isFileExistsError(error: unknown): boolean {
    return isRecord(error) && error.code === 'EEXIST'
}

function isFileMissingError(error: unknown): boolean {
    return isRecord(error) && error.code === 'ENOENT'
}
