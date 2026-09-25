import { computed, ref } from 'vue'
import type { Project, ProjectInput, ProjectRepairResolution, ProjectStorageIssue } from '../types/project'
import type { ProjectWorkspaceProjectAdapter } from '../types/workspace'

export function useProjectState(adapter: ProjectWorkspaceProjectAdapter) {
    const projects = ref<Project[]>([])
    const deletedProjects = ref<Project[]>([])
    const storageIssues = ref<ProjectStorageIssue[]>([])
    const selectedProjectId = ref<string | null>(null)
    const loading = ref(false)
    const error = ref('')
    let requestToken = 0

    const selectedProject = computed(
        () =>
            [...projects.value, ...deletedProjects.value].find((project) => project.id === selectedProjectId.value) ??
            null
    )

    async function load(projectId: string | null = null) {
        selectedProjectId.value = projectId
        await refresh()
    }

    async function refresh() {
        const token = ++requestToken
        loading.value = true
        error.value = ''
        try {
            const result = await adapter.list()
            if (token !== requestToken) return
            projects.value = result.projects
            deletedProjects.value = result.deletedProjects
            storageIssues.value = result.issues
        } catch (reason) {
            if (token === requestToken) error.value = errorMessage(reason)
        } finally {
            if (token === requestToken) loading.value = false
        }
    }

    async function create(input: ProjectInput) {
        try {
            const project = await adapter.create(input)
            await refresh()
            return project
        } catch (reason) {
            error.value = errorMessage(reason)
            throw reason
        }
    }

    async function update(id: string, input: ProjectInput) {
        try {
            const project = await adapter.update(id, input)
            await refresh()
            return project
        } catch (reason) {
            error.value = errorMessage(reason)
            throw reason
        }
    }

    async function remove(id: string) {
        try {
            const project = await adapter.remove(id)
            await refresh()
            return project
        } catch (reason) {
            error.value = errorMessage(reason)
            throw reason
        }
    }

    async function restore(id: string) {
        try {
            const project = await adapter.restore(id)
            await refresh()
            return project
        } catch (reason) {
            error.value = errorMessage(reason)
            throw reason
        }
    }

    async function repair(directoryName: string, resolution: ProjectRepairResolution) {
        try {
            await adapter.repair(directoryName, resolution)
            await refresh()
        } catch (reason) {
            error.value = errorMessage(reason)
            throw reason
        }
    }

    function clearError() {
        error.value = ''
    }

    return {
        projects,
        deletedProjects,
        storageIssues,
        selectedProjectId,
        selectedProject,
        loading,
        error,
        load,
        refresh,
        create,
        update,
        remove,
        restore,
        repair,
        clearError
    }
}

function errorMessage(reason: unknown): string {
    return reason instanceof Error ? reason.message : '本地项目服务暂时无法处理请求。'
}
