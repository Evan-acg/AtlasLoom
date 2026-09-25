import type { Character, CharacterInput, CharacterListResult } from '../types/character.ts'
import type { BackupArchive, BackupDecisions, BackupMode, BackupPreview, ProjectBackup } from '../types/backup.ts'
import type { Project, ProjectInput, ProjectListResult, ProjectRepairResolution } from '../types/project.ts'
import type { Tag, TagInput, TagListResult } from '../types/tag.ts'

export interface ProjectRepositoryProjectPort {
    listProjects(): Promise<ProjectListResult>
    createProject(input: ProjectInput): Promise<Project>
    updateProject(id: string, input: ProjectInput): Promise<Project>
    deleteProject(id: string): Promise<Project>
    restoreProject(id: string): Promise<Project>
    repairProject(directoryName: string, resolution: ProjectRepairResolution): Promise<void>
}

export interface ProjectRepositoryCharacterPort {
    listCharacters(projectId: string): Promise<CharacterListResult>
    createCharacter(projectId: string, input: CharacterInput): Promise<Character>
    updateCharacter(projectId: string, characterId: string, input: CharacterInput): Promise<Character>
    deleteCharacter(projectId: string, characterId: string): Promise<Character>
    restoreCharacter(projectId: string, characterId: string): Promise<Character>
}

export interface ProjectRepositoryTagPort {
    listTags(projectId: string): Promise<TagListResult>
    createTag(projectId: string, input: TagInput): Promise<Tag>
    renameTag(projectId: string, tagId: string, input: TagInput): Promise<Tag>
}

export interface ProjectRepositoryBackupPort {
    exportBackup(): Promise<ProjectBackup>
    listBackupArchives(): Promise<BackupArchive[]>
    restoreBackupArchive(id: string): Promise<void>
    previewImport(value: unknown, mode: BackupMode): Promise<BackupPreview>
    applyImport(value: unknown, mode: BackupMode, decisions: BackupDecisions): Promise<void>
}

export interface ProjectRepositoryPort
    extends
        ProjectRepositoryProjectPort,
        ProjectRepositoryCharacterPort,
        ProjectRepositoryTagPort,
        ProjectRepositoryBackupPort {}

export type ProjectRepositoryFactory = (dataDirectory: string) => ProjectRepositoryPort
