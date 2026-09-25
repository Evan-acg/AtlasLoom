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
})
