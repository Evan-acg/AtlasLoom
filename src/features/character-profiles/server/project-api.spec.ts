import { createServer as createHttpServer, type Server } from 'node:http'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createProjectApiMiddleware } from './project-api'

describe('project API', () => {
    let dataDirectory: string
    let server: Server
    let baseUrl: string

    beforeEach(async () => {
        dataDirectory = await mkdtemp(join(tmpdir(), 'atlasloom-project-api-'))
        const middleware = createProjectApiMiddleware(dataDirectory)
        server = createHttpServer((request, response) => {
            void middleware(request, response)
        })
        await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
        const address = server.address()
        if (!address || typeof address === 'string') throw new Error('Test API did not open a TCP listener.')
        baseUrl = `http://127.0.0.1:${address.port}`
    })

    afterEach(async () => {
        await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))
        await rm(dataDirectory, { recursive: true, force: true })
    })

    // Given an empty project data directory
    // When the user creates a project through the local API
    // Then the API returns it and writes its metadata to disk
    it('creates and lists a project through the local API', async () => {
        const response = await fetch(`${baseUrl}/projects`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ name: '雾港编年', description: '群岛城市' })
        })
        const created = (await response.json()) as { project: { id: string; name: string; description: string } }
        const metadata = JSON.parse(await readFile(join(dataDirectory, '雾港编年', 'metadata.json'), 'utf8')) as {
            id: string
        }
        const listing = await fetch(`${baseUrl}/projects`)

        expect(response.status).toBe(201)
        expect(created.project).toMatchObject({ name: '雾港编年', description: '群岛城市' })
        expect(metadata.id).toBe(created.project.id)
        await expect(listing.json()).resolves.toMatchObject({ projects: [created.project], issues: [] })
    })

    // Given a persisted project
    // When the user creates and edits a character through the local API
    // Then the complete profile is returned and remains available through the project boundary
    it('creates, lists, and updates a character through the local API', async () => {
        const projectResponse = await fetch(`${baseUrl}/projects`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ name: '雾港编年' })
        })
        const project = (await projectResponse.json()) as { project: { id: string } }
        const input = {
            name: '沈潮生',
            aliases: ['潮生'],
            introduction: '旧港口的领航员。',
            appearance: '深色外套。',
            personality: '谨慎。',
            backstory: '失去过船队。',
            motivation: '寻找妹妹。',
            abilities: '熟悉潮汐。',
            notes: '保留悬念。'
        }

        const createResponse = await fetch(`${baseUrl}/projects/${project.project.id}/characters`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(input)
        })
        const created = (await createResponse.json()) as { character: { id: string; name: string } }
        const listResponse = await fetch(`${baseUrl}/projects/${project.project.id}/characters`)
        const updateResponse = await fetch(
            `${baseUrl}/projects/${project.project.id}/characters/${created.character.id}`,
            {
                method: 'PATCH',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ ...input, name: '陆照夜' })
            }
        )

        expect(createResponse.status).toBe(201)
        expect(created.character).toMatchObject({ projectId: project.project.id, ...input })
        await expect(listResponse.json()).resolves.toMatchObject({ characters: [created.character] })
        await expect(updateResponse.json()).resolves.toMatchObject({
            character: { id: created.character.id, name: '陆照夜' }
        })
    })

    // Given a persisted project
    // When the user creates and renames a tag through the local API
    // Then character assignments remain addressable by the stable tag ID
    it('creates and renames project tags through the local API', async () => {
        const projectResponse = await fetch(`${baseUrl}/projects`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ name: '雾港编年' })
        })
        const project = (await projectResponse.json()) as { project: { id: string } }

        const createTagResponse = await fetch(`${baseUrl}/projects/${project.project.id}/tags`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ name: '航海' })
        })
        const createdTag = (await createTagResponse.json()) as { tag: { id: string; name: string } }
        const createCharacterResponse = await fetch(`${baseUrl}/projects/${project.project.id}/characters`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                name: '沈潮生',
                aliases: ['潮生'],
                tagIds: [createdTag.tag.id],
                introduction: '旧港口的领航员。',
                appearance: '',
                personality: '',
                backstory: '',
                motivation: '',
                abilities: '',
                notes: ''
            })
        })
        const renameTagResponse = await fetch(`${baseUrl}/projects/${project.project.id}/tags/${createdTag.tag.id}`, {
            method: 'PATCH',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ name: '港口' })
        })
        const tagListing = await fetch(`${baseUrl}/projects/${project.project.id}/tags`)
        const characterListing = await fetch(`${baseUrl}/projects/${project.project.id}/characters`)

        expect(createTagResponse.status).toBe(201)
        expect(createCharacterResponse.status).toBe(201)
        expect(renameTagResponse.status).toBe(200)
        await expect(tagListing.json()).resolves.toMatchObject({ tags: [{ id: createdTag.tag.id, name: '港口' }] })
        await expect(characterListing.json()).resolves.toMatchObject({
            characters: [{ name: '沈潮生', tagIds: [createdTag.tag.id] }]
        })
    })

    // Given a tag belongs to another project
    // When the user creates or updates a character with that tag ID
    // Then the API rejects the cross-project reference as a client error
    it('rejects cross-project character tag references', async () => {
        const firstProjectResponse = await fetch(`${baseUrl}/projects`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ name: '雾港编年' })
        })
        const firstProject = (await firstProjectResponse.json()) as { project: { id: string } }
        const secondProjectResponse = await fetch(`${baseUrl}/projects`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ name: '星垂边境' })
        })
        const secondProject = (await secondProjectResponse.json()) as { project: { id: string } }
        const tagResponse = await fetch(`${baseUrl}/projects/${secondProject.project.id}/tags`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ name: '异乡' })
        })
        const tag = (await tagResponse.json()) as { tag: { id: string } }
        const input = {
            name: '沈潮生',
            aliases: [],
            tagIds: [tag.tag.id],
            introduction: '',
            appearance: '',
            personality: '',
            backstory: '',
            motivation: '',
            abilities: '',
            notes: ''
        }

        const createResponse = await fetch(`${baseUrl}/projects/${firstProject.project.id}/characters`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(input)
        })
        const validCharacterResponse = await fetch(`${baseUrl}/projects/${firstProject.project.id}/characters`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ ...input, name: '陆照夜', tagIds: [] })
        })
        const validCharacter = (await validCharacterResponse.json()) as { character: { id: string } }
        const updateResponse = await fetch(
            `${baseUrl}/projects/${firstProject.project.id}/characters/${validCharacter.character.id}`,
            {
                method: 'PATCH',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify(input)
            }
        )

        expect(createResponse.status).toBe(400)
        await expect(createResponse.json()).resolves.toEqual({ error: '角色标签必须属于当前项目。' })
        expect(updateResponse.status).toBe(400)
        await expect(updateResponse.json()).resolves.toEqual({ error: '角色标签必须属于当前项目。' })
    })

    // Given a project has already been created
    // When the user submits another project with the same name
    // Then the API rejects it with a conflict and keeps the existing project
    it('reports duplicate project names as a conflict', async () => {
        await fetch(`${baseUrl}/projects`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ name: '雾港编年', description: '' })
        })
        const duplicate = await fetch(`${baseUrl}/projects`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ name: '雾港编年', description: '' })
        })

        expect(duplicate.status).toBe(409)
        await expect(duplicate.json()).resolves.toMatchObject({ error: expect.stringContaining('已存在') })
        const listing = await fetch(`${baseUrl}/projects`)
        await expect(listing.json()).resolves.toMatchObject({ projects: [{ name: '雾港编年' }] })
    })

    it('keeps validation failures in the documented JSON error response shape', async () => {
        const response = await fetch(`${baseUrl}/projects`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ name: '   ', description: '' })
        })

        expect(response.status).toBe(400)
        expect(response.headers.get('content-type')).toContain('application/json')
        await expect(response.json()).resolves.toEqual({ error: '请填写项目名称。' })
    })

    // Given a project with a character
    // When the user deletes and restores each record through the local API
    // Then normal and deleted listings reflect each independent state
    it('deletes and restores projects and characters through the local API', async () => {
        const projectResponse = await fetch(`${baseUrl}/projects`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ name: '雾港编年' })
        })
        const project = (await projectResponse.json()) as { project: { id: string } }
        const characterResponse = await fetch(`${baseUrl}/projects/${project.project.id}/characters`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
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
        })
        const character = (await characterResponse.json()) as { character: { id: string } }

        const deleteCharacterResponse = await fetch(
            `${baseUrl}/projects/${project.project.id}/characters/${character.character.id}`,
            { method: 'DELETE' }
        )
        const deletedCharacters = await fetch(`${baseUrl}/projects/${project.project.id}/characters`)

        expect(deleteCharacterResponse.status).toBe(200)
        await expect(deletedCharacters.json()).resolves.toMatchObject({
            characters: [],
            deletedCharacters: [{ id: character.character.id, name: '沈潮生' }]
        })

        const deleteProjectResponse = await fetch(`${baseUrl}/projects/${project.project.id}`, { method: 'DELETE' })
        const deletedProjects = await fetch(`${baseUrl}/projects`)

        expect(deleteProjectResponse.status).toBe(200)
        await expect(deletedProjects.json()).resolves.toMatchObject({
            projects: [],
            deletedProjects: [{ id: project.project.id, name: '雾港编年' }]
        })

        const restoreProjectResponse = await fetch(`${baseUrl}/projects/${project.project.id}/restore`, {
            method: 'POST'
        })
        const restoreCharacterResponse = await fetch(
            `${baseUrl}/projects/${project.project.id}/characters/${character.character.id}/restore`,
            { method: 'POST' }
        )
        const restoredCharacters = await fetch(`${baseUrl}/projects/${project.project.id}/characters`)

        expect(restoreProjectResponse.status).toBe(200)
        expect(restoreCharacterResponse.status).toBe(200)
        await expect(restoredCharacters.json()).resolves.toMatchObject({
            characters: [{ id: character.character.id, name: '沈潮生' }],
            deletedCharacters: []
        })
    })

    it('previews and applies a complete backup through the local API', async () => {
        const createResponse = await fetch(`${baseUrl}/projects`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ name: '雾港编年', description: '原始简介' })
        })
        const created = (await createResponse.json()) as { project: { id: string } }
        const backupResponse = await fetch(`${baseUrl}/backup`)
        const backup = (await backupResponse.json()) as { projects: Array<{ project: { id: string } }> }

        await fetch(`${baseUrl}/projects/${created.project.id}`, {
            method: 'PATCH',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ name: '雾港编年', description: '当前简介' })
        })
        const previewResponse = await fetch(`${baseUrl}/backup/preview`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ backup, mode: 'merge' })
        })
        const preview = (await previewResponse.json()) as { conflicts: Array<{ id: string }> }
        const applyResponse = await fetch(`${baseUrl}/backup/apply`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                backup,
                mode: 'merge',
                decisions: { [preview.conflicts[0]!.id]: { choice: 'use-backup' } }
            })
        })
        const projectsResponse = await fetch(`${baseUrl}/projects`)
        const archivesResponse = await fetch(`${baseUrl}/backup/archives`)
        const archives = (await archivesResponse.json()) as { archives: Array<{ id: string }> }
        const restoreArchiveResponse = await fetch(`${baseUrl}/backup/archives/${archives.archives[0]!.id}`, {
            method: 'POST'
        })
        const restoredProjectsResponse = await fetch(`${baseUrl}/projects`)

        expect(backupResponse.status).toBe(200)
        expect(backupResponse.headers.get('content-disposition')).toContain('atlasloom-backup.json')
        expect(previewResponse.status).toBe(200)
        expect(preview.conflicts).toHaveLength(1)
        expect(applyResponse.status).toBe(200)
        await expect(projectsResponse.json()).resolves.toMatchObject({ projects: [{ description: '原始简介' }] })
        expect(archivesResponse.status).toBe(200)
        expect(archives.archives).toHaveLength(1)
        expect(restoreArchiveResponse.status).toBe(200)
        await expect(restoredProjectsResponse.json()).resolves.toMatchObject({
            projects: [{ description: '当前简介' }]
        })
    })
})
