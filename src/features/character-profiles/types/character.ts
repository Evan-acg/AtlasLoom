import type { HistoryEntry } from './history'

export type CharacterHistoryEntry = HistoryEntry

export type CharacterStorageIssueReason = 'invalid-json' | 'unsupported-version' | 'invalid-fields' | 'unreadable'

export interface CharacterStorageIssue {
    fileName: string
    reason: CharacterStorageIssueReason
}

export interface Character {
    id: string
    projectId: string
    name: string
    aliases: string[]
    tagIds: string[]
    introduction: string
    appearance: string
    personality: string
    backstory: string
    motivation: string
    abilities: string
    notes: string
    createdAt: string
    updatedAt: string
    deletedAt?: string
    history: CharacterHistoryEntry[]
}

export type CharacterInput = Omit<Character, 'id' | 'projectId' | 'createdAt' | 'updatedAt' | 'tagIds' | 'history'> & {
    tagIds?: string[]
}

export interface CharacterListResult {
    characters: Character[]
    deletedCharacters: Character[]
    issues?: CharacterStorageIssue[]
}
