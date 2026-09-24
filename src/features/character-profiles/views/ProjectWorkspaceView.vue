<script setup lang="ts">
    import { computed, onMounted, ref, watch } from 'vue'
    import { useRoute, useRouter } from 'vue-router'
    import { createProject, listProjects, repairProject as repairProjectStorage, updateProject } from '../api/projects'
    import type { Project, ProjectInput, ProjectRepairResolution, ProjectStorageIssue } from '../types/project'

    const projects = ref<Project[]>([])
    const storageIssues = ref<ProjectStorageIssue[]>([])
    const loading = ref(true)
    const saving = ref(false)
    const pageError = ref('')
    const formError = ref('')
    const selectedProject = ref<Project | null>(null)
    const dialogMode = ref<'create' | 'edit' | null>(null)
    const projectName = ref('')
    const projectDescription = ref('')
    const editingProjectId = ref('')
    const route = useRoute()
    const router = useRouter()

    const sortedProjects = computed(() => [...projects.value].sort((a, b) => a.name.localeCompare(b.name)))
    const dialogTitle = computed(() => (dialogMode.value === 'edit' ? '编辑项目' : '新建项目'))

    watch(() => route.query.project, syncSelectedProject)
    onMounted(loadProjects)

    async function loadProjects() {
        loading.value = true
        pageError.value = ''
        try {
            const result = await listProjects()
            projects.value = result.projects
            storageIssues.value = result.issues
            syncSelectedProject()
        } catch (error) {
            pageError.value = errorMessage(error)
        } finally {
            loading.value = false
        }
    }

    function openCreateDialog() {
        dialogMode.value = 'create'
        projectName.value = ''
        projectDescription.value = ''
        editingProjectId.value = ''
        formError.value = ''
    }

    function openEditDialog(project: Project) {
        dialogMode.value = 'edit'
        projectName.value = project.name
        projectDescription.value = project.description
        editingProjectId.value = project.id
        formError.value = ''
    }

    function closeDialog() {
        if (saving.value) return
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
            const project =
                dialogMode.value === 'edit'
                    ? await updateProject(editingProjectId.value, input)
                    : await createProject(input)
            if (dialogMode.value === 'edit') {
                projects.value = projects.value.map((item) => (item.id === project.id ? project : item))
                if (selectedProject.value?.id === project.id) selectedProject.value = project
            } else {
                projects.value = [...projects.value, project]
            }
            dialogMode.value = null
        } catch (error) {
            formError.value = errorMessage(error)
        } finally {
            saving.value = false
        }
    }

    async function repairStorageIssue(issue: ProjectStorageIssue, resolution: ProjectRepairResolution) {
        pageError.value = ''
        try {
            await repairProjectStorage(issue.directoryName, resolution)
            await loadProjects()
        } catch (error) {
            pageError.value = errorMessage(error)
        }
    }

    async function restoreBackup(issue: ProjectStorageIssue) {
        const confirmed = globalThis.confirm(
            `将使用“${issue.directoryName}”中保存的有效备份替换当前损坏数据。是否继续？`
        )
        if (!confirmed) return
        await repairStorageIssue(issue, 'restore-backup')
    }

    function openProject(project: Project) {
        if (route.query.project === project.id) return
        void router.push({ query: { ...route.query, project: project.id } })
    }

    function showProjectList() {
        if (route.query.project === undefined) return
        const query = { ...route.query }
        delete query.project
        void router.push({ query })
    }

    function syncSelectedProject() {
        const projectId = route.query.project
        selectedProject.value =
            typeof projectId === 'string' ? (projects.value.find((project) => project.id === projectId) ?? null) : null
    }

    function errorMessage(error: unknown): string {
        return error instanceof Error ? error.message : '本地项目服务暂时无法处理请求。'
    }
</script>

<template>
    <main class="min-h-screen min-w-[320px] bg-canvas-soft px-4 py-7 text-ink sm:px-6 sm:py-10">
        <div class="mx-auto max-w-[1200px]">
            <template v-if="selectedProject">
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
                            <p class="mb-2 text-xs font-semibold uppercase tracking-widest text-ink-muted">创作项目</p>
                            <h1 class="break-words text-2xl font-semibold tracking-tight sm:text-3xl">
                                {{ selectedProject.name }}
                            </h1>
                            <p class="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink-secondary">
                                {{ selectedProject.description || '暂无项目简介。' }}
                            </p>
                        </div>
                        <button
                            class="min-h-11 shrink-0 rounded-full border border-hairline bg-surface px-4 text-sm font-semibold hover:bg-canvas-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                            type="button"
                            :aria-label="`编辑项目：${selectedProject.name}`"
                            @click="openEditDialog(selectedProject)"
                        >
                            编辑项目
                        </button>
                    </header>
                    <div class="px-5 py-7 sm:px-7 sm:py-9">
                        <h2 class="text-lg font-semibold">角色档案</h2>
                        <p class="mt-2 max-w-2xl text-sm leading-6 text-ink-muted">
                            项目已创建。角色档案管理将在后续步骤接入；你的项目名称和简介会保存在本地。
                        </p>
                    </div>
                </section>
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
                    v-if="pageError"
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
                        v-else-if="pageError"
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
