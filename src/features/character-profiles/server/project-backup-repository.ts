import { randomUUID } from 'node:crypto'
import type { Character } from '../types/character.ts'
import {
    backupFormatVersion,
    type BackupArchive,
    type BackupConflict,
    type BackupDecision,
    type BackupDecisions,
    type BackupMode,
    type BackupPreview,
    type ProjectBackup,
    type ProjectBackupBundle
} from '../types/backup.ts'
import type { Project } from '../types/project.ts'
import type { Tag } from '../types/tag.ts'
import { isRecord } from './guards.ts'
import { ProjectFileStorage } from './project-file-storage.ts'
import { projectFormatVersion, projectJsonCodec } from './project-json-codec.ts'
import { ProjectRepositoryError } from './project-repository-error.ts'
import { projectNameKey, validateFilesystemProjectName } from './project-data-repository.ts'

type Counts = { projects: number; characters: number; tags: number }
type ChildRecord = Character | Tag

export class ProjectBackupRepository {
    private readonly storage: ProjectFileStorage

    constructor(storage: ProjectFileStorage) {
        this.storage = storage
    }

    async exportBackup(): Promise<ProjectBackup> {
        const projects = await this.readDataset()
        return {
            backupFormatVersion,
            projects: projects.map((bundle) => ({
                project: { formatVersion: projectFormatVersion, ...bundle.project },
                characters: bundle.characters.map((character) => ({
                    formatVersion: projectFormatVersion,
                    ...character
                })),
                tags: bundle.tags.map((tag) => ({ formatVersion: projectFormatVersion, ...tag }))
            }))
        }
    }

    async previewImport(value: unknown, mode: BackupMode): Promise<BackupPreview> {
        const incoming = parseBackup(value)
        const current = await this.readCurrentDataset(mode)
        return createPreview(current.bundles, incoming, mode, current.issues)
    }

    listBackupArchives(): Promise<BackupArchive[]> {
        return this.storage.listDatasetBackups()
    }

    async restoreBackupArchive(id: string): Promise<void> {
        try {
            await this.storage.restoreDatasetBackup(id)
        } catch (error) {
            throw invalidBackup(error instanceof Error ? `无法恢复旧资料库：${error.message}` : '无法恢复旧资料库。')
        }
    }

    async applyImport(value: unknown, mode: BackupMode, decisions: BackupDecisions): Promise<void> {
        const incoming = parseBackup(value)
        if (mode === 'replace') {
            await this.storage.replaceDataset(incoming.projects)
            return
        }

        const current = await this.readDataset()
        const preview = createPreview(current, incoming, mode)
        const resolved = resolveMerge(current, incoming, preview.conflicts, decisions)
        validateDataset(resolved)
        await this.storage.replaceDataset(resolved)
    }

    private async readCurrentDataset(mode: BackupMode): Promise<{ bundles: ProjectBackupBundle[]; issues: string[] }> {
        if (mode !== 'replace') return { bundles: await this.readDataset(), issues: [] }
        try {
            return { bundles: await this.readDataset(), issues: [] }
        } catch (error) {
            return {
                bundles: [],
                issues: [`当前资料库无法完整读取：${getStorageErrorMessage(error)} 替换确认后将覆盖这些数据。`]
            }
        }
    }

    private async readDataset(): Promise<ProjectBackupBundle[]> {
        const bundles: ProjectBackupBundle[] = []
        for (const directoryName of await this.storage.listProjectDirectories()) {
            try {
                const project = await this.storage.readProject(directoryName)
                if (project.name !== directoryName) {
                    throw invalidBackup(`项目目录“${directoryName}”与项目名称不一致。`)
                }
                bundles.push({
                    project,
                    characters: await this.storage.readCharactersStrict(directoryName, project.id),
                    tags: await this.storage.readTagsStrict(directoryName, project.id)
                })
            } catch (error) {
                if (error instanceof ProjectRepositoryError) throw error
                throw invalidBackup(`无法读取项目目录“${directoryName}”：${getStorageErrorMessage(error)}`)
            }
        }
        validateDataset(bundles)
        return bundles
    }
}

