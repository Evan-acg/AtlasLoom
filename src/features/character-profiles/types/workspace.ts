import type { ComputedRef, Ref } from 'vue'
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

export interface ProjectJourneyState {
    projects: Ref<Project[]>
    deletedProjects: Ref<Project[]>
    storageIssues: Ref<ProjectListResult['issues']>
    selectedProject: ComputedRef<Project | null>
    loading: Ref<boolean>
    error: Ref<string>
    load: (projectId: string | null) => Promise<void>
    refresh: () => Promise<void>
    create: (input: ProjectInput) => Promise<Project>
    update: (id: string, input: ProjectInput) => Promise<Project>
    remove: (id: string) => Promise<Project>
    restore: (id: string) => Promise<Project>
    repair: (directoryName: string, resolution: ProjectRepairResolution) => Promise<void>
    clearError: () => void
}

export interface CharacterJourneyState {
    characters: Ref<Character[]>
    deletedCharacters: Ref<Character[]>
    charactersLoading: Ref<boolean>
    error: Ref<string>
    tags: Ref<Tag[]>
    tagError: Ref<string>
    create: (input: CharacterInput) => Promise<Character | undefined>
    update: (id: string, input: CharacterInput) => Promise<Character | undefined>
    remove: (id: string) => Promise<Character | undefined>
    restore: (id: string) => Promise<Character | undefined>
    createTag: (input: TagInput) => Promise<Tag | undefined>
    renameTag: (id: string, input: TagInput) => Promise<Tag | undefined>
}
