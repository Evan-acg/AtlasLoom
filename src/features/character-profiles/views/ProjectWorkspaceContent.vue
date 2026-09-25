<script setup lang="ts">
    import { computed, ref } from 'vue'
    import { useRoute, useRouter } from 'vue-router'
    import type { Project, ProjectInput, ProjectRepairResolution, ProjectStorageIssue } from '../types/project'
    import type { Tag } from '../types/tag'
    import { useProjectWorkspace } from '../composables/useProjectWorkspace'
    import CharacterJourney from '../components/CharacterJourney.vue'

    const props = defineProps<{
        workspace: ReturnType<typeof useProjectWorkspace>
        openProject: (project: Project) => void
        showProjectList: () => void
    }>()
    const openProject = props.openProject
    const showProjectList = props.showProjectList
    const projects = props.workspace.projects
    const storageIssues = props.workspace.storageIssues
    const loading = props.workspace.loading
    const pageError = props.workspace.projectError
    const selectedProject = props.workspace.selectedProject
    const characters = props.workspace.characters
    const deletedCharacters = props.workspace.deletedCharacters
    const charactersLoading = props.workspace.charactersLoading
    const characterPageError = props.workspace.characterError
    const tags = props.workspace.tags
    const tagError = props.workspace.tagError

    const saving = ref(false)
    const formError = ref('')
    const tagFormError = ref('')
    const editingTagId = ref('')
    const editingTagName = ref('')
    const dialogMode = ref<'create' | 'edit' | null>(null)
    const projectName = ref('')
    const projectDescription = ref('')
    const editingProjectId = ref('')
    const route = useRoute()
    const router = useRouter()

    const sortedProjects = computed(() => [...projects.value].sort((a, b) => a.name.localeCompare(b.name)))
    const dialogTitle = computed(() => (dialogMode.value === 'edit' ? '编辑项目' : '新建项目'))
    const selectedProjectIsDeleted = computed(() => Boolean(selectedProject.value?.deletedAt))
    const sortedTags = computed(() => [...tags.value].sort((a, b) => a.name.localeCompare(b.name)))
    const tagDisplayError = computed(() => tagError.value || tagFormError.value)
    const selectedCharacterId = computed(() =>
        typeof route.query.character === 'string' ? route.query.character : null
    )
    const selectedCharacter = computed(
        () =>
            [...characters.value, ...deletedCharacters.value].find(
                (character) => character.id === selectedCharacterId.value
            ) ?? null
    )

    async function loadProjects() {
        await props.workspace.load(typeof route.query.project === 'string' ? route.query.project : null)
    }

    function openCreateDialog() {
        props.workspace.clearProjectError()
        dialogMode.value = 'create'
        projectName.value = ''
        projectDescription.value = ''
        editingProjectId.value = ''
        formError.value = ''
    }

    function openEditDialog(project: Project) {
        props.workspace.clearProjectError()
        dialogMode.value = 'edit'
        projectName.value = project.name
        projectDescription.value = project.description
        editingProjectId.value = project.id
        formError.value = ''
    }

    function closeDialog() {
        if (saving.value) return
        props.workspace.clearProjectError()
        dialogMode.value = null
        formError.value = ''
    }

    async function saveProject() {
        const input: ProjectInput = {
            name: projectName.value.trim(),
            description: projectDescription.value.trim()
        }
        if (!input.name) {
            formError.value = '请填写项目名称。'
            return
        }

        saving.value = true
        formError.value = ''
        try {
            if (dialogMode.value === 'edit') await props.workspace.updateProject(editingProjectId.value, input)
            else await props.workspace.createProject(input)
            dialogMode.value = null
        } catch (error) {
            formError.value = errorMessage(error)
        } finally {
            saving.value = false
        }
    }

    async function softDeleteProject(project: Project) {
        const confirmed = globalThis.confirm(`项目“${project.name}”及其角色将从正常浏览中隐藏。是否继续？`)
        if (!confirmed) return
        try {
            await props.workspace.deleteProject(project.id)
        } catch {
            return
        }
    }

    async function restoreProject(project: Project) {
        try {
            await props.workspace.restoreProject(project.id)
        } catch {
            return
        }
    }

    async function repairStorageIssue(issue: ProjectStorageIssue, resolution: ProjectRepairResolution) {
        try {
            await props.workspace.repairProject(issue.directoryName, resolution)
        } catch {
            return
        }
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
        const query = { ...route.query, character: undefined }
        void router.push({ query })
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
            await props.workspace.renameTag(editingTagId.value, { name })
            cancelRenameTag()
        } catch {
            return
        }
    }

    function errorMessage(error: unknown): string {
        return error instanceof Error ? error.message : '本地项目服务暂时无法处理请求。'
    }
