import { computed, ref } from 'vue'
import type { Project, ProjectInput, ProjectListResult, ProjectRepairResolution } from '../types/project'
import type { Tag, TagInput } from '../types/tag'
import type { ProjectWorkspaceAdapters } from '../types/workspace'
import { useCharacterWorkspace } from './useCharacterWorkspace'

export function useProjectWorkspace(adapters: ProjectWorkspaceAdapters) {
    const projects = ref<Project[]>([])
    const deletedProjects = ref<Project[]>([])
    const storageIssues = ref<ProjectListResult['issues']>([])
    const tags = ref<Tag[]>([])
    const selectedProjectId = ref<string | null>(null)
    const loading = ref(false)
    const projectError = ref('')
    const tagError = ref('')
    let loadToken = 0
    const characterWorkspace = useCharacterWorkspace(adapters.characters, selectedProjectId)

    const selectedProject = computed(
        () =>
            [...projects.value, ...deletedProjects.value].find((project) => project.id === selectedProjectId.value) ??
            null
    )

    async function load(projectId: string | null = null) {
        const token = ++loadToken
        selectedProjectId.value = projectId
        characterWorkspace.reset()
        tags.value = []
        loading.value = true
        projectError.value = ''
        tagError.value = ''
        try {
            await refreshProjects(token)
        } catch {
            return
        } finally {
            if (token === loadToken) loading.value = false
        }

        if (!projectId) {
            return
        }

        if (token !== loadToken) return
        await Promise.allSettled([characterWorkspace.refresh(projectId), refreshTags(projectId, token)])
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

    return {
        projects,
        deletedProjects,
        storageIssues,
        selectedProject,
        characters: characterWorkspace.characters,
        deletedCharacters: characterWorkspace.deletedCharacters,
        tags,
        loading,
        charactersLoading: characterWorkspace.loading,
        projectError,
        characterError: characterWorkspace.error,
        tagError,
        load,
        createProject,
        updateProject,
        deleteProject,
        restoreProject,
        repairProject,
        clearProjectError,
        createCharacter: characterWorkspace.create,
        updateCharacter: characterWorkspace.update,
        deleteCharacter: characterWorkspace.remove,
        createTag,
        renameTag,
        restoreCharacter: characterWorkspace.restore
    }
}

function errorMessage(reason: unknown): string {
    return reason instanceof Error ? reason.message : '本地项目服务暂时无法处理请求。'
}
