import { computed, ref } from 'vue'
import type { Character, CharacterInput } from '../types/character'
import type { Project, ProjectInput, ProjectListResult, ProjectRepairResolution } from '../types/project'
import type { Tag, TagInput } from '../types/tag'
import type { ProjectWorkspaceAdapters } from '../types/workspace'

export function useProjectWorkspace(adapters: ProjectWorkspaceAdapters) {
    const projects = ref<Project[]>([])
    const deletedProjects = ref<Project[]>([])
    const storageIssues = ref<ProjectListResult['issues']>([])
    const characters = ref<Character[]>([])
    const deletedCharacters = ref<Character[]>([])
    const tags = ref<Tag[]>([])
    const selectedProjectId = ref<string | null>(null)
    const loading = ref(false)
    const charactersLoading = ref(false)
    const projectError = ref('')
    const characterError = ref('')
    const tagError = ref('')
    let loadToken = 0

    const selectedProject = computed(
        () =>
            [...projects.value, ...deletedProjects.value].find((project) => project.id === selectedProjectId.value) ??
            null
    )

    async function load(projectId: string | null = null) {
        const token = ++loadToken
        selectedProjectId.value = projectId
        characters.value = []
        deletedCharacters.value = []
        tags.value = []
        loading.value = true
        charactersLoading.value = false
        projectError.value = ''
        characterError.value = ''
        tagError.value = ''
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
        await Promise.allSettled([refreshCharacters(projectId, token), refreshTags(projectId, token)])
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

    async function refreshTags(projectId = selectedProjectId.value, token = loadToken) {
        if (!projectId) {
            tags.value = []
            return
        }
        tagError.value = ''
        try {
            const result = await adapters.tags.list(projectId)
            if (token !== loadToken || selectedProjectId.value !== projectId) return
            tags.value = result.tags
        } catch (reason) {
            if (token === loadToken && selectedProjectId.value === projectId) tagError.value = errorMessage(reason)
            throw reason
        }
    }

    async function createTag(input: TagInput) {
        const projectId = selectedProjectId.value
        if (!projectId) return
        try {
            const tag = await adapters.tags.create(projectId, input)
            if (selectedProjectId.value !== projectId) return
            await refreshTags(projectId)
            return tag
        } catch (reason) {
            tagError.value = errorMessage(reason)
            throw reason
        }
    }

    async function renameTag(tagId: string, input: TagInput) {
        const projectId = selectedProjectId.value
        if (!projectId) return
        try {
            const tag = await adapters.tags.rename(projectId, tagId, input)
            if (selectedProjectId.value !== projectId) return
            await refreshTags(projectId)
            return tag
        } catch (reason) {
            tagError.value = errorMessage(reason)
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
        tags,
        loading,
        charactersLoading,
        projectError,
        characterError,
        tagError,
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
        createTag,
        renameTag,
        restoreCharacter
    }
}

function errorMessage(reason: unknown): string {
    return reason instanceof Error ? reason.message : '本地项目服务暂时无法处理请求。'
}
