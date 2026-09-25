<script setup lang="ts">
    import { computed, ref } from 'vue'
    import { useRoute, useRouter } from 'vue-router'
    import CharacterJourney from '../components/CharacterJourney.vue'
    import ProjectDetail from '../components/ProjectDetail.vue'
    import ProjectForm from '../components/ProjectForm.vue'
    import ProjectList from '../components/ProjectList.vue'
    import type { Project, ProjectInput, ProjectRepairResolution, ProjectStorageIssue } from '../types/project'
    import type { Tag } from '../types/tag'
    import type { CharacterJourneyState, ProjectJourneyState } from '../types/workspace'

    const props = defineProps<{
        projectState: ProjectJourneyState
        characterState: CharacterJourneyState
        openProject: (project: Project) => void
        showProjectList: () => void
    }>()
    const route = useRoute()
    const router = useRouter()

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

    const projectDialogMode = ref<'create' | 'edit' | null>(null)
    const projectSaving = ref(false)
    const editingProject = ref<Project | null>(null)
    const projectFormError = ref('')
    const tagFormError = ref('')
    const editingTagId = ref('')
    const editingTagName = ref('')

    const sortedTags = computed(() => [...tags.value].sort((a, b) => a.name.localeCompare(b.name)))
    const tagDisplayError = computed(() => tagError.value || tagFormError.value)
    const selectedCharacterId = computed(() =>
        typeof route.query.character === 'string' ? route.query.character : null
    )

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
            projectFormError.value = errorMessage(reason)
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

    function openCharacter(characterId: string) {
        if (route.query.character === characterId) return
        void router.push({ query: { ...route.query, character: characterId } })
    }

    function showCharacterList() {
        void router.push({ query: { ...route.query, character: undefined } })
    }

    function startRenameTag(tag: Tag) {
        editingTagId.value = tag.id
        editingTagName.value = tag.name
        tagFormError.value = ''
    }

    function cancelRenameTag() {
        editingTagId.value = ''
        editingTagName.value = ''
        tagFormError.value = ''
    }

    async function saveTagRename() {
        if (!selectedProject.value) return
        const name = editingTagName.value.trim()
        if (!name) {
            tagFormError.value = '请填写标签名称。'
            return
        }

        tagFormError.value = ''
        try {
            await props.characterState.renameTag(editingTagId.value, { name })
            cancelRenameTag()
        } catch {
            return
        }
    }

    function errorMessage(reason: unknown): string {
        return reason instanceof Error ? reason.message : '本地项目服务暂时无法处理请求。'
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
                        :selected-character-id="selectedCharacterId"
                        :loading="charactersLoading"
                        :error="characterPageError"
                        :tags="tags"
                        :create-character="props.characterState.create"
                        :update-character="props.characterState.update"
                        :delete-character="props.characterState.remove"
                        :restore-character="props.characterState.restore"
                        :create-tag="props.characterState.createTag"
                        :tag-error="tagError"
                        @select-character="openCharacter"
                        @show-list="showCharacterList"
                    />
                    <div
                        v-if="!selectedCharacterId"
                        class="px-5 pb-7 sm:px-7 sm:pb-9"
                    >
                        <section
                            class="mt-6 rounded-lg border border-hairline p-4"
                            aria-labelledby="project-tags-title"
                        >
                            <h3
                                id="project-tags-title"
                                class="text-sm font-semibold"
                            >
                                项目标签
                            </h3>
                            <div
                                v-if="sortedTags.length"
                                class="mt-3 space-y-2"
                            >
                                <div
                                    v-for="tag in sortedTags"
                                    :key="tag.id"
                                    class="flex flex-wrap items-center gap-2 text-sm"
                                >
                                    <span class="rounded-full bg-canvas-soft px-2.5 py-1">{{ tag.name }}</span>
                                    <button
                                        class="min-h-9 rounded-md px-2 text-ink-secondary hover:bg-canvas-soft"
                                        type="button"
                                        :aria-label="`重命名标签：${tag.name}`"
                                        @click="startRenameTag(tag)"
                                    >
                                        重命名
                                    </button>
                                    <template v-if="editingTagId === tag.id">
                                        <input
                                            v-model="editingTagName"
                                            class="min-h-9 rounded border border-hairline bg-white px-2 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                                            aria-label="标签名称"
                                            maxlength="80"
                                        />
                                        <button
                                            class="min-h-9 rounded-full bg-primary px-3 text-white hover:bg-primary-active focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                                            type="button"
                                            @click="saveTagRename"
                                        >
                                            保存标签
                                        </button>
                                        <button
                                            class="min-h-9 rounded-md px-2 text-ink-secondary hover:bg-canvas-soft"
                                            type="button"
                                            @click="cancelRenameTag"
                                        >
                                            取消
                                        </button>
                                    </template>
                                </div>
                            </div>
                            <p
                                v-else
                                class="mt-2 text-sm text-ink-muted"
                            >
                                还没有项目标签。
                            </p>
                            <p
                                v-if="tagDisplayError"
                                class="mt-3 rounded-md bg-state-error-surface px-3 py-2 text-sm text-state-error"
                                role="alert"
                            >
                                {{ tagDisplayError }}
                            </p>
                        </section>
                    </div>
                </ProjectDetail>
            </template>

            <template v-else>
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
