import { computed, ref } from 'vue'
import type { Character, CharacterInput } from '../types/character'
import type { Project, ProjectInput, ProjectListResult, ProjectRepairResolution } from '../types/project'
import type { ProjectWorkspaceAdapters } from '../types/workspace'
import { useProjectTags } from './useProjectTags'

export function useProjectWorkspace(adapters: ProjectWorkspaceAdapters) {
    const projects = ref<Project[]>([])
    const deletedProjects = ref<Project[]>([])
    const storageIssues = ref<ProjectListResult['issues']>([])
    const characters = ref<Character[]>([])
    const deletedCharacters = ref<Character[]>([])
    const tagState = useProjectTags(adapters.tags)
    const selectedProjectId = ref<string | null>(null)
    const loading = ref(false)
    const charactersLoading = ref(false)
    const projectError = ref('')
    const characterError = ref('')
    let loadToken = 0

    const selectedProject = computed(
        () =>
            [...projects.value, ...deletedProjects.value].find((project) => project.id === selectedProjectId.value) ??
            null
    )

    async function load(projectId: string | null = null) {
        const token = ++loadToken
        selectedProjectId.value = projectId
        tagState.selectProject(projectId)
        characters.value = []
        deletedCharacters.value = []
        loading.value = true
        charactersLoading.value = false
        projectError.value = ''
        characterError.value = ''
        try {
            await refreshProjects(token)
        } catch {
            return
        } finally {
            loading.value = false
        }

        if (!projectId) {
            return
        }

        if (token !== loadToken) return
        await Promise.allSettled([refreshCharacters(projectId, token), tagState.load(projectId)])
    }

    async function refreshProjects(token = loadToken) {
        try {
            const projectResult = await adapters.projects.list()
            if (token !== loadToken) return
            projects.value = projectResult.projects
            deletedProjects.value = projectResult.deletedProjects
            storageIssues.value = projectResult.issues
            projectError.value = ''
        } catch (reason) {
            if (token === loadToken) projectError.value = errorMessage(reason)
            throw reason
        }
    }

    async function createProject(input: ProjectInput) {
        try {
            const project = await adapters.projects.create(input)
            await refreshProjects()
            return project
        } catch (reason) {
            projectError.value = errorMessage(reason)
            throw reason
        }
    }

    async function updateProject(id: string, input: ProjectInput) {
        try {
            const project = await adapters.projects.update(id, input)
            await refreshProjects()
            return project
        } catch (reason) {
            projectError.value = errorMessage(reason)
            throw reason
        }
    }

    async function deleteProject(id: string) {
        try {
            const project = await adapters.projects.remove(id)
            await refreshProjects()
            return project
        } catch (reason) {
            projectError.value = errorMessage(reason)
            throw reason
        }
    }

    async function restoreProject(id: string) {
        try {
            const project = await adapters.projects.restore(id)
            await refreshProjects()
            return project
        } catch (reason) {
            projectError.value = errorMessage(reason)
            throw reason
        }
    }

    async function repairProject(directoryName: string, resolution: ProjectRepairResolution) {
        try {
            await adapters.projects.repair(directoryName, resolution)
            await refreshProjects()
        } catch (reason) {
            projectError.value = errorMessage(reason)
            throw reason
        }
    }

    function clearProjectError() {
        projectError.value = ''
    }

    async function refreshCharacters(projectId = selectedProjectId.value, token = loadToken) {
        if (!projectId) {
            characters.value = []
            deletedCharacters.value = []
            return
        }
        charactersLoading.value = true
        characterError.value = ''
        try {
            const result = await adapters.characters.list(projectId)
            if (token !== loadToken || selectedProjectId.value !== projectId) return
            characters.value = result.characters
            deletedCharacters.value = result.deletedCharacters
        } catch (reason) {
            if (token === loadToken && selectedProjectId.value === projectId)
                characterError.value = errorMessage(reason)
            throw reason
        } finally {
            if (token === loadToken) charactersLoading.value = false
        }
    }

    async function createCharacter(input: CharacterInput) {
        const projectId = selectedProjectId.value
        if (!projectId) return
        try {
            const character = await adapters.characters.create(projectId, input)
            if (selectedProjectId.value !== projectId) return
            await refreshCharacters(projectId)
            return character
        } catch (reason) {
            characterError.value = errorMessage(reason)
            throw reason
        }
    }

    async function updateCharacter(characterId: string, input: CharacterInput) {
        const projectId = selectedProjectId.value
        if (!projectId) return
        try {
            const character = await adapters.characters.update(projectId, characterId, input)
            if (selectedProjectId.value !== projectId) return
            await refreshCharacters(projectId)
            return character
        } catch (reason) {
            characterError.value = errorMessage(reason)
            throw reason
        }
    }

    async function deleteCharacter(characterId: string) {
        const projectId = selectedProjectId.value
        if (!projectId) return
        try {
            const character = await adapters.characters.remove(projectId, characterId)
            if (selectedProjectId.value !== projectId) return
            await refreshCharacters(projectId)
            return character
        } catch (reason) {
            characterError.value = errorMessage(reason)
            throw reason
        }
    }

    async function restoreCharacter(characterId: string) {
        const projectId = selectedProjectId.value
        if (!projectId) return
        try {
            const restored = await adapters.characters.restore(projectId, characterId)
            if (selectedProjectId.value !== projectId) return
            await refreshCharacters(projectId)
            return restored
        } catch (reason) {
            characterError.value = errorMessage(reason)
            throw reason
        }
    }

    return {
        projects,
        deletedProjects,
        storageIssues,
        selectedProject,
        characters,
        deletedCharacters,
        tags: tagState.tags,
        loading,
        charactersLoading,
        projectError,
        characterError,
        tagError: tagState.tagError,
        tagState,
        load,
        createProject,
        updateProject,
        deleteProject,
        restoreProject,
        repairProject,
        clearProjectError,
        createCharacter,
        updateCharacter,
        deleteCharacter,
        createTag: tagState.createTag,
        renameTag: tagState.renameTag,
        restoreCharacter
    }
}

function errorMessage(reason: unknown): string {
    return reason instanceof Error ? reason.message : '本地项目服务暂时无法处理请求。'
}
