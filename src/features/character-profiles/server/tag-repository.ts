import { randomUUID } from 'node:crypto'
import type { Tag, TagInput, TagListResult } from '../types/tag.ts'
import { ProjectFileStorage } from './project-file-storage.ts'
import { ProjectJsonCodecError } from './project-json-codec.ts'
import { ProjectRepositoryError } from './project-repository-error.ts'
import type { ProjectLookup } from './repository-context.ts'

export class TagRepository {
    constructor(
        private readonly storage: ProjectFileStorage,
        private readonly projects: ProjectLookup
    ) {}

    async listTags(projectId: string): Promise<TagListResult> {
        const located = await this.projects.findProject(projectId)
        return { tags: await this.readTags(located.directoryName, located.project.id) }
    }

    async createTag(projectId: string, input: TagInput): Promise<Tag> {
        const located = await this.projects.findProject(projectId)
        const normalized = normalizeTagInput(input)
        await this.assertNameAvailable(located.directoryName, located.project.id, normalized.name)
        const now = new Date().toISOString()
        const tag: Tag = { id: randomUUID(), projectId, ...normalized, createdAt: now, updatedAt: now }
        await this.storage.writeTag(located.directoryName, tag, false)
        return tag
    }

    async renameTag(projectId: string, tagId: string, input: TagInput): Promise<Tag> {
        const located = await this.projects.findProject(projectId)
        const tags = await this.readTags(located.directoryName, located.project.id)
        const current = tags.find((tag) => tag.id === tagId)
        if (!current) throw new ProjectRepositoryError('找不到该标签。', 'not-found')
        const normalized = normalizeTagInput(input)
        await this.assertNameAvailable(located.directoryName, located.project.id, normalized.name, tagId)
        if (current.name === normalized.name) return current
        const updated: Tag = { ...current, ...normalized, updatedAt: new Date().toISOString() }
        await this.storage.writeTag(located.directoryName, updated, true)
        return updated
    }

    private async readTags(directoryName: string, projectId: string): Promise<Tag[]> {
        try {
            return await this.storage.readTags(directoryName, projectId)
        } catch (error) {
            if (error instanceof ProjectJsonCodecError) return []
            throw error
        }
    }

    private async assertNameAvailable(
        directoryName: string,
        projectId: string,
        name: string,
        excludingId?: string
    ): Promise<void> {
        const duplicate = (await this.readTags(directoryName, projectId)).find(
            (tag) => tag.id !== excludingId && tagNameKey(tag.name) === tagNameKey(name)
        )
        if (duplicate) throw new ProjectRepositoryError(`标签“${name}”已存在，请换一个名称。`, 'duplicate-name')
    }
}

function normalizeTagInput(input: TagInput): TagInput {
    const name = input.name.trim()
    if (!name) throw new ProjectRepositoryError('请填写标签名称。', 'invalid-name')
    if (name.length > 80 || hasControlCharacters(name)) {
        throw new ProjectRepositoryError('标签名称过长或包含不可用字符。', 'invalid-name')
    }
    return { name }
}

function tagNameKey(value: string): string {
    return value.normalize('NFC').toUpperCase().toLowerCase().normalize('NFC')
}

function hasControlCharacters(value: string): boolean {
    return Array.from(value).some((character) => {
        const codePoint = character.codePointAt(0)
        return codePoint !== undefined && (codePoint <= 0x1f || (codePoint >= 0x7f && codePoint <= 0x9f))
    })
}
