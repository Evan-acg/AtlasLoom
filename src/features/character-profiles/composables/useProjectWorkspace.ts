import type { ProjectWorkspaceAdapters } from '../types/workspace'
import { useCharacterWorkspace } from './useCharacterWorkspace'
import { useProjectState } from './useProjectState'
import { useProjectTags } from './useProjectTags'

export function useProjectWorkspace(adapters: ProjectWorkspaceAdapters) {
    const projectState = useProjectState(adapters.projects)
    const characterState = useCharacterWorkspace(adapters.characters, projectState.selectedProjectId)
    const tagState = useProjectTags(adapters.tags)
    let loadToken = 0

    async function load(projectId: string | null = null) {
        const token = ++loadToken
        characterState.reset()
        tagState.selectProject(projectId)
        await projectState.load(projectId)

        if (!projectId || token !== loadToken || projectState.error.value) return
        await Promise.allSettled([characterState.refresh(projectId), tagState.load(projectId)])
    }

    return {
        projects: projectState.projects,
        deletedProjects: projectState.deletedProjects,
        storageIssues: projectState.storageIssues,
        selectedProject: projectState.selectedProject,
        characters: characterState.characters,
        deletedCharacters: characterState.deletedCharacters,
        characterIssues: characterState.issues,
        tags: tagState.tags,
        loading: projectState.loading,
        charactersLoading: characterState.loading,
        projectError: projectState.error,
        characterError: characterState.error,
        tagError: tagState.tagError,
        tagsLoading: tagState.loading,
        tagsSaving: tagState.saving,
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
        createTag: tagState.createTag,
        renameTag: tagState.renameTag,
        restoreCharacter: characterState.restore
    }
}
