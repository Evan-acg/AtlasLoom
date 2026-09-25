import { describe, expect, it } from 'vitest'
import type { Tag } from '../types/tag'
import { useProjectTags } from './useProjectTags'

describe('project tag state', () => {
    // Given a project tag request that has not completed
    // When the project tag state starts loading
    // Then it exposes loading and saving state for the active project
    it('exposes request state while loading tags', async () => {
        let releaseLoad!: (value: { tags: Tag[] }) => void
        const pendingLoad = new Promise<{ tags: Tag[] }>((resolve) => {
            releaseLoad = resolve
        })
        const tagState = useProjectTags({
            list: async () => pendingLoad,
            create: async () => createTag('tag-a', 'project-a'),
            rename: async () => createTag('tag-a', 'project-a')
        })

        const load = tagState.load('project-a')

        expect(tagState.loading.value).toBe(true)
        expect(tagState.saving.value).toBe(false)

        releaseLoad({ tags: [] })
        await load

        expect(tagState.loading.value).toBe(false)
    })

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

    // Given two tag creations where the first request completes after the second
    // When both mutations finish for the active project
    // Then the final tag list includes both persisted tags
    it('refreshes after every concurrent tag mutation', async () => {
        const firstTag = createTag('tag-a', 'project-a')
        const secondTag = createTag('tag-b', 'project-a')
        let currentTags: Tag[] = []
        let releaseFirst!: () => void
        let createCount = 0
        const firstCreate = new Promise<Tag>((resolve) => {
            releaseFirst = () => {
                currentTags = [firstTag, secondTag]
                resolve(firstTag)
            }
        })
        const tagState = useProjectTags({
            list: async () => ({ tags: currentTags }),
            create: async () => {
                createCount += 1
                if (createCount === 1) return firstCreate
                currentTags = [secondTag]
                return secondTag
            },
            rename: async () => firstTag
        })

        await tagState.load('project-a')
        const firstMutation = tagState.createTag({ name: firstTag.name })
        const secondMutation = tagState.createTag({ name: secondTag.name })

        await secondMutation
        expect(tagState.saving.value).toBe(true)
        releaseFirst()
        await firstMutation

        expect(tagState.tags.value).toEqual([firstTag, secondTag])
        expect(tagState.saving.value).toBe(false)
    })

    // Given one tag mutation fails while another mutation is still in flight
    // When the successful mutation refreshes the active project
    // Then the failed mutation error remains visible
    it('keeps a concurrent mutation error visible after a successful refresh', async () => {
        const originalTag = createTag('tag-a', 'project-a')
        const renamedTag = { ...originalTag, name: 'Renamed' }
        let rejectFirst!: (reason: Error) => void
        let resolveSecond!: (tag: Tag) => void
        let renameCount = 0
        const firstRename = new Promise<Tag>((_, reject) => {
            rejectFirst = reject
        })
        const secondRename = new Promise<Tag>((resolve) => {
            resolveSecond = resolve
        })
        const tagState = useProjectTags({
            list: async () => ({ tags: [renamedTag] }),
            create: async () => renamedTag,
            rename: async () => {
                renameCount += 1
                return renameCount === 1 ? firstRename : secondRename
            }
        })

        await tagState.load('project-a')
        const firstMutation = tagState.renameTag(originalTag.id, { name: 'Broken' })
        const secondMutation = tagState.renameTag(originalTag.id, { name: renamedTag.name })
        rejectFirst(new Error('标签重命名失败'))
        await expect(firstMutation).rejects.toThrow('标签重命名失败')

        resolveSecond(renamedTag)
        await secondMutation

        expect(tagState.tagError.value).toBe('标签重命名失败')
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
