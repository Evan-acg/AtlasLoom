import { mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { Project } from '../types/project'
import { ProjectFileStorage } from './project-file-storage'

describe('ProjectFileStorage', () => {
    let dataDirectory: string

    beforeEach(async () => {
        dataDirectory = await mkdtemp(join(tmpdir(), 'atlasloom-storage-'))
    })

    afterEach(async () => {
        await rm(dataDirectory, { recursive: true, force: true })
    })

    it('keeps a validated previous metadata version in the existing backup layout', async () => {
        const storage = new ProjectFileStorage(dataDirectory)
        const project: Project = {
            id: 'project-1',
            name: '雾港编年',
            description: '旧简介',
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
            history: [{ at: '2026-01-01T00:00:00.000Z', summary: '创建项目' }]
        }
        const updated = { ...project, description: '新简介' }

        await storage.createProjectDirectory(project.name)
        await storage.writeProject(project.name, project, false)
        await storage.writeProject(project.name, updated, true)

        await writeFile(join(dataDirectory, project.name, 'metadata.json'), '{damaged')
        expect(await storage.hasValidProjectBackup(project.name)).toBe(true)
        await expect(storage.readProjectBackup(project.name)).resolves.toEqual(project)
        await expect(readFile(join(dataDirectory, project.name, 'metadata.json'), 'utf8')).resolves.toBe('{damaged')
    })

    it('restores the previous dataset after an interrupted directory replacement', async () => {
        const storage = new ProjectFileStorage(dataDirectory)
        const project: Project = {
            id: 'project-1',
            name: '雾港编年',
            description: '',
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
            history: [{ at: '2026-01-01T00:00:00.000Z', summary: '创建项目' }]
        }
        await storage.createProjectDirectory(project.name)
        await storage.writeProject(project.name, project, false)
        await rename(dataDirectory, `${dataDirectory}.backup-interrupted`)

        await expect(new ProjectFileStorage(dataDirectory).listProjectDirectories()).resolves.toEqual(['雾港编年'])
    })
})
