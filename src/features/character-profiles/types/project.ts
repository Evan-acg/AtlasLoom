import type { HistoryEntry } from './history'

export type ProjectHistoryEntry = HistoryEntry

export interface Project {
    id: string
    name: string
    description: string
    createdAt: string
    updatedAt: string
    deletedAt?: string
    history: ProjectHistoryEntry[]
}

export interface ProjectInput {
    name: string
    description: string
}

export interface ProjectStorageIssue {
    directoryName: string
    message: string
    projectId?: string
    metadataName?: string
    backupAvailable: boolean
}

export interface ProjectListResult {
    projects: Project[]
    deletedProjects: Project[]
    issues: ProjectStorageIssue[]
}

export type ProjectRepairResolution = 'directory-name' | 'metadata-name' | 'restore-backup'
