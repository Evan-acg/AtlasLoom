import { ref } from 'vue'
import type { Character, CharacterInput } from '../types/character'
import type { ProjectInput, ProjectRepairResolution } from '../types/project'
import type { Tag, TagInput } from '../types/tag'
import type { ProjectWorkspaceAdapters } from '../types/workspace'
import { useProjectState } from './useProjectState'

export function useProjectWorkspace(adapters: ProjectWorkspaceAdapters) {
    const projectState = useProjectState(adapters.projects)
    const characters = ref<Character[]>([])
    const deletedCharacters = ref<Character[]>([])
    const tags = ref<Tag[]>([])
    const charactersLoading = ref(false)
    const characterError = ref('')
    const tagError = ref('')
    let loadToken = 0

    async function load(projectId: string | null = null) {
        const token = ++loadToken
        characters.value = []
        deletedCharacters.value = []
        tags.value = []
        charactersLoading.value = false
        characterError.value = ''
        tagError.value = ''
        await projectState.load(projectId)

        if (!projectId) {
            return
        }

        if (token !== loadToken || projectState.error.value) return
        await Promise.allSettled([refreshCharacters(projectId, token), refreshTags(projectId, token)])
    }

    async function createProject(input: ProjectInput) {
        return projectState.create(input)
    }

    async function updateProject(id: string, input: ProjectInput) {
        return projectState.update(id, input)
    }

    async function deleteProject(id: string) {
        return projectState.remove(id)
    }

    async function restoreProject(id: string) {
        return projectState.restore(id)
    }

    async function repairProject(directoryName: string, resolution: ProjectRepairResolution) {
        return projectState.repair(directoryName, resolution)
    }

    function clearProjectError() {
        projectState.clearError()
    }

    async function refreshCharacters(projectId = projectState.selectedProjectId.value, token = loadToken) {
        if (!projectId) {
            characters.value = []
            deletedCharacters.value = []
            return
        }
        charactersLoading.value = true
        characterError.value = ''
        try {
            const result = await adapters.characters.list(projectId)
            if (token !== loadToken || projectState.selectedProjectId.value !== projectId) return
            characters.value = result.characters
            deletedCharacters.value = result.deletedCharacters
        } catch (reason) {
            if (token === loadToken && projectState.selectedProjectId.value === projectId)
                characterError.value = errorMessage(reason)
            throw reason
        } finally {
            if (token === loadToken) charactersLoading.value = false
        }
    }

    async function createCharacter(input: CharacterInput) {
        const projectId = projectState.selectedProjectId.value
        if (!projectId) return
        try {
            const character = await adapters.characters.create(projectId, input)
            if (projectState.selectedProjectId.value !== projectId) return
            await refreshCharacters(projectId)
            return character
        } catch (reason) {
            characterError.value = errorMessage(reason)
            throw reason
        }
    }

    async function updateCharacter(characterId: string, input: CharacterInput) {
        const projectId = projectState.selectedProjectId.value
        if (!projectId) return
        try {
            const character = await adapters.characters.update(projectId, characterId, input)
            if (projectState.selectedProjectId.value !== projectId) return
            await refreshCharacters(projectId)
            return character
        } catch (reason) {
            characterError.value = errorMessage(reason)
            throw reason
        }
    }

    async function deleteCharacter(characterId: string) {
        const projectId = projectState.selectedProjectId.value
        if (!projectId) return
        try {
            const character = await adapters.characters.remove(projectId, characterId)
            if (projectState.selectedProjectId.value !== projectId) return
            await refreshCharacters(projectId)
            return character
        } catch (reason) {
            characterError.value = errorMessage(reason)
            throw reason
        }
    }

    async function refreshTags(projectId = projectState.selectedProjectId.value, token = loadToken) {
        if (!projectId) {
            tags.value = []
            return
        }
        tagError.value = ''
        try {
            const result = await adapters.tags.list(projectId)
            if (token !== loadToken || projectState.selectedProjectId.value !== projectId) return
            tags.value = result.tags
        } catch (reason) {
            if (token === loadToken && projectState.selectedProjectId.value === projectId)
                tagError.value = errorMessage(reason)
            throw reason
        }
    }

    async function createTag(input: TagInput) {
        const projectId = projectState.selectedProjectId.value
        if (!projectId) return
        try {
            const tag = await adapters.tags.create(projectId, input)
            if (projectState.selectedProjectId.value !== projectId) return
            await refreshTags(projectId)
            return tag
        } catch (reason) {
            tagError.value = errorMessage(reason)
            throw reason
        }
    }

    async function renameTag(tagId: string, input: TagInput) {
        const projectId = projectState.selectedProjectId.value
        if (!projectId) return
        try {
            const tag = await adapters.tags.rename(projectId, tagId, input)
            if (projectState.selectedProjectId.value !== projectId) return
            await refreshTags(projectId)
            return tag
        } catch (reason) {
            tagError.value = errorMessage(reason)
            throw reason
        }
    }

    async function restoreCharacter(characterId: string) {
        const projectId = projectState.selectedProjectId.value
        if (!projectId) return
        try {
            const restored = await adapters.characters.restore(projectId, characterId)
            if (projectState.selectedProjectId.value !== projectId) return
            await refreshCharacters(projectId)
            return restored
        } catch (reason) {
            characterError.value = errorMessage(reason)
            throw reason
        }
    }

    return {
        projects: projectState.projects,
        deletedProjects: projectState.deletedProjects,
        storageIssues: projectState.storageIssues,
        selectedProject: projectState.selectedProject,
        characters,
        deletedCharacters,
        tags,
        loading: projectState.loading,
        charactersLoading,
        projectError: projectState.error,
        characterError,
        tagError,
        load,
        refreshProjects: projectState.refresh,
        createProject,
        updateProject,
        deleteProject,
        restoreProject,
        repairProject,
        clearProjectError,
        createCharacter,
        updateCharacter,
        deleteCharacter,
        createTag,
        renameTag,
        restoreCharacter
    }
}

function errorMessage(reason: unknown): string {
    return reason instanceof Error ? reason.message : '本地项目服务暂时无法处理请求。'
}
