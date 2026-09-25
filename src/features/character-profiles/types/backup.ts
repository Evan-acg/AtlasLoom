import type { Character } from './character'
import type { Project } from './project'
import type { Tag } from './tag'

export const backupFormatVersion = 1

export type BackupMode = 'merge' | 'replace'
export type BackupEntity = 'project' | 'character' | 'tag'
export type BackupConflictKind = 'same-id' | 'name' | 'ownership'
export type BackupConflictChoice = 'keep-current' | 'use-backup' | 'skip' | 'rename' | 'import-new-id'

export interface ProjectBackupBundle {
    project: Project
    characters: Character[]
    tags: Tag[]
}

export interface ProjectBackup {
    backupFormatVersion: typeof backupFormatVersion
    projects: ProjectBackupBundle[]
}

export interface BackupArchive {
    id: string
    createdAt: string
}

export interface BackupConflict {
    id: string
    entity: BackupEntity
    kind: BackupConflictKind
    message: string
    backupName: string
    currentName?: string
}

export interface BackupPreview {
    mode: BackupMode
    current: { projects: number; characters: number; tags: number }
    incoming: { projects: number; characters: number; tags: number }
    additions: { projects: number; characters: number; tags: number }
    removals: { projects: number; characters: number; tags: number }
    addedRecords: string[]
    removedRecords: string[]
    currentDataIssues: string[]
    conflicts: BackupConflict[]
    blockingIssues: string[]
}

export interface BackupDecision {
    choice: BackupConflictChoice
    name?: string
}

export type BackupDecisions = Record<string, BackupDecision>