</script>

<template>
    <main class="min-h-screen min-w-[320px] bg-canvas-soft px-4 py-7 text-ink sm:px-6 sm:py-10">
        <div class="mx-auto max-w-[1200px]">
            <template v-if="selectedProject">
                <template v-if="selectedCharacter">
                    <CharacterJourney
                        :key="selectedProject.id"
                        :project="selectedProject"
                        :characters="characters"
                        :deleted-characters="deletedCharacters"
                        :selected-character-id="selectedCharacterId"
                        :loading="charactersLoading"
                        :error="characterPageError"
                        :tags="tags"
                        :create-character="props.workspace.createCharacter"
                        :update-character="props.workspace.updateCharacter"
                        :delete-character="props.workspace.deleteCharacter"
                        :restore-character="props.workspace.restoreCharacter"
                        :create-tag="props.workspace.createTag"
                        :tag-error="tagError"
                        @select-character="openCharacter"
                        @show-list="showCharacterList"
                    />
                </template>
                <template v-else>
                    <button
                        class="mb-5 inline-flex min-h-11 items-center gap-2 rounded-md px-2 text-sm font-medium text-ink-secondary hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                        type="button"
                        @click="showProjectList"
                    >
                        <span aria-hidden="true">←</span>
                        全部项目
                    </button>

                    <section class="overflow-hidden rounded-xl border border-hairline bg-surface">
                        <header
                            class="flex flex-col gap-4 border-b border-hairline px-5 py-5 sm:flex-row sm:items-start sm:justify-between sm:px-7 sm:py-6"
                        >
                            <div class="min-w-0">
                                <p class="mb-2 text-xs font-semibold uppercase tracking-widest text-ink-muted">
                                    创作项目
                                </p>
                                <h1 class="break-words text-2xl font-semibold tracking-tight sm:text-3xl">
                                    {{ selectedProject.name }}
                                </h1>
                                <p class="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink-secondary">
                                    {{ selectedProject.description || '暂无项目简介。' }}
                                </p>
                                <p
                                    v-if="selectedProjectIsDeleted"
                                    class="mt-2 text-sm font-medium text-state-warning"
                                >
                                    项目已删除
                                </p>
                            </div>
                            <div class="flex shrink-0 flex-wrap gap-2">
                                <button
                                    v-if="!selectedProjectIsDeleted"
                                    class="min-h-11 rounded-full border border-hairline bg-surface px-4 text-sm font-semibold hover:bg-canvas-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                                    type="button"
                                    :aria-label="`编辑项目：${selectedProject.name}`"
                                    @click="openEditDialog(selectedProject)"
                                >
                                    编辑项目
                                </button>
                                <button
                                    v-if="!selectedProjectIsDeleted"
                                    class="min-h-11 rounded-full border border-state-error-border px-4 text-sm font-semibold text-state-error hover:bg-state-error-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                                    type="button"
                                    @click="softDeleteProject(selectedProject)"
                                >
                                    删除项目
                                </button>
                                <button
                                    v-else
                                    class="min-h-11 rounded-full bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-active focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                                    type="button"
                                    @click="restoreProject(selectedProject)"
                                >
                                    恢复项目
                                </button>
                            </div>
                        </header>
                        <CharacterJourney
                            :key="selectedProject.id"
                            :project="selectedProject"
                            :characters="characters"
                            :deleted-characters="deletedCharacters"
                            :selected-character-id="selectedCharacterId"
                            :loading="charactersLoading"
                            :error="characterPageError"
                            :tags="tags"
                            :create-character="props.workspace.createCharacter"
                            :update-character="props.workspace.updateCharacter"
                            :delete-character="props.workspace.deleteCharacter"
                            :restore-character="props.workspace.restoreCharacter"
                            :create-tag="props.workspace.createTag"
                            :tag-error="tagError"
                            @select-character="openCharacter"
                            @show-list="showCharacterList"
                        />
                        <div class="px-5 pb-7 sm:px-7 sm:pb-9">
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
                    </section>
                </template>
            </template>

            <template v-else>
                <header class="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p class="mb-2 text-xs font-semibold uppercase tracking-widest text-ink-muted">AtlasLoom</p>
                        <h1 class="text-3xl font-semibold tracking-tight sm:text-4xl">创作项目</h1>
                        <p class="mt-2 max-w-xl text-sm leading-6 text-ink-secondary">
                            按创作项目整理角色档案。每个项目及其简介保存在本机。
                        </p>
                    </div>
                    <button
                        class="min-h-11 shrink-0 rounded-full bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-active active:bg-primary-active focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                        type="button"
                        @click="openCreateDialog"
                    >
                        ＋ 新建项目
                    </button>
                </header>

                <p
                    v-if="pageError && !dialogMode"
                    class="mb-4 rounded-lg border border-state-error-border bg-state-error-surface px-4 py-3 text-sm text-state-error"
                    role="alert"
                >
                    {{ pageError }}
                </p>

                <section
                    v-if="storageIssues.length"
                    class="mb-4 rounded-lg border border-state-warning-border bg-white px-4 py-4 text-sm text-ink-secondary"
                    aria-labelledby="storage-issues-title"
                    role="status"
                >
                    <h2
                        id="storage-issues-title"
                        class="font-semibold text-ink"
                    >
                        部分项目数据需要检查
                    </h2>
                    <ul class="mt-2 list-disc space-y-1 pl-5">
                        <li
                            v-for="issue in storageIssues"
                            :key="issue.directoryName"
                            class="space-y-2"
                        >
                            <p>
                                {{ issue.message }}
                                <span v-if="issue.backupAvailable">检测到有效的上一份备份。</span>
                            </p>
                            <div class="flex flex-wrap gap-2">
                                <template v-if="issue.projectId && issue.metadataName">
                                    <button
                                        class="min-h-11 rounded-md border border-hairline px-3 text-xs font-medium hover:bg-canvas-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                                        type="button"
                                        @click="repairStorageIssue(issue, 'metadata-name')"
                                    >
                                        按项目名恢复目录
                                    </button>
                                    <button
                                        class="min-h-11 rounded-md border border-hairline px-3 text-xs font-medium hover:bg-canvas-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                                        type="button"
                                        @click="repairStorageIssue(issue, 'directory-name')"
                                    >
                                        使用目录名
                                    </button>
                                </template>
                                <button
                                    v-else-if="issue.backupAvailable"
                                    class="min-h-11 rounded-md border border-hairline px-3 text-xs font-medium hover:bg-canvas-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                                    type="button"
                                    @click="restoreBackup(issue)"
                                >
                                    恢复有效备份
                                </button>
                            </div>
                        </li>
                    </ul>
                    <p class="mt-2">这些项目不会被自动改写，其他可用项目仍可继续管理。</p>
                </section>

                <section
                    class="overflow-hidden rounded-xl border border-hairline bg-surface"
                    aria-labelledby="project-list-title"
                >
                    <div class="flex items-center justify-between border-b border-hairline px-4 py-4 sm:px-6">
                        <div>
                            <h2
                                id="project-list-title"
                                class="text-lg font-semibold"
                            >
                                全部项目
                            </h2>
                            <p class="mt-1 text-sm text-ink-muted">{{ sortedProjects.length }} 个项目</p>
                        </div>
                        <button
                            class="min-h-11 rounded-md border border-hairline px-3 text-sm font-medium hover:bg-canvas-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:hidden"
                            type="button"
                            aria-label="刷新项目列表"
                            :disabled="loading"
                            @click="loadProjects"
                        >
                            刷新
                        </button>
                    </div>

                    <p
                        v-if="loading"
                        class="px-5 py-8 text-center text-sm text-ink-muted"
                        role="status"
                    >
                        正在读取本地项目…
                    </p>
                    <p
                        v-else-if="pageError && !dialogMode"
                        class="px-5 py-8 text-center text-sm text-ink-muted"
                    >
                        连接本地项目服务失败，请检查服务后刷新。
                    </p>
                    <div
                        v-else-if="sortedProjects.length"
                        class="overflow-x-auto"
                    >
                        <table class="w-full border-collapse text-left">
                            <thead class="border-b border-hairline bg-canvas-soft text-xs font-medium text-ink-muted">
                                <tr>
                                    <th
                                        class="px-4 py-3 font-medium sm:px-6"
                                        scope="col"
                                    >
                                        项目
                                    </th>
                                    <th
                                        class="w-32 px-4 py-3 text-right font-medium sm:px-6"
                                        scope="col"
                                    >
                                        操作
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr
                                    v-for="project in sortedProjects"
                                    :key="project.id"
                                    class="border-b border-hairline last:border-b-0"
                                >
                                    <th
                                        class="max-w-0 px-4 py-4 text-left font-normal sm:px-6"
                                        scope="row"
                                    >
                                        <button
                                            class="inline-flex min-h-11 max-w-full items-center truncate text-left text-base font-semibold text-ink hover:text-primary focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                                            type="button"
                                            @click="openProject(project)"
                                        >
                                            {{ project.name }}
                                        </button>
                                        <p
                                            class="mt-1 line-clamp-2 whitespace-pre-wrap text-sm leading-5 text-ink-muted"
                                        >
                                            {{ project.description || '暂无简介' }}
                                        </p>
                                    </th>
                                    <td class="whitespace-nowrap px-3 py-4 text-right sm:px-5">
                                        <div class="flex justify-end gap-1 sm:gap-2">
                                            <button
                                                class="min-h-11 rounded-md px-2 text-sm font-medium text-ink-secondary hover:bg-canvas-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:px-3"
                                                type="button"
                                                :aria-label="`编辑 ${project.name}`"
                                                @click="openEditDialog(project)"
                                            >
                                                编辑
                                            </button>
                                            <button
                                                class="min-h-11 rounded-md px-2 text-sm font-semibold text-primary hover:bg-canvas-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:px-3"
                                                type="button"
                                                :aria-label="`打开 ${project.name}`"
                                                @click="openProject(project)"
                                            >
                                                打开
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <div
                        v-else
                        class="px-5 py-10 text-center sm:py-14"
                    >
                        <h3 class="text-base font-semibold">还没有创作项目</h3>
                        <p class="mx-auto mt-2 max-w-md text-sm leading-6 text-ink-muted">
                            创建一个项目，为之后的角色档案建立清晰的归属。
                        </p>
                        <button
                            class="mt-5 min-h-11 rounded-full bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-active active:bg-primary-active focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                            type="button"
                            @click="openCreateDialog"
                        >
                            新建项目
                        </button>
                    </div>
                </section>
            </template>
        </div>

        <div
            v-if="dialogMode"
            class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4"
            role="presentation"
            tabindex="-1"
            @click.self="closeDialog"
            @keydown.esc="closeDialog"
        >
            <section
                class="my-auto w-full max-w-lg rounded-xl border border-hairline bg-surface p-5 shadow-lg sm:p-7"
                role="dialog"
                aria-modal="true"
                aria-labelledby="project-dialog-title"
            >
                <h2
                    id="project-dialog-title"
                    class="text-xl font-semibold"
                >
                    {{ dialogTitle }}
                </h2>
                <p class="mt-1 text-sm text-ink-muted">项目名称在本机所有项目中必须唯一。</p>
                <form
                    class="mt-6 space-y-5"
                    @submit.prevent="saveProject"
                >
                    <div>
                        <label
                            class="mb-2 block text-sm font-medium"
                            for="project-name"
                        >
                            项目名称
                        </label>
                        <input
                            id="project-name"
                            v-model="projectName"
                            class="min-h-11 w-full rounded border border-hairline bg-white px-3 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                            name="project-name"
                            maxlength="180"
                            required
                            autocomplete="off"
                        />
                    </div>
                    <div>
                        <label
                            class="mb-2 block text-sm font-medium"
                            for="project-description"
                        >
                            项目简介
                        </label>
                        <textarea
                            id="project-description"
                            v-model="projectDescription"
                            class="min-h-28 w-full resize-y rounded border border-hairline bg-white px-3 py-2 text-base leading-6 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                            name="project-description"
                            rows="4"
                        />
                    </div>
                    <p
                        v-if="formError"
                        class="rounded-md bg-state-error-surface px-3 py-2 text-sm text-state-error"
                        role="alert"
                    >
                        {{ formError }}
                    </p>
                    <div class="flex flex-col-reverse justify-end gap-2 border-t border-hairline pt-4 sm:flex-row">
                        <button
                            class="min-h-11 rounded-full border border-hairline px-4 text-sm font-medium hover:bg-canvas-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                            type="button"
                            :disabled="saving"
                            @click="closeDialog"
                        >
                            取消
                        </button>
                        <button
                            class="min-h-11 rounded-full bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-active active:bg-primary-active focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-wait disabled:opacity-60"
                            type="submit"
                            :disabled="saving"
                        >
                            {{ saving ? '保存中…' : dialogMode === 'edit' ? '保存修改' : '创建项目' }}
                        </button>
                    </div>
                </form>
            </section>
        </div>
    </main>
</template>