function parseBackup(value: unknown): ProjectBackup {
    if (!isRecord(value) || value.backupFormatVersion !== backupFormatVersion || !Array.isArray(value.projects)) {
        throw invalidBackup('备份格式版本不受支持或备份结构无效。')
    }

    const projects = value.projects.map((bundle) => {
        if (
            !isRecord(bundle) ||
            !isRecord(bundle.project) ||
            !Array.isArray(bundle.characters) ||
            !Array.isArray(bundle.tags)
        ) {
            throw invalidBackup('备份中的项目记录结构无效。')
        }
        return {
            project: decodeProject(bundle.project),
            characters: bundle.characters.map((character) => decodeCharacter(character)),
            tags: bundle.tags.map((tag) => decodeTag(tag))
        }
    })
    validateDataset(projects)
    return { backupFormatVersion, projects }
}

function decodeProject(value: Record<string, unknown>): Project {
    try {
        const project = projectJsonCodec.decodeProject(JSON.stringify(value))
        validateFilesystemProjectName(project.name)
        return project
    } catch {
        throw invalidBackup('备份中的项目记录无效。')
    }
}

function decodeCharacter(value: Record<string, unknown>): Character {
    try {
        if (value.projectId !== undefined && typeof value.projectId !== 'string') throw new Error()
        return projectJsonCodec.decodeCharacter(
            JSON.stringify(value),
            typeof value.projectId === 'string' ? value.projectId : ''
        )
    } catch {
        throw invalidBackup('备份中的角色记录无效。')
    }
}

function decodeTag(value: Record<string, unknown>): Tag {
    try {
        return projectJsonCodec.decodeTag(
            JSON.stringify(value),
            typeof value.projectId === 'string' ? value.projectId : ''
        )
    } catch {
        throw invalidBackup('备份中的标签记录无效。')
    }
}

function validateDataset(bundles: ProjectBackupBundle[]): void {
    const projectIds = new Set<string>()
    const projectNames = new Set<string>()
    const characterIds = new Set<string>()
    const tagIds = new Set<string>()

    for (const bundle of bundles) {
        const { project } = bundle
        if (!isSafeRecordId(project.id) || projectIds.has(project.id))
            throw invalidBackup('备份中存在无效或重复的项目 ID。')
        if (projectNames.has(projectNameKey(project.name))) throw invalidBackup(`项目名称“${project.name}”重复。`)
        projectIds.add(project.id)
        projectNames.add(projectNameKey(project.name))

        const characterNames = new Set<string>()
        const tagNames = new Set<string>()
        for (const character of bundle.characters) {
            if (!isSafeRecordId(character.id) || characterIds.has(character.id)) {
                throw invalidBackup('备份中存在无效或重复的角色 ID。')
            }
            if (character.projectId !== project.id) throw invalidBackup(`角色“${character.name}”的项目归属无效。`)
            if (characterNames.has(nameKey(character.name))) throw invalidBackup(`角色姓名“${character.name}”重复。`)
            for (const tagId of character.tagIds) {
                if (!bundle.tags.some((tag) => tag.id === tagId)) {
                    throw invalidBackup(`角色“${character.name}”引用了不存在的标签。`)
                }
            }
            characterIds.add(character.id)
            characterNames.add(nameKey(character.name))
        }
        for (const tag of bundle.tags) {
            if (!isSafeRecordId(tag.id) || tagIds.has(tag.id)) {
                throw invalidBackup('备份中存在无效或重复的标签 ID。')
            }
            if (tag.projectId !== project.id) throw invalidBackup(`标签“${tag.name}”的项目归属无效。`)
            if (tagNames.has(nameKey(tag.name))) throw invalidBackup(`标签“${tag.name}”重复。`)
            tagIds.add(tag.id)
            tagNames.add(nameKey(tag.name))
        }
    }
}

