import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ProjectBackupRepository } from './project-backup-repository'
import { ProjectFileStorage } from './project-file-storage'
import { ProjectRepository } from './project-repository'

describe('ProjectBackupRepository', () => {
    let dataDirectory: string

    beforeEach(async () => {
        dataDirectory = await mkdtemp(join(tmpdir(), 'atlasloom-backup-'))
    })

    afterEach(async () => {
        await rm(dataDirectory, { recursive: true, force: true })
    })

    it('exports every project record, including deleted state and history', async () => {
        const repository = new ProjectRepository(dataDirectory)
        const project = await repository.createProject({ name: '雾港编年', description: '旧简介' })
        await repository.updateProject(project.id, { name: '雾港新编', description: '新简介' })
        await repository.deleteProject(project.id)

        const backup = await new ProjectBackupRepository(new ProjectFileStorage(dataDirectory)).exportBackup()

        expect(backup.backupFormatVersion).toBe(1)
        expect(backup.projects).toHaveLength(1)
        expect(backup.projects[0]?.project).toMatchObject({ formatVersion: 1 })
        expect(backup.projects[0]?.project).toMatchObject({
            id: project.id,
            name: '雾港新编',
            description: '新简介',
            deletedAt: expect.any(String)
        })
        expect(backup.projects[0]?.project.history.map((entry) => entry.summary)).toEqual([
            '删除项目',
            '修改项目名称、修改项目简介',
            '创建项目'
        ])
    })

    it('rejects an invalid backup before changing the current dataset', async () => {
        const repository = new ProjectRepository(dataDirectory)
        await repository.createProject({ name: '现有项目', description: '' })
        const backups = new ProjectBackupRepository(new ProjectFileStorage(dataDirectory))

        await expect(backups.applyImport({ backupFormatVersion: 99 }, 'replace', {})).rejects.toThrow(
            '备份格式版本不受支持'
        )
        await expect(repository.listProjects()).resolves.toMatchObject({
            projects: [{ name: '现有项目' }],
            deletedProjects: []
        })
    })

    // Given a valid backup and no existing data directory
    // When the user replaces the local dataset with that backup
    // Then the data directory is initialized and the backup becomes available
    it('initializes a missing data directory during replace import', async () => {
        const repository = new ProjectRepository(dataDirectory)
        const project = await repository.createProject({ name: '首次导入项目', description: '' })
        const backup = await new ProjectBackupRepository(new ProjectFileStorage(dataDirectory)).exportBackup()
        await rm(dataDirectory, { recursive: true, force: true })

        await new ProjectBackupRepository(new ProjectFileStorage(dataDirectory)).applyImport(backup, 'replace', {})

        await expect(new ProjectRepository(dataDirectory).listProjects()).resolves.toMatchObject({
            projects: [expect.objectContaining({ id: project.id, name: '首次导入项目' })],
            deletedProjects: []
        })
    })

    it('round-trips projects, characters, tags, deletion state, and history', async () => {
        const repository = new ProjectRepository(dataDirectory)
        const project = await repository.createProject({ name: '雾港编年', description: '' })
        const tag = await repository.createTag(project.id, { name: '主角' })
        const character = await repository.createCharacter(project.id, {
            name: '沈潮生',
            aliases: ['潮生'],
            tagIds: [tag.id],
            introduction: '旧港领航员。',
            appearance: '',
            personality: '',
            backstory: '',
            motivation: '',
            abilities: '',
            notes: ''
        })
        await repository.deleteCharacter(project.id, character.id)
        await repository.deleteProject(project.id)
        const backup = await new ProjectBackupRepository(new ProjectFileStorage(dataDirectory)).exportBackup()

        await repository.restoreProject(project.id)
        await repository.restoreCharacter(project.id, character.id)
        await new ProjectBackupRepository(new ProjectFileStorage(dataDirectory)).applyImport(backup, 'replace', {})

        await expect(repository.listProjects()).resolves.toMatchObject({
            projects: [],
            deletedProjects: [
                expect.objectContaining({
                    id: project.id,
                    history: expect.arrayContaining([expect.objectContaining({ summary: '删除项目' })])
                })
            ]
        })
        await expect(repository.listCharacters(project.id)).resolves.toMatchObject({
            characters: [],
            deletedCharacters: [
                expect.objectContaining({
                    id: character.id,
                    tagIds: [tag.id],
                    history: expect.arrayContaining([expect.objectContaining({ summary: '删除角色' })])
                })
            ]
        })
        await expect(repository.listTags(project.id)).resolves.toMatchObject({ tags: [{ id: tag.id, name: '主角' }] })
    })

    it('requires an explicit decision for a merge conflict', async () => {
        const repository = new ProjectRepository(dataDirectory)
        const project = await repository.createProject({ name: '当前项目', description: '' })
        const backup = await new ProjectBackupRepository(new ProjectFileStorage(dataDirectory)).exportBackup()
        await repository.updateProject(project.id, { name: '当前项目', description: '当前资料' })

        const backups = new ProjectBackupRepository(new ProjectFileStorage(dataDirectory))
        const preview = await backups.previewImport(backup, 'merge')

        expect(preview.conflicts).toHaveLength(1)
        await expect(backups.applyImport(backup, 'merge', {})).rejects.toThrow('请先处理冲突')
        await backups.applyImport(backup, 'merge', {
            [preview.conflicts[0]!.id]: { choice: 'use-backup' }
        })
        await expect(repository.listProjects()).resolves.toMatchObject({ projects: [{ description: '' }] })
    })

    it('rejects unsafe record IDs before writing imported files', async () => {
        const repository = new ProjectRepository(dataDirectory)
        const project = await repository.createProject({ name: '当前项目', description: '' })
        await repository.createCharacter(project.id, {
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
        const backup = await new ProjectBackupRepository(new ProjectFileStorage(dataDirectory)).exportBackup()
        backup.projects[0]!.characters[0]!.id = '../escape'

        await expect(
            new ProjectBackupRepository(new ProjectFileStorage(dataDirectory)).applyImport(backup, 'replace', {})
        ).rejects.toThrow('无效或重复的角色 ID')
        await expect(repository.listProjects()).resolves.toMatchObject({ projects: [{ name: '当前项目' }] })
    })

    it('rejects a merge that would leave an imported character without its tag', async () => {
        const repository = new ProjectRepository(dataDirectory)
        const project = await repository.createProject({ name: '当前项目', description: '' })
        const tag = await repository.createTag(project.id, { name: '主角' })
        await repository.createCharacter(project.id, {
            name: '沈潮生',
            aliases: [],
            tagIds: [tag.id],
            introduction: '',
            appearance: '',
            personality: '',
            backstory: '',
            motivation: '',
            abilities: '',
            notes: ''
        })
        const backup = await new ProjectBackupRepository(new ProjectFileStorage(dataDirectory)).exportBackup()
        const importedTag = backup.projects[0]!.tags[0]!
        importedTag.id = 'tag-from-backup'
        backup.projects[0]!.characters[0]!.tagIds = [importedTag.id]

        const backups = new ProjectBackupRepository(new ProjectFileStorage(dataDirectory))
        const preview = await backups.previewImport(backup, 'merge')
        const tagConflict = preview.conflicts.find((conflict) => conflict.entity === 'tag')
        const characterConflict = preview.conflicts.find((conflict) => conflict.entity === 'character')
        expect(tagConflict).toBeDefined()
        expect(characterConflict).toBeDefined()
        await expect(
            backups.applyImport(backup, 'merge', {
                [tagConflict!.id]: { choice: 'skip' },
                [characterConflict!.id]: { choice: 'use-backup' }
            })
        ).rejects.toThrow('引用了不存在的标签')
    })

    it('resolves a cross-project character ID and name conflict independently', async () => {
        const repository = new ProjectRepository(dataDirectory)
        const sourceProject = await repository.createProject({ name: '来源项目', description: '' })
        const targetProject = await repository.createProject({ name: '目标项目', description: '' })
        const sourceCharacter = await repository.createCharacter(sourceProject.id, {
            name: '来源角色',
            aliases: [],
            introduction: '',
            appearance: '',
            personality: '',
            backstory: '',
            motivation: '',
            abilities: '',
            notes: ''
        })
        await repository.createCharacter(targetProject.id, {
            name: '重复角色',
            aliases: [],
            introduction: '',
            appearance: '',
            personality: '',
            backstory: '',
            motivation: '',
            abilities: '',
            notes: ''
        })
        const backup = await new ProjectBackupRepository(new ProjectFileStorage(dataDirectory)).exportBackup()
        const sourceBundle = backup.projects.find((bundle) => bundle.project.id === sourceProject.id)!
        const targetBundle = backup.projects.find((bundle) => bundle.project.id === targetProject.id)!
        const movedCharacter = sourceBundle.characters.splice(
            sourceBundle.characters.findIndex((character) => character.id === sourceCharacter.id),
            1
        )[0]!
        targetBundle.characters.splice(
            targetBundle.characters.findIndex((character) => character.name === '重复角色'),
            1
        )
        targetBundle.characters.push({ ...movedCharacter, projectId: targetProject.id, name: '重复角色' })

        const backups = new ProjectBackupRepository(new ProjectFileStorage(dataDirectory))
        const preview = await backups.previewImport(backup, 'merge')
        const conflicts = preview.conflicts.filter((conflict) => conflict.entity === 'character')
        expect(conflicts.map((conflict) => conflict.kind)).toEqual(expect.arrayContaining(['ownership', 'name']))
        await backups.applyImport(backup, 'merge', {
            [conflicts.find((conflict) => conflict.kind === 'ownership')!.id]: { choice: 'import-new-id' },
            [conflicts.find((conflict) => conflict.kind === 'name')!.id]: {
                choice: 'rename',
                name: '导入重复角色'
            }
        })

        const mergedCharacters = await repository.listCharacters(targetProject.id)
        expect(mergedCharacters.characters.map((character) => character.name)).toEqual(
            expect.arrayContaining(['重复角色', '导入重复角色'])
        )
    })
})
