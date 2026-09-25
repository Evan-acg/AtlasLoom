export interface Character {
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
    createdAt: string
    updatedAt: string
}

export type CharacterInput = Omit<Character, 'id' | 'projectId' | 'createdAt' | 'updatedAt'>

export interface CharacterListResult {
    characters: Character[]
}
