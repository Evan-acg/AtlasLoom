<script setup lang="ts">
    import { computed, onMounted, onUnmounted, watch } from 'vue'
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
        load: workspace.load,
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
    const isArchivedProject = computed(() => {
        return Boolean(
            selectedProjectId.value &&
            workspace.deletedProjects.value.some((project) => project.id === selectedProjectId.value)
        )
    })

    onMounted(() => {
        globalThis.addEventListener('atlasloom:data-changed', refreshProjectState)
        void workspace.load(selectedProjectId.value)
    })
    onUnmounted(() => globalThis.removeEventListener('atlasloom:data-changed', refreshProjectState))
    watch(selectedProjectId, (projectId) => void workspace.load(projectId))

    function refreshProjectState() {
        void workspace.load(selectedProjectId.value)
    }

    function openProject(project: Project) {
        if (route.query.project === project.id) return
        void router.push({ query: { ...route.query, project: project.id, character: undefined } })
    }

    function showProjectList() {
        if (route.query.project === undefined) return
        void router.push({ query: { ...route.query, project: undefined, character: undefined } })
    }
</script>

<template>
    <SoftDeleteControls />
    <ArchivedProjectView v-if="isArchivedProject" />
    <ProjectWorkspaceContent
        v-else
        :project-state="projectJourney"
        :character-state="characterJourney"
        :open-project="openProject"
        :show-project-list="showProjectList"
    />
</template>
