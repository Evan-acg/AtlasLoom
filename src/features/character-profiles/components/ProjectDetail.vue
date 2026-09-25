<script setup lang="ts">
    import { ref } from 'vue'
    import ChangeHistory from './ChangeHistory.vue'
    import type { Project } from '../types/project'

    const props = defineProps<{ project: Project }>()
    const showHistory = ref(false)
    const emit = defineEmits<{
        back: []
        edit: []
        remove: []
        restore: []
    }>()
</script>

<template>
    <button
        class="mb-5 inline-flex min-h-11 items-center gap-2 rounded-md px-2 text-sm font-medium text-ink-secondary hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        type="button"
        @click="emit('back')"
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
                <h1 class="break-words text-2xl font-semibold tracking-tight sm:text-3xl">{{ project.name }}</h1>
                <p class="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink-secondary">
                    {{ project.description || '暂无项目简介。' }}
                </p>
                <p
                    v-if="project.deletedAt"
                    class="mt-2 text-sm font-medium text-state-warning"
                >
                    项目已删除
                </p>
            </div>
            <div class="flex shrink-0 flex-wrap gap-2">
                <button
                    class="min-h-11 rounded-full border border-hairline bg-surface px-4 text-sm font-semibold hover:bg-canvas-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    type="button"
                    :aria-expanded="showHistory"
                    :aria-label="showHistory ? '收起项目变更历史' : '查看项目变更历史'"
                    @click="showHistory = !showHistory"
                >
                    {{ showHistory ? '收起变更历史' : '变更历史' }}
                </button>
                <button
                    v-if="!project.deletedAt"
                    class="min-h-11 rounded-full border border-hairline bg-surface px-4 text-sm font-semibold hover:bg-canvas-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    type="button"
                    :aria-label="`编辑项目：${project.name}`"
                    @click="emit('edit')"
                >
                    编辑项目
                </button>
                <button
                    v-if="!project.deletedAt"
                    class="min-h-11 rounded-full border border-state-error-border px-4 text-sm font-semibold text-state-error hover:bg-state-error-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    type="button"
                    @click="emit('remove')"
                >
                    删除项目
                </button>
                <button
                    v-else
                    class="min-h-11 rounded-full bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-active focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    type="button"
                    @click="emit('restore')"
                >
                    恢复项目
                </button>
            </div>
        </header>
        <ChangeHistory
            v-if="showHistory"
            subject="项目"
            :entries="props.project.history"
        />
        <slot />
    </section>
</template>
