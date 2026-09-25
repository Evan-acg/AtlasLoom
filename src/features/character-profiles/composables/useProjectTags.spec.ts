import { describe, expect, it } from 'vitest'
import type { Tag } from '../types/tag'
import { useProjectTags } from './useProjectTags'

describe('project tag state', () => {
    it('keeps tags scoped to the active project and ignores an old response', async () => {
        const tagA = createTag('tag-a', 'project-a')
        const tagB = createTag('tag-b', 'project-b')
        let releaseA!: (value: { tags: Tag[] }) => void
        const tagsA = new Promise<{ tags: Tag[] }>((resolve) => {
            releaseA = resolve
        })
        const tagState = useProjectTags({
            list: async (projectId) => (projectId === 'project-a' ? tagsA : { tags: [tagB] }),
            create: async () => tagA,
            rename: async () => tagA
        })

        const loadA = tagState.load('project-a')
        await Promise.resolve()
        const loadB = tagState.load('project-b')
        await loadB
        releaseA({ tags: [tagA] })
        await loadA

        expect(tagState.tags.value).toEqual([tagB])
        expect(tagState.tagError.value).toBe('')
    })

    it('refreshes after creating and renaming a tag without leaking errors', async () => {
        const originalTag = createTag('tag-a', 'project-a')
        const createdTag = { ...originalTag, id: 'tag-b', name: 'Created' }
        const renamedTag = { ...createdTag, name: 'Renamed' }
        let currentTags = [originalTag]
        const tagState = useProjectTags({
            list: async () => ({ tags: currentTags }),
            create: async () => {
                currentTags = [...currentTags, createdTag]
                return createdTag
            },
            rename: async () => {
                currentTags = [originalTag, renamedTag]
                return renamedTag
            }
        })

        await tagState.load('project-a')
        await tagState.createTag({ name: createdTag.name })
        await tagState.renameTag(createdTag.id, { name: renamedTag.name })

        expect(tagState.tags.value).toEqual([originalTag, renamedTag])
        expect(tagState.tagError.value).toBe('')
    })

    it('keeps a tag failure isolated to the tag error state', async () => {
        const tagState = useProjectTags({
            list: async () => {
                throw new Error('标签读取失败')
            },
            create: async () => createTag('tag-a', 'project-a'),
            rename: async () => createTag('tag-a', 'project-a')
        })

        await expect(tagState.load('project-a')).rejects.toThrow('标签读取失败')

        expect(tagState.tags.value).toEqual([])
        expect(tagState.tagError.value).toBe('标签读取失败')
    })
})

function createTag(id: string, projectId: string): Tag {
    return { id, projectId, name: id, createdAt: '', updatedAt: '' }
}