function createPreview(
    current: ProjectBackupBundle[],
    incoming: ProjectBackup,
    mode: BackupMode,
    currentDataIssues: string[] = []
): BackupPreview {
    const currentCounts = countRecords(current)
    const incomingCounts = countRecords(incoming.projects)
    if (mode === 'replace') {
        return {
            mode,
            current: currentCounts,
            incoming: incomingCounts,
            additions: incomingCounts,
            removals: currentCounts,
            addedRecords: formatRecordNames(incoming.projects),
            removedRecords: formatRecordNames(current),
            currentDataIssues,
            conflicts: [],
            blockingIssues: []
        }
    }

    const conflicts: BackupConflict[] = []
    const currentProjects = current.flatMap((bundle) => bundle.project)
    const currentCharacters = current.flatMap((bundle) => bundle.characters)
    const currentTags = current.flatMap((bundle) => bundle.tags)
    for (const bundle of incoming.projects) {
        addProjectConflicts(bundle.project, current, conflicts)
        for (const character of bundle.characters) addChildConflicts(character, bundle.project.id, current, conflicts)
        for (const tag of bundle.tags) addChildConflicts(tag, bundle.project.id, current, conflicts)
    }

    return {
        mode,
        current: currentCounts,
        incoming: incomingCounts,
        additions: {
            projects: incoming.projects.filter(
                (bundle) => !currentProjects.some((project) => project.id === bundle.project.id)
            ).length,
            characters: incoming.projects.reduce(
                (count, bundle) =>
                    count +
                    bundle.characters.filter((character) => !currentCharacters.some((item) => item.id === character.id))
                        .length,
                0
            ),
            tags: incoming.projects.reduce(
                (count, bundle) =>
                    count + bundle.tags.filter((tag) => !currentTags.some((item) => item.id === tag.id)).length,
                0
            )
        },
        removals: { projects: 0, characters: 0, tags: 0 },
        addedRecords: formatRecordNames(
            incoming.projects.filter((bundle) => !currentProjects.some((project) => project.id === bundle.project.id))
        ),
        removedRecords: [],
        currentDataIssues,
        conflicts,
        blockingIssues: []
    }
}

function addProjectConflicts(incoming: Project, current: ProjectBackupBundle[], conflicts: BackupConflict[]): void {
    const currentProject = current.flatMap((bundle) => [bundle.project]).find((project) => project.id === incoming.id)
    if (currentProject && !sameRecord(currentProject, incoming)) {
        conflicts.push({
            id: conflictId('project', 'same-id', incoming.id),
            entity: 'project',
            kind: 'same-id',
            message: `项目 ID “${incoming.id}”的内容和变更历史不同；采用备份将整体替换当前记录及其历史。`,
            backupName: incoming.name,
            currentName: currentProject.name
        })
    }
    if (
        current.some(
            (bundle) =>
                bundle.project.id !== incoming.id &&
                projectNameKey(bundle.project.name) === projectNameKey(incoming.name)
        )
    ) {
        conflicts.push({
            id: conflictId('project', 'name', incoming.id),
            entity: 'project',
            kind: 'name',
            message: `项目名称“${incoming.name}”已被其他项目使用。`,
            backupName: incoming.name,
            currentName: incoming.name
        })
    }
}

function addChildConflicts(
    incoming: ChildRecord,
    projectId: string,
    current: ProjectBackupBundle[],
    conflicts: BackupConflict[]
): void {
    const currentRecord = findChild(current, incoming.id, entityOf(incoming))
    if (currentRecord && currentRecord.projectId !== projectId) {
        conflicts.push({
            id: conflictId(entityOf(incoming), 'ownership', incoming.id),
            entity: entityOf(incoming),
            kind: 'ownership',
            message: `${entityLabel(incoming)} ID “${incoming.id}”属于另一个项目。`,
            backupName: incoming.name,
            currentName: currentRecord.name
        })
    } else if (currentRecord && !sameRecord(currentRecord, incoming)) {
        conflicts.push({
            id: conflictId(entityOf(incoming), 'same-id', incoming.id),
            entity: entityOf(incoming),
            kind: 'same-id',
            message: `${entityLabel(incoming)} ID “${incoming.id}”的内容和变更历史不同；采用备份将整体替换当前记录及其历史。`,
            backupName: incoming.name,
            currentName: currentRecord.name
        })
    }
    const currentBundle = current.find((bundle) => bundle.project.id === projectId)
    if (
        currentBundle &&
        currentBundle[entityOf(incoming) === 'character' ? 'characters' : 'tags'].some(
            (record) => record.id !== incoming.id && nameKey(record.name) === nameKey(incoming.name)
        )
    ) {
        conflicts.push({
            id: conflictId(entityOf(incoming), 'name', incoming.id),
            entity: entityOf(incoming),
            kind: 'name',
            message: `${entityLabel(incoming)}名称“${incoming.name}”已在项目中使用。`,
            backupName: incoming.name,
            currentName: incoming.name
        })
    }
}

