<script setup lang="ts">
    import { computed, onMounted, watch } from 'vue'
    import { useRoute, useRouter } from 'vue-router'
    import {
        createCharacter,
        deleteCharacter,
        listCharacters,
        restoreCharacter,
        updateCharacter
    } from '../api/characters'
    import {
        createProject,
        deleteProject,
        listProjects,
        repairProject,
        restoreProject,
        updateProject
    } from '../api/projects'
    import { createTag, listTags, renameTag } from '../api/tags'
    import ArchivedProjectView from './ArchivedProjectView.vue'
    import ProjectWorkspaceContent from './ProjectWorkspaceContent.vue'
    import SoftDeleteControls from '../components/SoftDeleteControls.vue'
    import { useProjectWorkspace } from '../composables/useProjectWorkspace'
    import type { Project } from '../types/project'
    import type { CharacterJourneyState, ProjectJourneyState } from '../types/workspace'

    const route = useRoute()
    const router = useRouter()
    const workspace = useProjectWorkspace({
        projects: {
            list: listProjects,
            create: createProject,
            update: updateProject,
            remove: deleteProject,
            restore: restoreProject,
            repair: repairProject
        },
        characters: {
            list: listCharacters,
            create: createCharacter,
            update: updateCharacter,
            remove: deleteCharacter,
            restore: restoreCharacter
        },
        tags: { list: listTags, create: createTag, rename: renameTag }
    })
    const projectJourney: ProjectJourneyState = {
        projects: workspace.projects,
        deletedProjects: workspace.deletedProjects,
        storageIssues: workspace.storageIssues,
        selectedProject: workspace.selectedProject,
        loading: workspace.loading,
        error: workspace.projectError,
        refresh: workspace.refreshProjects,
        create: workspace.createProject,
        update: workspace.updateProject,
        remove: workspace.deleteProject,
        restore: workspace.restoreProject,
        repair: workspace.repairProject,
        clearError: workspace.clearProjectError
    }
    const characterJourney: CharacterJourneyState = {
        characters: workspace.characters,
        deletedCharacters: workspace.deletedCharacters,
        charactersLoading: workspace.charactersLoading,
        error: workspace.characterError,
        tags: workspace.tags,
        tagError: workspace.tagError,
        create: workspace.createCharacter,
        update: workspace.updateCharacter,
        remove: workspace.deleteCharacter,
        restore: workspace.restoreCharacter,
        createTag: workspace.createTag,
        renameTag: workspace.renameTag
    }
    const selectedProjectId = computed(() => (typeof route.query.project === 'string' ? route.query.project : null))
    const selectedCharacterId = computed(() =>
        typeof route.query.character === 'string' ? route.query.character : null
    )
    const isArchivedProject = computed(() => {
        return Boolean(
            selectedProjectId.value &&
            workspace.deletedProjects.value.some((project) => project.id === selectedProjectId.value)
        )
    })

    onMounted(() => void workspace.load(selectedProjectId.value))
    watch(selectedProjectId, (projectId) => void workspace.load(projectId))

    function openProject(project: Project) {
        if (route.query.project === project.id) return
        void router.push({ query: { ...route.query, project: project.id, character: undefined } })
    }

    function showProjectList() {
        if (route.query.project === undefined) return
        void router.push({ query: { ...route.query, project: undefined, character: undefined } })
    }

    function openCharacter(characterId: string) {
        if (route.query.character === characterId) return
        void router.push({ query: { ...route.query, character: characterId } })
    }

    function showCharacterList() {
        if (route.query.character === undefined) return
        void router.push({ query: { ...route.query, character: undefined } })
    }
</script>

<template>
    <SoftDeleteControls
        :deleted-projects="workspace.deletedProjects.value"
        :selected-project="workspace.selectedProject.value"
        :deleted-characters="workspace.deletedCharacters.value"
        :selected-character-id="selectedCharacterId"
        @restore-project="workspace.restoreProject"
        @restore-character="workspace.restoreCharacter"
        @open-project="openProject"
    />
    <ArchivedProjectView
        v-if="isArchivedProject"
        :project="workspace.selectedProject.value"
        :characters="workspace.characters.value"
        :deleted-characters="workspace.deletedCharacters.value"
        :loading="workspace.loading.value || workspace.charactersLoading.value"
        :error="workspace.projectError.value || workspace.characterError.value"
        :show-project-list="showProjectList"
        @restore-project="workspace.restoreProject"
        @restore-character="workspace.restoreCharacter"
    />
    <ProjectWorkspaceContent
        v-else
        :project-state="projectJourney"
        :character-state="characterJourney"
        :selected-character-id="selectedCharacterId"
        :open-project="openProject"
        :show-project-list="showProjectList"
        :open-character="openCharacter"
        :show-character-list="showCharacterList"
    />
</template>
