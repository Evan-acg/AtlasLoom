import { randomUUID } from 'node:crypto'
import { platform } from 'node:process'
import { Buffer } from 'node:buffer'
import type {
    Project,
    ProjectInput,
    ProjectListResult,
    ProjectRepairResolution,
    ProjectStorageIssue
} from '../types/project.ts'
import { ProjectFileStorage, ProjectStorageError } from './project-file-storage.ts'
import { ProjectJsonCodecError } from './project-json-codec.ts'
import { ProjectRepositoryError } from './project-repository-error.ts'
import type { LocatedProject, ProjectLookup } from './repository-context.ts'

const invalidDirectoryCharacters = /[<>:"/\\|?*]/u
const reservedWindowsNames = /^(con|prn|aux|nul|com[1-9¹²³]|lpt[1-9¹²³])(?:\..*)?$/iu

export class ProjectDataRepository implements ProjectLookup {
    constructor(private readonly storage: ProjectFileStorage) {}

    async listProjects(): Promise<ProjectListResult> {
        const projects: Project[] = []
        const deletedProjects: Project[] = []
        const issues: ProjectStorageIssue[] = []

        for (const directoryName of await this.storage.listProjectDirectories()) {
            try {
                const project = await this.storage.readProject(directoryName)
                if (project.name !== directoryName) {
                    issues.push({
                        directoryName,
                        metadataName: project.name,
                        projectId: project.id,
                        message: `目录名“${directoryName}”与项目名“${project.name}”不一致；项目当前只读。`,
                        backupAvailable: await this.storage.hasValidProjectBackup(directoryName)
                    })
                    continue
                }
                if (project.deletedAt) deletedProjects.push(project)
                else projects.push(project)
            } catch (error) {
                issues.push({
                    directoryName,
                    message: projectReadErrorMessage(error),
                    backupAvailable: await this.storage.hasValidProjectBackup(directoryName)
                })
            }
        }

        return { projects, deletedProjects, issues }
    }

    async findProject(id: string): Promise<LocatedProject> {
        const { projects, deletedProjects, issues } = await this.listProjects()
        const project = [...projects, ...deletedProjects].find((item) => item.id === id)
        if (project) return { project, directoryName: project.name }
        if (issues.some((issue) => issue.projectId === id)) {
            throw new ProjectRepositoryError('该项目的目录与元数据不一致，当前只读。', 'read-only')
        }
        throw new ProjectRepositoryError('找不到该项目。', 'not-found')
    }

    async createProject(input: ProjectInput): Promise<Project> {
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

        try {
            await this.storage.createProjectDirectory(name)
        } catch (error) {
            if (isStorageExistsError(error)) throw duplicateNameError(name)
            throw error
        }
        try {
            await this.storage.writeProject(name, project, false)
        } catch (error) {
            await this.storage.removeProjectDirectory(name)
            throw error
        }
        return project
    }

    async updateProject(id: string, input: ProjectInput): Promise<Project> {
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
        await this.storage.writeProject(located.directoryName, updated, true)
        try {
            if (located.directoryName !== name) await this.storage.renameProjectDirectory(located.directoryName, name)
        } catch (error) {
            try {
                await this.storage.writeProject(located.directoryName, located.project, true)
            } catch {
                throw new ProjectRepositoryError(
                    `项目改名未能完成，且无法自动恢复；目录“${located.directoryName}”中的元数据需要人工检查。`,
                    'read-only'
                )
            }
            throw error
        }
        return updated
    }

    async deleteProject(id: string): Promise<Project> {
        const located = await this.findProject(id)
        if (located.project.deletedAt) return located.project
        const now = new Date().toISOString()
        const deleted: Project = {
            ...located.project,
            deletedAt: now,
            updatedAt: now,
            history: [{ at: now, summary: '删除项目' }, ...located.project.history]
        }
        await this.storage.writeProject(located.directoryName, deleted, true)
        return deleted
    }

    async restoreProject(id: string): Promise<Project> {
        const located = await this.findProject(id)
        if (!located.project.deletedAt) return located.project
        const now = new Date().toISOString()
        const restored: Project = {
            ...located.project,
            updatedAt: now,
            history: [{ at: now, summary: '恢复项目' }, ...located.project.history]
        }
        delete restored.deletedAt
        await this.storage.writeProject(located.directoryName, restored, true)
        return restored
    }

    async repairProject(directoryName: string, resolution: ProjectRepairResolution): Promise<void> {
        const { issues } = await this.listProjects()
        const issue = issues.find((item) => item.directoryName === directoryName)
        if (!issue) throw new ProjectRepositoryError('找不到需要修复的项目目录。', 'not-found')

        if (resolution === 'restore-backup') {
            if (issue.projectId || !issue.backupAvailable) {
                throw new ProjectRepositoryError('该项目没有可直接恢复的有效备份。', 'invalid-data')
            }
            await this.storage.writeProject(directoryName, await this.storage.readProjectBackup(directoryName), false)
            return
        }

        if (!issue.projectId || !issue.metadataName) {
            throw new ProjectRepositoryError('请先恢复项目的有效元数据。', 'invalid-data')
        }
        const project = await this.storage.readProject(directoryName)
        if (resolution === 'metadata-name') {
            const targetName = validateFilesystemProjectName(project.name)
            await this.assertNameAvailable(targetName, project.id)
            try {
                await this.storage.renameProjectDirectory(directoryName, targetName)
            } catch (error) {
                if (isStorageExistsError(error)) throw duplicateNameError(targetName)
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
        await this.storage.writeProject(directoryName, repaired, true)
    }

    private async assertNameAvailable(name: string, excludingId?: string): Promise<void> {
        const { projects, deletedProjects, issues } = await this.listProjects()
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
}

function normalizeProjectInput(input: ProjectInput): ProjectInput {
    return {
        name: normalizeProjectName(input.name),
        description: input.description.trim()
    }
}

function normalizeProjectName(value: string): string {
    return validateFilesystemProjectName(value.trim().normalize('NFC'))
}

export function validateFilesystemProjectName(name: string): string {
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
    if (reservedWindowsNames.test(name))
        throw new ProjectRepositoryError('项目名称不能使用 Windows 保留名称。', 'invalid-name')
    if (name.length > 180 || (platform !== 'win32' && Buffer.byteLength(name, 'utf8') > 255)) {
        throw new ProjectRepositoryError('项目名称过长。', 'invalid-name')
    }
    return name
}

export function projectNameKey(value: string): string {
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

function projectReadErrorMessage(error: unknown): string {
    if (error instanceof ProjectStorageError && error.code === 'missing') return '项目 metadata.json 不存在。'
    if (error instanceof ProjectJsonCodecError) {
        if (error.code === 'invalid-json') return '项目 metadata.json 无法解析为有效 JSON。'
        if (error.code === 'unsupported-version') return '项目数据格式版本不受支持。'
    }
    return '项目 metadata.json 缺少必需字段或字段格式错误。'
}

function isStorageExistsError(error: unknown): boolean {
    return error instanceof ProjectStorageError && error.code === 'exists'
}
