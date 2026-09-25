import type { Character, CharacterInput, CharacterListResult } from '../types/character.ts'
import type { BackupArchive, BackupDecisions, BackupMode, BackupPreview, ProjectBackup } from '../types/backup.ts'
import type { Project, ProjectInput, ProjectListResult, ProjectRepairResolution } from '../types/project.ts'
import type { Tag, TagInput, TagListResult } from '../types/tag.ts'
import { CharacterRepository } from './character-repository.ts'
import { ProjectBackupRepository } from './project-backup-repository.ts'
import { ProjectFileStorage } from './project-file-storage.ts'
import { ProjectDataRepository } from './project-data-repository.ts'
import { projectJsonCodec, type ProjectJsonCodec } from './project-json-codec.ts'
import type { ProjectFileSystem } from './project-file-system.ts'
import { TagRepository } from './tag-repository.ts'
import type { ProjectRepositoryPort } from './project-repository-port.ts'

export { ProjectRepositoryError } from './project-repository-error.ts'

export class ProjectRepository implements ProjectRepositoryPort {
    private readonly projects: ProjectDataRepository
    private readonly characters: CharacterRepository
    private readonly tags: TagRepository
    private readonly backups: ProjectBackupRepository
    private operationQueue: Promise<void> = Promise.resolve()

    constructor(dataDirectory: string, fileSystem?: ProjectFileSystem, jsonCodec: ProjectJsonCodec = projectJsonCodec) {
        const storage = new ProjectFileStorage(dataDirectory, fileSystem, jsonCodec)
        this.projects = new ProjectDataRepository(storage)
        this.tags = new TagRepository(storage, this.projects)
        this.characters = new CharacterRepository(storage, this.projects, this.tags)
        this.backups = new ProjectBackupRepository(storage)
    }

    listProjects(): Promise<ProjectListResult> {
        return this.enqueueOperation(() => this.projects.listProjects())
    }

    createProject(input: ProjectInput): Promise<Project> {
        return this.enqueueOperation(() => this.projects.createProject(input))
    }

    updateProject(id: string, input: ProjectInput): Promise<Project> {
        return this.enqueueOperation(() => this.projects.updateProject(id, input))
    }

    deleteProject(id: string): Promise<Project> {
        return this.enqueueOperation(() => this.projects.deleteProject(id))
    }

    restoreProject(id: string): Promise<Project> {
        return this.enqueueOperation(() => this.projects.restoreProject(id))
    }

    repairProject(directoryName: string, resolution: ProjectRepairResolution): Promise<void> {
        return this.enqueueOperation(() => this.projects.repairProject(directoryName, resolution))
    }

    listCharacters(projectId: string): Promise<CharacterListResult> {
        return this.enqueueOperation(() => this.characters.listCharacters(projectId))
    }

    createCharacter(projectId: string, input: CharacterInput): Promise<Character> {
        return this.enqueueOperation(() => this.characters.createCharacter(projectId, input))
    }

    updateCharacter(projectId: string, characterId: string, input: CharacterInput): Promise<Character> {
        return this.enqueueOperation(() => this.characters.updateCharacter(projectId, characterId, input))
    }

    deleteCharacter(projectId: string, characterId: string): Promise<Character> {
        return this.enqueueOperation(() => this.characters.deleteCharacter(projectId, characterId))
    }

    restoreCharacter(projectId: string, characterId: string): Promise<Character> {
        return this.enqueueOperation(() => this.characters.restoreCharacter(projectId, characterId))
    }

    listTags(projectId: string): Promise<TagListResult> {
        return this.enqueueOperation(() => this.tags.listTags(projectId))
    }

    createTag(projectId: string, input: TagInput): Promise<Tag> {
        return this.enqueueOperation(() => this.tags.createTag(projectId, input))
    }

    renameTag(projectId: string, tagId: string, input: TagInput): Promise<Tag> {
        return this.enqueueOperation(() => this.tags.renameTag(projectId, tagId, input))
    }

    exportBackup(): Promise<ProjectBackup> {
        return this.enqueueOperation(() => this.backups.exportBackup())
    }

    listBackupArchives(): Promise<BackupArchive[]> {
        return this.enqueueOperation(() => this.backups.listBackupArchives())
    }

    restoreBackupArchive(id: string): Promise<void> {
        return this.enqueueOperation(() => this.backups.restoreBackupArchive(id))
    }

    previewImport(value: unknown, mode: BackupMode): Promise<BackupPreview> {
        return this.enqueueOperation(() => this.backups.previewImport(value, mode))
    }

    applyImport(value: unknown, mode: BackupMode, decisions: BackupDecisions): Promise<void> {
        return this.enqueueOperation(() => this.backups.applyImport(value, mode, decisions))
    }

    private enqueueOperation<T>(operation: () => Promise<T>): Promise<T> {
        const result = this.operationQueue.then(operation, operation)
        this.operationQueue = result.then(
            () => undefined,
            () => undefined
        )
        return result
    }
}
