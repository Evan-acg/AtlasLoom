import { randomUUID } from 'node:crypto'
import type { Character, CharacterInput, CharacterListResult } from '../types/character.ts'
import { ProjectFileStorage, ProjectStorageError } from './project-file-storage.ts'
import { ProjectJsonCodecError } from './project-json-codec.ts'
import { ProjectRepositoryError } from './project-repository-error.ts'
import type { ProjectLookup } from './repository-context.ts'
import type { TagRepository } from './tag-repository.ts'

export class CharacterRepository {
    constructor(
        private readonly storage: ProjectFileStorage,
        private readonly projects: ProjectLookup,
        private readonly tags: TagRepository
    ) {}

    async listCharacters(projectId: string): Promise<CharacterListResult> {
        const located = await this.projects.findProject(projectId)
        const characters = await this.readCharacters(located.directoryName, located.project.id)
        return {
            characters: characters.filter((character) => !character.deletedAt),
            deletedCharacters: characters.filter((character) => character.deletedAt)
        }
    }

    async createCharacter(projectId: string, input: CharacterInput): Promise<Character> {
        const located = await this.projects.findProject(projectId)
        const normalized = normalizeCharacterInput(input)
        await this.tags.assertTagsBelongToProject(located.directoryName, located.project.id, normalized.tagIds ?? [])
        await this.assertNameAvailable(located.directoryName, located.project.id, normalized.name)
        const now = new Date().toISOString()
        const character: Character = {
            id: randomUUID(),
            projectId,
            ...normalized,
            tagIds: normalized.tagIds ?? [],
            createdAt: now,
            updatedAt: now,
            history: [{ at: now, summary: '创建角色' }]
        }
        await this.storage.writeCharacter(located.directoryName, character)
        return character
    }

    async updateCharacter(projectId: string, characterId: string, input: CharacterInput): Promise<Character> {
        const located = await this.projects.findProject(projectId)
        const characters = await this.readCharacters(located.directoryName, located.project.id)
        const current = characters.find((character) => character.id === characterId)
        if (!current) throw new ProjectRepositoryError('找不到该角色。', 'not-found')
        const normalized = normalizeCharacterInput(input)
        await this.tags.assertTagsBelongToProject(located.directoryName, located.project.id, normalized.tagIds ?? [])
        await this.assertNameAvailable(located.directoryName, located.project.id, normalized.name, characterId)
        if (JSON.stringify({ ...current, ...normalized }) === JSON.stringify(current)) return current
        const now = new Date().toISOString()
        const updated: Character = {
            ...current,
            ...normalized,
            updatedAt: now,
            history: [{ at: now, summary: characterChangeSummary(current, normalized) }, ...current.history]
        }
        await this.storage.writeCharacter(located.directoryName, updated)
        return updated
    }

    async deleteCharacter(projectId: string, characterId: string): Promise<Character> {
        const located = await this.projects.findProject(projectId)
        const characters = await this.readCharacters(located.directoryName, located.project.id)
        const current = characters.find((character) => character.id === characterId)
        if (!current) throw new ProjectRepositoryError('找不到该角色。', 'not-found')
        if (current.deletedAt) return current
        const now = new Date().toISOString()
        const deleted: Character = {
            ...current,
            deletedAt: now,
            updatedAt: now,
            history: [{ at: now, summary: '删除角色' }, ...current.history]
        }
        await this.storage.writeCharacter(located.directoryName, deleted)
        return deleted
    }

    async restoreCharacter(projectId: string, characterId: string): Promise<Character> {
        const located = await this.projects.findProject(projectId)
        const characters = await this.readCharacters(located.directoryName, located.project.id)
        const current = characters.find((character) => character.id === characterId)
        if (!current) throw new ProjectRepositoryError('找不到该角色。', 'not-found')
        if (!current.deletedAt) return current
        const now = new Date().toISOString()
        const restored: Character = {
            ...current,
            updatedAt: now,
            history: [{ at: now, summary: '恢复角色' }, ...current.history]
        }
        delete restored.deletedAt
        await this.storage.writeCharacter(located.directoryName, restored)
        return restored
    }

    private async readCharacters(directoryName: string, projectId: string): Promise<Character[]> {
        try {
            return await this.storage.readCharacters(directoryName, projectId)
        } catch (error) {
            if (error instanceof ProjectJsonCodecError) {
                if (error.code === 'invalid-json') {
                    throw new ProjectRepositoryError('角色档案无法解析为有效 JSON。', 'invalid-data')
                }
                throw new ProjectRepositoryError('角色档案缺少必需字段或字段格式错误。', 'invalid-data')
            }
            if (error instanceof ProjectStorageError && error.code === 'invalid-record') {
                throw new ProjectRepositoryError('角色档案无法解析为有效 JSON。', 'invalid-data')
            }
            throw error
        }
    }

    private async assertNameAvailable(
        directoryName: string,
        projectId: string,
        name: string,
        excludingId?: string
    ): Promise<void> {
        const duplicate = (await this.readCharacters(directoryName, projectId)).find(
            (character) => character.id !== excludingId && characterNameKey(character.name) === characterNameKey(name)
        )
        if (duplicate) throw new ProjectRepositoryError(`角色姓名“${name}”已存在，请换一个姓名。`, 'duplicate-name')
    }
}

function normalizeCharacterInput(input: CharacterInput): CharacterInput {
    if (!input.name.trim()) throw new ProjectRepositoryError('请填写角色姓名。', 'invalid-name')
    if (input.name.trim().length > 180) throw new ProjectRepositoryError('角色姓名过长。', 'invalid-name')
    return {
        name: input.name.trim(),
        aliases: input.aliases.map((alias) => alias.trim()).filter(Boolean),
        tagIds: [...new Set(input.tagIds ?? [])],
        introduction: input.introduction.trim(),
        appearance: input.appearance.trim(),
        personality: input.personality.trim(),
        backstory: input.backstory.trim(),
        motivation: input.motivation.trim(),
        abilities: input.abilities.trim(),
        notes: input.notes.trim()
    }
}

function characterNameKey(value: string): string {
    return value.normalize('NFC').toUpperCase().toLowerCase().normalize('NFC')
}

function characterChangeSummary(current: Character, next: CharacterInput): string {
    const changes: string[] = []
    if (current.name !== next.name) changes.push('修改角色姓名')
    if (JSON.stringify(current.aliases) !== JSON.stringify(next.aliases)) changes.push('修改角色别名')
    if (current.introduction !== next.introduction) changes.push('修改角色简介')
    if (current.appearance !== next.appearance) changes.push('修改角色外貌')
    if (current.personality !== next.personality) changes.push('修改角色性格')
    if (current.backstory !== next.backstory) changes.push('修改角色背景故事')
    if (current.motivation !== next.motivation) changes.push('修改角色动机')
    if (current.abilities !== next.abilities) changes.push('修改角色能力')
    if (current.notes !== next.notes) changes.push('修改角色备注')
    if (JSON.stringify(current.tagIds) !== JSON.stringify(next.tagIds ?? [])) changes.push('修改角色标签')
    return changes.join('、')
}
