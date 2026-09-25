import { mkdtemp, readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { platform } from 'node:process'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ProjectRepository } from './project-repository'

describe('ProjectRepository', () => {
    let dataDirectory: string

    beforeEach(async () => {
        dataDirectory = await mkdtemp(join(tmpdir(), 'atlasloom-projects-'))
    })

    afterEach(async () => {
        await rm(dataDirectory, { recursive: true, force: true })
    })

    // Given an empty project data directory
    // When the user creates a project with a name and description
    // Then its versioned metadata is written under a directory named after the project
    it('creates a project in its JSON directory', async () => {
        const repository = new ProjectRepository(dataDirectory)

        const project = await repository.createProject({ name: '雾港编年', description: '群岛城市' })

        const metadataPath = join(dataDirectory, '雾港编年', 'metadata.json')
        const metadata = JSON.parse(await readFile(metadataPath, 'utf8')) as Record<string, unknown>
        expect(project).toMatchObject({ name: '雾港编年', description: '群岛城市' })
        expect(metadata).toMatchObject({ formatVersion: 1, id: project.id, name: '雾港编年' })
        expect(project.history[0]?.summary).toBe('创建项目')
        expect(await readdir(join(dataDirectory, '雾港编年'))).toEqual(['metadata.json'])
    })

    // Given a persisted project
    // When the user creates a character with the fixed profile fields
    // Then the character is written under that project and can be read by a new repository instance
    it('creates and lists a character in its project profile directory', async () => {
        const repository = new ProjectRepository(dataDirectory)
        const project = await repository.createProject({ name: '雾港编年', description: '' })
        const input = {
            name: '沈潮生',
            aliases: ['潮生', '船长'],
            introduction: '在旧港口长大的领航员。',
            appearance: '常穿深色航海外套。',
            personality: '谨慎但固执。',
            backstory: '曾在风暴中失去船队。',
            motivation: '找到失散的妹妹。',
            abilities: '熟悉潮汐和旧航道。',
            notes: '不要让他轻易相信陌生人。'
        }

        const character = await repository.createCharacter(project.id, input)
        const reloaded = await new ProjectRepository(dataDirectory).listCharacters(project.id)

        expect(character).toMatchObject({ projectId: project.id, ...input })
        expect(reloaded).toEqual({ characters: [character], deletedCharacters: [] })
        expect(await readdir(join(dataDirectory, '雾港编年', 'profile'))).toEqual([`${character.id}.json`])
    })

    // Given a project with a character
    // When the user edits its profile or reuses its name
    // Then the edit persists and a duplicate name is rejected within that project
    it('updates a character and enforces project-local name uniqueness', async () => {
        const repository = new ProjectRepository(dataDirectory)
        const project = await repository.createProject({ name: '雾港编年', description: '' })
        const created = await repository.createCharacter(project.id, {
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

        const updated = await repository.updateCharacter(project.id, created.id, {
            name: '陆照夜',
            aliases: [],
            introduction: '新的简介。',
            appearance: '',
            personality: '',
            backstory: '',
            motivation: '',
            abilities: '',
            notes: ''
        })

        expect(updated).toMatchObject({
            id: created.id,
            projectId: project.id,
            name: '陆照夜',
            introduction: '新的简介。'
        })
        await expect(
            repository.createCharacter(project.id, {
                name: '陆照夜',
                aliases: [],
                introduction: '',
                appearance: '',
                personality: '',
                backstory: '',
                motivation: '',
                abilities: '',
                notes: ''
            })
        ).rejects.toThrow('角色姓名“陆照夜”已存在')
    })

    // Given a persisted project
    // When the user creates and renames a project tag
    // Then the tag remains project-scoped and existing character references resolve to its new name
    it('persists project tags and renames assigned tags', async () => {
        const repository = new ProjectRepository(dataDirectory)
        const project = await repository.createProject({ name: '雾港编年', description: '' })

        const tag = await repository.createTag(project.id, { name: '航海' })
        const character = await repository.createCharacter(project.id, {
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
        const renamed = await repository.renameTag(project.id, tag.id, { name: '港口' })
        const reloaded = await new ProjectRepository(dataDirectory).listTags(project.id)
        const reloadedCharacters = await new ProjectRepository(dataDirectory).listCharacters(project.id)

        expect(renamed).toMatchObject({ id: tag.id, projectId: project.id, name: '港口' })
        expect(reloaded).toEqual({ tags: [renamed] })
        expect(reloadedCharacters.characters[0]).toMatchObject({ id: character.id, tagIds: [tag.id] })
        await expect(
            readFile(join(dataDirectory, '雾港编年', 'tags', `${tag.id}.json`), 'utf8').then((contents) =>
                JSON.parse(contents)
            )
        ).resolves.toMatchObject({ name: '港口', projectId: project.id })
        await expect(
            readFile(join(dataDirectory, '雾港编年', 'tags', `${tag.id}.json.bak`), 'utf8').then((contents) =>
                JSON.parse(contents)
            )
        ).resolves.toMatchObject({ name: '航海', projectId: project.id })
    })

    // Given two projects
    // When the user creates the same tag name in each project
    // Then the tag namespaces stay independent and duplicates are rejected only within one project
    it('scopes tag names to their project', async () => {
        const repository = new ProjectRepository(dataDirectory)
        const firstProject = await repository.createProject({ name: '雾港编年', description: '' })
        const secondProject = await repository.createProject({ name: '星垂边境', description: '' })

        await repository.createTag(firstProject.id, { name: '主角' })
        const secondTag = await repository.createTag(secondProject.id, { name: '主角' })

        expect(secondTag.projectId).toBe(secondProject.id)
        await expect(repository.createTag(firstProject.id, { name: '主角' })).rejects.toThrow('已存在')
    })

    // Given a project with valid and damaged tag files
    // When the user loads its tags
    // Then the damaged tag is isolated and valid tags remain available
    it('isolates damaged tag files while listing tags', async () => {
        const repository = new ProjectRepository(dataDirectory)
        const project = await repository.createProject({ name: '雾港编年', description: '' })
        const validTag = await repository.createTag(project.id, { name: '主角' })
        const damagedTag = await repository.createTag(project.id, { name: '待修复' })
        await writeFile(join(dataDirectory, '雾港编年', 'tags', `${damagedTag.id}.json`), '{invalid json')

        await expect(new ProjectRepository(dataDirectory).listTags(project.id)).resolves.toEqual({ tags: [validTag] })
    })

    // Given a project with valid and damaged character files
    // When the user loads its characters
    // Then the damaged character is isolated and valid characters remain available
    it('isolates damaged character files while listing characters', async () => {
        const repository = new ProjectRepository(dataDirectory)
        const project = await repository.createProject({ name: '雾港编年', description: '' })
        const validCharacter = await repository.createCharacter(project.id, {
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
        const damagedCharacter = await repository.createCharacter(project.id, {
            name: '待修复',
            aliases: [],
            introduction: '',
            appearance: '',
            personality: '',
            backstory: '',
            motivation: '',
            abilities: '',
            notes: ''
        })
        await writeFile(join(dataDirectory, '雾港编年', 'profile', `${damagedCharacter.id}.json`), '{invalid json')

        await expect(new ProjectRepository(dataDirectory).listCharacters(project.id)).resolves.toEqual({
            characters: [validCharacter],
            deletedCharacters: [],
            issues: [{ fileName: `${damagedCharacter.id}.json`, reason: 'invalid-json' }]
        })
    })

    // Given a persisted project
    // When the user changes its name and description
    // Then the project directory and metadata move together and the edit survives a new repository instance
    it('renames the project directory and preserves the updated metadata', async () => {
        const repository = new ProjectRepository(dataDirectory)
        const created = await repository.createProject({ name: '雾港编年', description: '旧简介' })

        const updated = await repository.updateProject(created.id, { name: '雾港新编', description: '新简介' })
        const reloaded = await new ProjectRepository(dataDirectory).listProjects()

        expect(updated).toMatchObject({ id: created.id, name: '雾港新编', description: '新简介' })
        expect(reloaded).toMatchObject({ projects: [updated], issues: [] })
        await expect(stat(join(dataDirectory, '雾港编年'))).rejects.toMatchObject({ code: 'ENOENT' })
        expect(await readdir(join(dataDirectory, '雾港新编'))).toContain('metadata.json')
        await expect(
            readFile(join(dataDirectory, '雾港新编', 'metadata.json.bak'), 'utf8').then((contents) =>
                JSON.parse(contents)
            )
        ).resolves.toMatchObject({ id: created.id, name: '雾港编年', description: '旧简介' })
    })

    // Given a project with a name
    // When another project is created or renamed to a case-equivalent name
    // Then the repository rejects the duplicate without changing the existing project
    it('rejects case-insensitive duplicate names during create and rename', async () => {
        const repository = new ProjectRepository(dataDirectory)
        const created = await repository.createProject({ name: 'Atlas Loom', description: '' })
        const second = await repository.createProject({ name: 'Untitled', description: '' })

        await expect(repository.createProject({ name: 'atlas loom', description: '' })).rejects.toThrow(/已存在/)
        await expect(repository.updateProject(second.id, { name: 'ATLAS LOOM', description: '' })).rejects.toThrow(
            /已存在/
        )
        await expect(repository.listProjects()).resolves.toMatchObject({ projects: [created, second], issues: [] })
    })

    // Given a project name containing a Unicode lowercase letter
    // When another name differs only by a Unicode case-folding variant
    // Then the repository treats them as the same project name
    it('rejects Unicode case-fold-equivalent project names', async () => {
        const repository = new ProjectRepository(dataDirectory)
        await repository.createProject({ name: 'οσ', description: '' })

        await expect(repository.createProject({ name: 'ος', description: '' })).rejects.toThrow(/已存在/)
    })

    // Given an empty project data directory
    // When case-equivalent project names are created concurrently
    // Then only one project is persisted
    it('keeps case-equivalent concurrent creations unique', async () => {
        const repository = new ProjectRepository(dataDirectory)

        const results = await Promise.allSettled([
            repository.createProject({ name: 'Atlas Loom', description: '' }),
            repository.createProject({ name: 'atlas loom', description: '' })
        ])
        const listing = await repository.listProjects()

        expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1)
        expect(listing.projects).toHaveLength(1)
        expect(listing.issues).toEqual([])
    })

    // Given a project name that cannot be used as a directory name
    // When the user attempts to create the project
    // Then the repository rejects it before writing project data
    it('rejects path separators and reserved Windows directory names', async () => {
        const repository = new ProjectRepository(dataDirectory)

        await expect(repository.createProject({ name: '../outside', description: '' })).rejects.toThrow(/不能包含/)
        await expect(repository.createProject({ name: 'CON', description: '' })).rejects.toThrow(/不能使用/)
        await expect(repository.createProject({ name: 'COM¹', description: '' })).rejects.toThrow(/不能使用/)
        await expect(readdir(dataDirectory)).resolves.toEqual([])
    })

    // Given a project name that exceeds common UTF-8 filename-byte limits
    // When the current file system uses that limit
    // Then the repository rejects the name before attempting a disk write
    it('checks encoded project name length on byte-limited file systems', async () => {
        const repository = new ProjectRepository(dataDirectory)
        const name = '字'.repeat(86)

        if (platform === 'win32') {
            await expect(repository.createProject({ name, description: '' })).resolves.toMatchObject({ name })
        } else {
            await expect(repository.createProject({ name, description: '' })).rejects.toThrow(/过长/)
            await expect(readdir(dataDirectory)).resolves.toEqual([])
        }
    })

    // Given one healthy project and another project with a valid backup
    // When the latter project's current metadata is corrupted
    // Then other projects remain available and the original damaged file is not overwritten
    it('isolates corrupted metadata and reports its valid backup without restoring it automatically', async () => {
        const repository = new ProjectRepository(dataDirectory)
        const healthyProject = await repository.createProject({ name: '健康项目', description: '' })
        const damagedProject = await repository.createProject({ name: '待恢复项目', description: '旧简介' })
        await repository.updateProject(damagedProject.id, { name: '待恢复项目', description: '新简介' })
        const damagedMetadataPath = join(dataDirectory, '待恢复项目', 'metadata.json')
        const damagedContents = '{invalid json'
        await writeFile(damagedMetadataPath, damagedContents)

        const listing = await repository.listProjects()

        expect(listing.projects).toEqual([healthyProject])
        expect(listing.issues).toContainEqual(
            expect.objectContaining({ directoryName: '待恢复项目', backupAvailable: true })
        )
        await expect(readFile(damagedMetadataPath, 'utf8')).resolves.toBe(damagedContents)
    })

    // Given a project directory whose name differs from its valid metadata
    // When the user chooses to keep the directory name
    // Then the metadata is updated to match that explicit choice
    it('repairs a directory mismatch using the chosen directory name', async () => {
        const repository = new ProjectRepository(dataDirectory)
        const project = await repository.createProject({ name: '项目原名', description: '简介' })
        await rename(join(dataDirectory, '项目原名'), join(dataDirectory, '磁盘目录名'))

        await repository.repairProject('磁盘目录名', 'directory-name')
        const listing = await repository.listProjects()

        expect(listing.projects).toMatchObject([{ id: project.id, name: '磁盘目录名', description: '简介' }])
        expect(listing.issues).toEqual([])
    })

    // Given a project directory whose name differs from its valid metadata
    // When the user chooses to use the metadata name
    // Then the directory is renamed to match the saved project name
    it('repairs a directory mismatch using the chosen metadata name', async () => {
        const repository = new ProjectRepository(dataDirectory)
        const project = await repository.createProject({ name: '项目原名', description: '简介' })
        await rename(join(dataDirectory, '项目原名'), join(dataDirectory, '磁盘目录名'))

        await repository.repairProject('磁盘目录名', 'metadata-name')
        const listing = await repository.listProjects()

        expect(listing.projects).toEqual([project])
        await expect(stat(join(dataDirectory, '磁盘目录名'))).rejects.toMatchObject({ code: 'ENOENT' })
        expect(listing.issues).toEqual([])
    })

    // Given a metadata name that uses a different Unicode normalization form than its directory
    // When the user chooses to use the metadata name
    // Then the directory and metadata match exactly and the project becomes available
    it('preserves the chosen metadata name normalization during mismatch repair', async () => {
        const repository = new ProjectRepository(dataDirectory)
        const project = await repository.createProject({ name: 'Café', description: 'Unicode name' })
        const metadataPath = join(dataDirectory, project.name, 'metadata.json')
        const metadata = JSON.parse(await readFile(metadataPath, 'utf8')) as { name: string }
        const decomposedName = 'Cafe\u0301'
        metadata.name = decomposedName
        await writeFile(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`)

        await repository.repairProject(project.name, 'metadata-name')
        const listing = await repository.listProjects()

        expect(listing.projects).toMatchObject([{ id: project.id, name: decomposedName }])
        expect(listing.issues).toEqual([])
    })

    // Given corrupted project metadata and a valid previous backup
    // When the user explicitly chooses to restore the backup
    // Then the project becomes available with the saved backup contents
    it('restores a valid metadata backup only after the user chooses recovery', async () => {
        const repository = new ProjectRepository(dataDirectory)
        const project = await repository.createProject({ name: '待恢复项目', description: '有效备份' })
        await repository.updateProject(project.id, { name: project.name, description: '损坏前的新版本' })
        await writeFile(join(dataDirectory, project.name, 'metadata.json'), '{invalid json')

        await repository.repairProject(project.name, 'restore-backup')
        const listing = await repository.listProjects()

        expect(listing.projects).toMatchObject([{ id: project.id, description: '有效备份' }])
        expect(listing.issues).toEqual([])
    })

    // Given a project with a character
    // When the user soft-deletes and restores the project
    // Then the project is separated from normal browsing while its character deletion state is preserved
    it('soft-deletes and restores a project without changing its characters', async () => {
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

        const deletedProject = await repository.deleteProject(project.id)
        expect(deletedProject.deletedAt).toEqual(expect.any(String))
        expect(deletedProject.history[0]?.summary).toBe('删除项目')
        await expect(repository.listProjects()).resolves.toMatchObject({
            projects: [],
            deletedProjects: [deletedProject],
            issues: []
        })
        await expect(repository.listCharacters(project.id)).resolves.toEqual({
            characters: [character],
            deletedCharacters: []
        })
        await expect(repository.createProject({ name: '雾港编年', description: '不能复用名称' })).rejects.toThrow(
            '已存在'
        )

        const restoredProject = await new ProjectRepository(dataDirectory).restoreProject(project.id)
        expect(restoredProject.deletedAt).toBeUndefined()
        expect(restoredProject.history[0]?.summary).toBe('恢复项目')
        await expect(new ProjectRepository(dataDirectory).listProjects()).resolves.toMatchObject({
            projects: [restoredProject],
            deletedProjects: [],
            issues: []
        })
    })

    // Given a project with two characters
    // When the user deletes one character and then deletes and restores the project
    // Then only the character's own deletion state controls its visibility after project recovery
    it('soft-deletes and restores characters independently from their project', async () => {
        const repository = new ProjectRepository(dataDirectory)
        const project = await repository.createProject({ name: '雾港编年', description: '' })
        const activeCharacter = await repository.createCharacter(project.id, {
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
        const deletedCharacter = await repository.createCharacter(project.id, {
            name: '林砚舟',
            aliases: [],
            introduction: '',
            appearance: '',
            personality: '',
            backstory: '',
            motivation: '',
            abilities: '',
            notes: ''
        })

        const deleted = await repository.deleteCharacter(project.id, deletedCharacter.id)
        expect(deleted.deletedAt).toEqual(expect.any(String))
        await expect(repository.listCharacters(project.id)).resolves.toEqual({
            characters: [activeCharacter],
            deletedCharacters: [deleted]
        })

        await repository.deleteProject(project.id)
        await repository.restoreProject(project.id)
        await expect(new ProjectRepository(dataDirectory).listCharacters(project.id)).resolves.toEqual({
            characters: [activeCharacter],
            deletedCharacters: [deleted]
        })

        const restored = await repository.restoreCharacter(project.id, deletedCharacter.id)
        expect(restored.deletedAt).toBeUndefined()
        await expect(repository.listCharacters(project.id)).resolves.toMatchObject({
            characters: expect.arrayContaining([activeCharacter, restored]),
            deletedCharacters: []
        })
    })
})
