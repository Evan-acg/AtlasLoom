import type { Character, CharacterInput, CharacterListResult } from './character'
import type { Project, ProjectInput, ProjectListResult, ProjectRepairResolution } from './project'
import type { Tag, TagInput, TagListResult } from './tag'

export interface ProjectWorkspaceProjectAdapter {
    list: () => Promise<ProjectListResult>
    create: (input: ProjectInput) => Promise<Project>
    update: (id: string, input: ProjectInput) => Promise<Project>
    remove: (id: string) => Promise<Project>
    restore: (id: string) => Promise<Project>
    repair: (directoryName: string, resolution: ProjectRepairResolution) => Promise<void>
}

export interface ProjectWorkspaceCharacterAdapter {
    list: (projectId: string) => Promise<CharacterListResult>
    create: (projectId: string, input: CharacterInput) => Promise<Character>
    update: (projectId: string, characterId: string, input: CharacterInput) => Promise<Character>
    remove: (projectId: string, characterId: string) => Promise<Character>
    restore: (projectId: string, characterId: string) => Promise<Character>
}

export interface ProjectWorkspaceTagAdapter {
    list: (projectId: string) => Promise<TagListResult>
    create: (projectId: string, input: TagInput) => Promise<Tag>
    rename: (projectId: string, tagId: string, input: TagInput) => Promise<Tag>
}

export interface ProjectWorkspaceAdapters {
    projects: ProjectWorkspaceProjectAdapter
    characters: ProjectWorkspaceCharacterAdapter
    tags: ProjectWorkspaceTagAdapter
}
