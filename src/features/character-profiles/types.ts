export interface WorkspaceProject {
    id: string
    name: string
    description: string
}

export interface WorkspaceCharacter {
    id: string
    projectId: string
    name: string
    aliases: string[]
    introduction: string
    appearance: string
    personality: string
    backstory: string
    motivation: string
    abilities: string
    notes: string
    tags: string[]
}

export interface WorkspaceVariantProps {
    projects: WorkspaceProject[]
    selectedProjectId: string
    currentProject: WorkspaceProject
    characters: WorkspaceCharacter[]
    filteredCharacters: WorkspaceCharacter[]
    selectedCharacter: WorkspaceCharacter | null
    searchQuery: string
    selectedTags: string[]
    allTags: string[]
}
