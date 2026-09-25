import { computed, reactive, ref, type ComputedRef, type Ref } from 'vue'
import type { Tag, TagInput } from '../types/tag'
import type { ProjectWorkspaceTagAdapter } from '../types/workspace'
import { getCharacterProfilesErrorMessage } from '../utils/error-message'

export interface ProjectTagState {
    tags: Ref<Tag[]>
    tagError: Ref<string>
    loading: Ref<boolean>
    saving: ComputedRef<boolean>
    selectProject: (projectId: string | null) => void
    load: (projectId?: string | null, options?: ProjectTagLoadOptions) => Promise<void>
    createTag: (input: TagInput) => Promise<Tag | undefined>
    renameTag: (tagId: string, input: TagInput) => Promise<Tag | undefined>
}

interface ProjectTagLoadOptions {
    preserveError?: boolean
}

export function useProjectTags(adapter: ProjectWorkspaceTagAdapter): ProjectTagState {
    const tags = ref<Tag[]>([])
    const tagError = ref('')
    const loading = ref(false)
    const pendingMutations = reactive(new Map<string, number>())
    const activeProjectId = ref<string | null>(null)
    let requestToken = 0
    const saving = computed(() => Boolean(activeProjectId.value && pendingMutations.get(activeProjectId.value)))

    function selectProject(projectId: string | null) {
        activeProjectId.value = projectId
        requestToken += 1
        tags.value = []
        tagError.value = ''
        loading.value = false
    }

    async function load(projectId = activeProjectId.value, options: ProjectTagLoadOptions = {}) {
        if (activeProjectId.value !== projectId) selectProject(projectId)
        const token = ++requestToken
        if (!options.preserveError) tagError.value = ''

        if (!projectId) {
            loading.value = false
            return
        }

        loading.value = true
        try {
            const result = await adapter.list(projectId)
            if (token !== requestToken || activeProjectId.value !== projectId) return
            tags.value = result.tags
        } catch (reason) {
            if (token === requestToken && activeProjectId.value === projectId) {
                tagError.value = getCharacterProfilesErrorMessage(reason)
            }
            throw reason
        } finally {
            if (token === requestToken && activeProjectId.value === projectId) loading.value = false
        }
    }

    async function createTag(input: TagInput) {
        const projectId = activeProjectId.value
        if (!projectId) return
        beginMutation(projectId)

        try {
            const tag = await adapter.create(projectId, input)
            if (activeProjectId.value === projectId) await load(projectId, { preserveError: true })
            return tag
        } catch (reason) {
            if (activeProjectId.value === projectId) {
                tagError.value = getCharacterProfilesErrorMessage(reason)
            }
            throw reason
        } finally {
            endMutation(projectId)
        }
    }

    async function renameTag(tagId: string, input: TagInput) {
        const projectId = activeProjectId.value
        if (!projectId) return
        beginMutation(projectId)

        try {
            const tag = await adapter.rename(projectId, tagId, input)
            if (activeProjectId.value === projectId) await load(projectId, { preserveError: true })
            return tag
        } catch (reason) {
            if (activeProjectId.value === projectId) {
                tagError.value = getCharacterProfilesErrorMessage(reason)
            }
            throw reason
        } finally {
            endMutation(projectId)
        }
    }

    function beginMutation(projectId: string) {
        if (activeProjectId.value === projectId) tagError.value = ''
        pendingMutations.set(projectId, (pendingMutations.get(projectId) ?? 0) + 1)
    }

    function endMutation(projectId: string) {
        const pending = pendingMutations.get(projectId) ?? 0
        if (pending <= 1) pendingMutations.delete(projectId)
        else pendingMutations.set(projectId, pending - 1)
    }

    return { tags, tagError, loading, saving, selectProject, load, createTag, renameTag }
}
