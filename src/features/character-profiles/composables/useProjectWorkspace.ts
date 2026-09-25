import { ref } from 'vue'
import type { Tag, TagInput } from '../types/tag'
import type { ProjectWorkspaceAdapters } from '../types/workspace'
import { useCharacterWorkspace } from './useCharacterWorkspace'
import { useProjectState } from './useProjectState'

export function useProjectWorkspace(adapters: ProjectWorkspaceAdapters) {
    const projectState = useProjectState(adapters.projects)
    const characterState = useCharacterWorkspace(adapters.characters, projectState.selectedProjectId)
    const tags = ref<Tag[]>([])
    const tagError = ref('')
    let loadToken = 0

    async function load(projectId: string | null = null) {
        const token = ++loadToken
        characterState.reset()
        tags.value = []
        tagError.value = ''
        await projectState.load(projectId)

        if (!projectId || token !== loadToken || projectState.error.value) return
        await Promise.allSettled([characterState.refresh(projectId), refreshTags(projectId, token)])
    }

    async function refreshTags(projectId = projectState.selectedProjectId.value, token = loadToken) {
        if (!projectId) {
            tags.value = []
            return
        }

        tagError.value = ''
        try {
            const result = await adapters.tags.list(projectId)
            if (!isCurrentProject(projectId, token)) return
            tags.value = result.tags
        } catch (reason) {
            if (isCurrentProject(projectId, token)) tagError.value = errorMessage(reason)
            throw reason
        }
    }

    async function createTag(input: TagInput) {
        const projectId = projectState.selectedProjectId.value
        if (!projectId) return
        try {
            const tag = await adapters.tags.create(projectId, input)
            if (!isSelectedProject(projectId)) return
            await refreshTags(projectId)
            return tag
        } catch (reason) {
            if (isSelectedProject(projectId)) tagError.value = errorMessage(reason)
            throw reason
        }
    }

    async function renameTag(tagId: string, input: TagInput) {
        const projectId = projectState.selectedProjectId.value
        if (!projectId) return
        try {
            const tag = await adapters.tags.rename(projectId, tagId, input)
            if (!isSelectedProject(projectId)) return
            await refreshTags(projectId)
            return tag
        } catch (reason) {
            if (isSelectedProject(projectId)) tagError.value = errorMessage(reason)
            throw reason
        }
    }

    function isSelectedProject(projectId: string): boolean {
        return projectState.selectedProjectId.value === projectId
    }

    function isCurrentProject(projectId: string, token: number): boolean {
        return token === loadToken && isSelectedProject(projectId)
    }

    return {
        projects: projectState.projects,
        deletedProjects: projectState.deletedProjects,
        storageIssues: projectState.storageIssues,
        selectedProject: projectState.selectedProject,
        characters: characterState.characters,
        deletedCharacters: characterState.deletedCharacters,
        tags,
        loading: projectState.loading,
        charactersLoading: characterState.loading,
        projectError: projectState.error,
        characterError: characterState.error,
        tagError,
        load,
        refreshProjects: projectState.refresh,
        createProject: projectState.create,
        updateProject: projectState.update,
        deleteProject: projectState.remove,
        restoreProject: projectState.restore,
        repairProject: projectState.repair,
        clearProjectError: projectState.clearError,
        createCharacter: characterState.create,
        updateCharacter: characterState.update,
        deleteCharacter: characterState.remove,
        createTag,
        renameTag,
        restoreCharacter: characterState.restore
    }
}

function errorMessage(reason: unknown): string {
    return reason instanceof Error ? reason.message : '本地项目服务暂时无法处理请求。'
}
