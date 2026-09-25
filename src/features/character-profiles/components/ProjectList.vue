<script setup lang="ts">
    import { computed } from 'vue'
    import type { Project, ProjectRepairResolution, ProjectStorageIssue } from '../types/project'

    const props = defineProps<{
        projects: Project[]
        storageIssues: ProjectStorageIssue[]
        loading: boolean
        error: string
        formOpen: boolean
    }>()
    const emit = defineEmits<{
        create: []
        edit: [project: Project]
        open: [project: Project]
        refresh: []
        repair: [issue: ProjectStorageIssue, resolution: ProjectRepairResolution]
    }>()

    const sortedProjects = computed(() => [...props.projects].sort((a, b) => a.name.localeCompare(b.name)))
</script>

<template>
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
            @click="emit('create')"
        >
            ＋ 新建项目
        </button>
    </header>

    <p
        v-if="error && !formOpen"
        class="mb-4 rounded-lg border border-state-error-border bg-state-error-surface px-4 py-3 text-sm text-state-error"
        role="alert"
    >
        {{ error }}
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
                            @click="emit('repair', issue, 'metadata-name')"
                        >
                            按项目名恢复目录
                        </button>
                        <button
                            class="min-h-11 rounded-md border border-hairline px-3 text-xs font-medium hover:bg-canvas-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                            type="button"
                            @click="emit('repair', issue, 'directory-name')"
                        >
                            使用目录名
                        </button>
                    </template>
                    <button
                        v-else-if="issue.backupAvailable"
                        class="min-h-11 rounded-md border border-hairline px-3 text-xs font-medium hover:bg-canvas-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                        type="button"
                        @click="emit('repair', issue, 'restore-backup')"
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
                @click="emit('refresh')"
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
            v-else-if="error && !formOpen"
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
                                @click="emit('open', project)"
                            >
                                {{ project.name }}
                            </button>
                            <p class="mt-1 line-clamp-2 whitespace-pre-wrap text-sm leading-5 text-ink-muted">
                                {{ project.description || '暂无简介' }}
                            </p>
                        </th>
                        <td class="whitespace-nowrap px-3 py-4 text-right sm:px-5">
                            <div class="flex justify-end gap-1 sm:gap-2">
                                <button
                                    class="min-h-11 rounded-md px-2 text-sm font-medium text-ink-secondary hover:bg-canvas-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:px-3"
                                    type="button"
                                    :aria-label="`编辑 ${project.name}`"
                                    @click="emit('edit', project)"
                                >
                                    编辑
                                </button>
                                <button
                                    class="min-h-11 rounded-md px-2 text-sm font-semibold text-primary hover:bg-canvas-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:px-3"
                                    type="button"
                                    :aria-label="`打开 ${project.name}`"
                                    @click="emit('open', project)"
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
                @click="emit('create')"
            >
                新建项目
            </button>
        </div>
    </section>
</template>
