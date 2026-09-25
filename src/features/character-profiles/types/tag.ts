export interface Tag {
    id: string
    projectId: string
    name: string
    createdAt: string
    updatedAt: string
}

export interface TagInput {
    name: string
}

export interface TagListResult {
    tags: Tag[]
}
