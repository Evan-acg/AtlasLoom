<script setup lang="ts">
    import { ref } from 'vue'
    import BackupManager from '../components/BackupManager.vue'
    import CharacterJourney from '../components/CharacterJourney.vue'
    import ProjectDetail from '../components/ProjectDetail.vue'
    import ProjectForm from '../components/ProjectForm.vue'
    import ProjectList from '../components/ProjectList.vue'
    import ProjectTagManager from '../components/ProjectTagManager.vue'
    import type { Project, ProjectInput, ProjectRepairResolution, ProjectStorageIssue } from '../types/project'
    import type { CharacterJourneyState, ProjectJourneyState } from '../types/workspace'
    import { getCharacterProfilesErrorMessage } from '../utils/error-message'

    const props = defineProps<{
        projectState: ProjectJourneyState
        characterState: CharacterJourneyState
        selectedCharacterId: string | null
        exportBackup: () => Promise<unknown>
        previewBackup: (backup: unknown, mode: 'merge' | 'replace') => Promise<import('../types/backup').BackupPreview>
        applyBackup: (
            backup: import('../types/backup').ProjectBackup,
            mode: 'merge' | 'replace',
            decisions: import('../types/backup').BackupDecisions
        ) => Promise<void>
        listBackupArchives: () => Promise<import('../types/backup').BackupArchive[]>
        restoreBackupArchive: (id: string) => Promise<void>
        openProject: (project: Project) => void
        showProjectList: () => void
        openCharacter: (characterId: string) => void
        showCharacterList: () => void
    }>()
    const projects = props.projectState.projects
    const storageIssues = props.projectState.storageIssues
    const loading = props.projectState.loading
    const pageError = props.projectState.error
    const selectedProject = props.projectState.selectedProject
    const characters = props.characterState.characters
    const deletedCharacters = props.characterState.deletedCharacters
    const charactersLoading = props.characterState.charactersLoading
    const characterPageError = props.characterState.error
    const tags = props.characterState.tags
    const tagError = props.characterState.tagError
    const tagsLoading = props.characterState.tagsLoading
    const tagsSaving = props.characterState.tagsSaving

    const projectDialogMode = ref<'create' | 'edit' | null>(null)
    const projectSaving = ref(false)
    const editingProject = ref<Project | null>(null)
    const projectFormError = ref('')
    async function loadProjects() {
        await props.projectState.refresh()
    }

    function openCreateDialog() {
        props.projectState.clearError()
        projectDialogMode.value = 'create'
        editingProject.value = null
        projectFormError.value = ''
    }

    function openEditDialog(project: Project) {
        props.projectState.clearError()
        projectDialogMode.value = 'edit'
        editingProject.value = project
        projectFormError.value = ''
    }

    function closeDialog() {
        if (projectSaving.value) return
        props.projectState.clearError()
        projectDialogMode.value = null
        editingProject.value = null
        projectFormError.value = ''
    }

    async function saveProject(input: ProjectInput) {
        projectSaving.value = true
        projectFormError.value = ''
        try {
            if (projectDialogMode.value === 'edit' && editingProject.value) {
                await props.projectState.update(editingProject.value.id, input)
            } else {
                await props.projectState.create(input)
            }
            projectDialogMode.value = null
            editingProject.value = null
            props.projectState.clearError()
        } catch (reason) {
            projectFormError.value = getCharacterProfilesErrorMessage(reason)
        } finally {
            projectSaving.value = false
        }
    }

    async function softDeleteProject(project: Project) {
        const confirmed = globalThis.confirm(`项目“${project.name}”及其角色将从正常浏览中隐藏。是否继续？`)
        if (!confirmed) return
        try {
            await props.projectState.remove(project.id)
        } catch {
            return
        }
    }

    async function restoreProject(project: Project) {
        try {
            await props.projectState.restore(project.id)
        } catch {
            return
        }
    }

    async function repairStorageIssue(issue: ProjectStorageIssue, resolution: ProjectRepairResolution) {
        try {
            await props.projectState.repair(issue.directoryName, resolution)
        } catch {
            return
        }
    }

    async function handleProjectRepair(issue: ProjectStorageIssue, resolution: ProjectRepairResolution) {
        if (resolution === 'restore-backup') {
            await restoreBackup(issue)
            return
        }
        await repairStorageIssue(issue, resolution)
    }

    async function restoreBackup(issue: ProjectStorageIssue) {
        const confirmed = globalThis.confirm(
            `将使用“${issue.directoryName}”中保存的有效备份替换当前损坏数据。是否继续？`
        )
        if (!confirmed) return
        await repairStorageIssue(issue, 'restore-backup')
    }
</script>

<template>
    <main class="min-h-screen min-w-[320px] bg-canvas-soft px-4 py-7 text-ink sm:px-6 sm:py-10">
        <div class="mx-auto max-w-[1200px]">
            <template v-if="selectedProject">
                <ProjectDetail
                    :project="selectedProject"
                    @back="props.showProjectList"
                    @edit="openEditDialog(selectedProject)"
                    @remove="softDeleteProject(selectedProject)"
                    @restore="restoreProject(selectedProject)"
                >
                    <CharacterJourney
                        :key="selectedProject.id"
                        :project="selectedProject"
                        :characters="characters"
                        :deleted-characters="deletedCharacters"
                        :selected-character-id="props.selectedCharacterId"
                        :loading="charactersLoading"
                        :error="characterPageError"
                        :tags="tags"
                        :tags-loading="tagsLoading"
                        :tags-saving="tagsSaving"
                        :create-character="props.characterState.create"
                        :update-character="props.characterState.update"
                        :delete-character="props.characterState.remove"
                        :restore-character="props.characterState.restore"
                        :create-tag="props.characterState.createTag"
                        :tag-error="tagError"
                        @select-character="props.openCharacter"
                        @show-list="props.showCharacterList"
                    />
                    <ProjectTagManager
                        v-if="!props.selectedCharacterId"
                        :tags="tags"
                        :error="tagError"
                        :loading="tagsLoading"
                        :saving="tagsSaving"
                        :rename-tag="props.characterState.renameTag"
                    />
                </ProjectDetail>
            </template>

            <template v-else>
                <BackupManager
                    :export-backup="props.exportBackup"
                    :preview-backup="props.previewBackup"
                    :apply-backup="props.applyBackup"
                    :list-backup-archives="props.listBackupArchives"
                    :restore-backup-archive="props.restoreBackupArchive"
                    :refresh="props.projectState.refresh"
                />
                <ProjectList
                    :projects="projects"
                    :storage-issues="storageIssues"
                    :loading="loading"
                    :error="pageError"
                    :form-open="Boolean(projectDialogMode)"
                    @create="openCreateDialog"
                    @edit="openEditDialog"
                    @open="props.openProject"
                    @refresh="loadProjects"
                    @repair="handleProjectRepair"
                />
            </template>
        </div>

        <ProjectForm
            v-if="projectDialogMode"
            :mode="projectDialogMode"
            :project="editingProject"
            :saving="projectSaving"
            :error="projectFormError"
            @close="closeDialog"
            @submit="saveProject"
        />
    </main>
</template>
