import { ref, type Ref } from 'vue'
import type { Tag, TagInput } from '../types/tag'
import type { ProjectWorkspaceTagAdapter } from '../types/workspace'
import { getCharacterProfilesErrorMessage } from '../utils/error-message'

export interface ProjectTagState {
    tags: Ref<Tag[]>
    tagError: Ref<string>
    selectProject: (projectId: string | null) => void
    load: (projectId?: string | null) => Promise<void>
    createTag: (input: TagInput) => Promise<Tag | undefined>
    renameTag: (tagId: string, input: TagInput) => Promise<Tag | undefined>
}

export function useProjectTags(adapter: ProjectWorkspaceTagAdapter): ProjectTagState {
    const tags = ref<Tag[]>([])
    const tagError = ref('')
    let activeProjectId: string | null = null
    let requestToken = 0

    function selectProject(projectId: string | null) {
        activeProjectId = projectId
        requestToken += 1
        tags.value = []
        tagError.value = ''
    }

    async function load(projectId = activeProjectId) {
        if (activeProjectId !== projectId) selectProject(projectId)
        const token = ++requestToken
        tagError.value = ''

        if (!projectId) return

        try {
            const result = await adapter.list(projectId)
            if (token !== requestToken || activeProjectId !== projectId) return
            tags.value = result.tags
        } catch (reason) {
            if (token === requestToken && activeProjectId === projectId) {
                tagError.value = getCharacterProfilesErrorMessage(reason)
            }
            throw reason
        }
    }

    async function createTag(input: TagInput) {
        const projectId = activeProjectId
        if (!projectId) return
        const token = requestToken

        try {
            const tag = await adapter.create(projectId, input)
            if (token !== requestToken || activeProjectId !== projectId) return
            await load(projectId)
            return tag
        } catch (reason) {
            if (token === requestToken && activeProjectId === projectId) {
                tagError.value = getCharacterProfilesErrorMessage(reason)
            }
            throw reason
        }
    }

    async function renameTag(tagId: string, input: TagInput) {
        const projectId = activeProjectId
        if (!projectId) return
        const token = requestToken

        try {
            const tag = await adapter.rename(projectId, tagId, input)
            if (token !== requestToken || activeProjectId !== projectId) return
            await load(projectId)
            return tag
        } catch (reason) {
            if (token === requestToken && activeProjectId === projectId) {
                tagError.value = getCharacterProfilesErrorMessage(reason)
            }
            throw reason
        }
    }

    return { tags, tagError, selectProject, load, createTag, renameTag }
}
