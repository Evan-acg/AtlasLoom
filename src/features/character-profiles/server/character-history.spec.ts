import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { ProjectRepository } from './project-repository'
import { projectJsonCodec } from './project-json-codec'

describe('Character history', () => {
    // Given a project with no characters
    // When the user creates a character
    // Then the character history records its creation
    it('records character creation in history', async () => {
        const dataDirectory = await mkdtemp(join(tmpdir(), 'atlasloom-character-history-'))

        try {
            const repository = new ProjectRepository(dataDirectory)
            const project = await repository.createProject({ name: '雾港编年', description: '' })
            const character = await repository.createCharacter(project.id, {
                name: '沈潮生',
                aliases: [],
                introduction: '',
                appearance: '',
                personality: '',
                backstory: '',
                motivation: '',
                abilities: '',
                notes: ''
            })

            expect(character).toMatchObject({ history: [{ summary: '创建角色', at: expect.any(String) }] })
            await expect(new ProjectRepository(dataDirectory).listCharacters(project.id)).resolves.toMatchObject({
                characters: [{ id: character.id, history: [{ summary: '创建角色' }] }]
            })
        } finally {
            await rm(dataDirectory, { recursive: true, force: true })
        }
    })

    // Given a character with saved history
    // When the user edits, deletes, and restores the character
    // Then each change is appended to the persisted history
    it('records character edits, deletion, and restoration in history', async () => {
        const dataDirectory = await mkdtemp(join(tmpdir(), 'atlasloom-character-history-'))

        try {
            const repository = new ProjectRepository(dataDirectory)
            const project = await repository.createProject({ name: '雾港编年', description: '' })
            const character = await repository.createCharacter(project.id, {
                name: '沈潮生',
                aliases: [],
                introduction: '',
                appearance: '',
                personality: '',
                backstory: '',
                motivation: '',
                abilities: '',
                notes: ''
            })

            await repository.updateCharacter(project.id, character.id, {
                name: character.name,
                aliases: character.aliases,
                introduction: '旧港口的领航员。',
                appearance: character.appearance,
                personality: character.personality,
                backstory: character.backstory,
                motivation: character.motivation,
                abilities: character.abilities,
                notes: character.notes
            })
            await repository.deleteCharacter(project.id, character.id)
            await repository.restoreCharacter(project.id, character.id)

            const result = await new ProjectRepository(dataDirectory).listCharacters(project.id)
            expect(result.characters[0]?.history.map((entry) => entry.summary)).toEqual([
                '恢复角色',
                '删除角色',
                '修改角色简介',
                '创建角色'
            ])
        } finally {
            await rm(dataDirectory, { recursive: true, force: true })
        }
    })

    it('backfills creation history when reading a legacy character record', () => {
        const createdAt = '2026-01-01T00:00:00.000Z'
        const character = projectJsonCodec.decodeCharacter(
            JSON.stringify({
                formatVersion: 1,
                id: 'character-1',
                projectId: 'project-1',
                name: '沈潮生',
                aliases: [],
                introduction: '',
                appearance: '',
                personality: '',
                backstory: '',
                motivation: '',
                abilities: '',
                notes: '',
                createdAt,
                updatedAt: createdAt
            }),
            'project-1'
        )

        expect(character.history).toEqual([{ at: createdAt, summary: '创建角色' }])
    })
})