function resolveMerge(
    current: ProjectBackupBundle[],
    incoming: ProjectBackup,
    conflicts: BackupConflict[],
    decisions: BackupDecisions
): ProjectBackupBundle[] {
    for (const conflict of conflicts) {
        const decision = decisions[conflict.id]
        if (!decision || !isAllowedChoice(conflict.kind, decision)) {
            throw invalidBackup(`请先处理冲突：${conflict.message}`)
        }
        if (decision.choice === 'rename' && !decision.name?.trim())
            throw invalidBackup('重命名冲突记录时必须填写新名称。')
        if (decision.choice === 'rename' && conflict.entity === 'project')
            validateFilesystemProjectName(decision.name!.trim())
    }

    const resolved = clone(current)
    for (const incomingBundle of incoming.projects) {
        const projectDecision = resolveProjectDecision(incomingBundle.project, resolved, conflicts, decisions)
        if (!projectDecision.project) continue
        let target = resolved.find((bundle) => bundle.project.id === projectDecision.project!.id)
        if (!target) {
            target = { project: projectDecision.project, characters: [], tags: [] }
            resolved.push(target)
        } else if (projectDecision.useBackup) {
            target.project = projectDecision.project
        }

        const tagIdMap = new Map<string, string>()
        for (const tag of incomingBundle.tags) {
            const importedTagId = mergeTag(target, tag, resolved, conflicts, decisions)
            if (importedTagId && importedTagId !== tag.id) tagIdMap.set(tag.id, importedTagId)
        }
        for (const character of incomingBundle.characters) {
            mergeCharacter(
                target,
                { ...character, tagIds: character.tagIds.map((tagId) => tagIdMap.get(tagId) ?? tagId) },
                resolved,
                conflicts,
                decisions
            )
        }
    }
    return resolved
}

function resolveProjectDecision(
    incoming: Project,
    resolved: ProjectBackupBundle[],
    conflicts: BackupConflict[],
    decisions: BackupDecisions
): { project: Project | null; useBackup: boolean } {
    const current = resolved.find((bundle) => bundle.project.id === incoming.id)?.project
    const sameIdConflict = findConflict(conflicts, 'project', 'same-id', incoming.id)
    const nameConflict = findConflict(conflicts, 'project', 'name', incoming.id)
    let project = current ?? incoming
    let useBackup = !current
    if (sameIdConflict) {
        const decision = decisions[sameIdConflict.id]!
        if (decision.choice === 'keep-current') return { project: current!, useBackup: false }
        project = incoming
        useBackup = true
    }
    if (nameConflict) {
        const decision = decisions[nameConflict.id]!
        if (decision.choice === 'skip') return { project: null, useBackup: false }
        project = { ...project, name: decision.name!.trim() }
        useBackup = true
    }
    return { project, useBackup }
}

function mergeTag(
    target: ProjectBackupBundle,
    incoming: Tag,
    resolved: ProjectBackupBundle[],
    conflicts: BackupConflict[],
    decisions: BackupDecisions
): string | undefined {
    const sourceId = incoming.id
    const nameConflict = findConflict(conflicts, 'tag', 'name', sourceId)
    if (nameConflict && decisions[nameConflict.id]!.choice === 'skip') return undefined
    const current = findChild(resolved, incoming.id, 'tag')
    if (current && current.projectId !== target.project.id) {
        const decision = decisionFor(conflicts, decisions, 'tag', 'ownership', incoming.id)
        if (decision.choice === 'skip') return undefined
        incoming = { ...incoming, id: randomUUID() }
    } else if (current) {
        const conflict = findConflict(conflicts, 'tag', 'same-id', incoming.id)
        if (conflict && decisions[conflict.id]!.choice === 'keep-current') return undefined
        if (conflict) {
            target.tags = target.tags.filter((tag) => tag.id !== incoming.id)
        } else if (!nameConflict) {
            return undefined
        }
    }
    if (nameConflict) {
        const decision = decisions[nameConflict.id]!
        if (decision.choice === 'skip') return undefined
        incoming = { ...incoming, name: decision.name!.trim() }
    }
    target.tags.push({ ...incoming, projectId: target.project.id })
    return incoming.id
}

function mergeCharacter(
    target: ProjectBackupBundle,
    incoming: Character,
    resolved: ProjectBackupBundle[],
    conflicts: BackupConflict[],
    decisions: BackupDecisions
): void {
    const sourceId = incoming.id
    const nameConflict = findConflict(conflicts, 'character', 'name', sourceId)
    if (nameConflict && decisions[nameConflict.id]!.choice === 'skip') return
    const current = findChild(resolved, incoming.id, 'character')
    if (current && current.projectId !== target.project.id) {
        const decision = decisionFor(conflicts, decisions, 'character', 'ownership', incoming.id)
        if (decision.choice === 'skip') return
        incoming = { ...incoming, id: randomUUID() }
    } else if (current) {
        const conflict = findConflict(conflicts, 'character', 'same-id', incoming.id)
        if (conflict && decisions[conflict.id]!.choice === 'keep-current') return
        if (conflict) {
            target.characters = target.characters.filter((character) => character.id !== incoming.id)
        } else if (!nameConflict) {
            return
        }
    }
    if (nameConflict) {
        const decision = decisions[nameConflict.id]!
        if (decision.choice === 'skip') return
        incoming = { ...incoming, name: decision.name!.trim() }
    }
    target.characters.push({ ...incoming, projectId: target.project.id })
}

function countRecords(bundles: ProjectBackupBundle[]): Counts {
    return {
        projects: bundles.length,
        characters: bundles.reduce((count, bundle) => count + bundle.characters.length, 0),
        tags: bundles.reduce((count, bundle) => count + bundle.tags.length, 0)
    }
}

function findChild(bundles: ProjectBackupBundle[], id: string, entity: 'character' | 'tag'): ChildRecord | undefined {
    return bundles
        .flatMap((bundle) => (entity === 'character' ? bundle.characters : bundle.tags))
        .find((record) => record.id === id)
}

function findConflict(
    conflicts: BackupConflict[],
    entity: BackupConflict['entity'],
    kind: BackupConflict['kind'],
    id: string
): BackupConflict | undefined {
    return conflicts.find(
        (conflict) =>
            conflict.entity === entity && conflict.kind === kind && conflict.id === conflictId(entity, kind, id)
    )
}

function decisionFor(
    conflicts: BackupConflict[],
    decisions: BackupDecisions,
    entity: BackupConflict['entity'],
    kind: BackupConflict['kind'],
    id: string
): BackupDecision {
    const conflict = findConflict(conflicts, entity, kind, id)
    if (!conflict || !decisions[conflict.id]) throw invalidBackup('备份冲突信息已过期，请重新生成预览。')
    return decisions[conflict.id]
}

function isAllowedChoice(kind: BackupConflict['kind'], decision: BackupDecision): boolean {
    if (kind === 'same-id') return decision.choice === 'keep-current' || decision.choice === 'use-backup'
    if (kind === 'ownership') return decision.choice === 'skip' || decision.choice === 'import-new-id'
    return decision.choice === 'skip' || decision.choice === 'rename'
}

function conflictId(entity: BackupConflict['entity'], kind: BackupConflict['kind'], id: string): string {
    return `${entity}:${kind}:${id}`
}

function entityOf(record: ChildRecord): 'character' | 'tag' {
    return 'motivation' in record ? 'character' : 'tag'
}

function entityLabel(record: ChildRecord): string {
    return entityOf(record) === 'character' ? '角色' : '标签'
}

function sameRecord(left: unknown, right: unknown): boolean {
    return JSON.stringify(left) === JSON.stringify(right)
}

function clone<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T
}

function nameKey(value: string): string {
    return value.normalize('NFC').toUpperCase().toLowerCase().normalize('NFC')
}

function isSafeRecordId(value: string): boolean {
    return (
        value.length > 0 &&
        value !== '.' &&
        value !== '..' &&
        value.length <= 180 &&
        !/[<>:"/\\|?*]/u.test(value) &&
        !Array.from(value).some((character) => {
            const codePoint = character.codePointAt(0)
            return codePoint !== undefined && codePoint <= 0x1f
        }) &&
        !/^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/iu.test(value) &&
        !/[. ]$/u.test(value)
    )
}

function formatRecordNames(bundles: ProjectBackupBundle[]): string[] {
    return bundles.flatMap((bundle) => [
        `项目：${bundle.project.name}`,
        ...bundle.characters.map((character) => `角色：${character.name}`),
        ...bundle.tags.map((tag) => `标签：${tag.name}`)
    ])
}

function invalidBackup(message: string): ProjectRepositoryError {
    return new ProjectRepositoryError(message, 'invalid-data')
}

function getStorageErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message) return error.message
    return '记录格式无效。'
}
