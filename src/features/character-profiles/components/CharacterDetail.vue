<script setup lang="ts">
    import { computed } from 'vue'
    import { ref } from 'vue'
    import ChangeHistory from './ChangeHistory.vue'
    import type { Character } from '../types/character'
    import type { Tag } from '../types/tag'

    const props = defineProps<{
        character: Character
        projectName: string
        tags: Tag[]
    }>()

    const emit = defineEmits<{
        back: []
        edit: []
        delete: []
        restore: []
    }>()
    const showHistory = ref(false)

    const tagNames = computed(() =>
        props.character.tagIds.map((tagId) => props.tags.find((tag) => tag.id === tagId)?.name ?? '标签不可用')
    )
</script>

<template>
    <div>
        <button
            class="mb-5 inline-flex min-h-11 items-center gap-2 rounded-md px-2 text-sm font-medium text-ink-secondary hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            type="button"
            @click="emit('back')"
        >
            <span aria-hidden="true">←</span>
            角色列表
        </button>

        <section class="overflow-hidden rounded-xl border border-hairline bg-surface">
            <header
                class="flex flex-col gap-4 border-b border-hairline px-5 py-5 sm:flex-row sm:items-start sm:justify-between sm:px-7 sm:py-6"
            >
                <div class="min-w-0">
                    <p class="mb-2 text-xs font-semibold uppercase tracking-widest text-ink-muted">角色档案</p>
                    <h1 class="break-words text-2xl font-semibold tracking-tight sm:text-3xl">{{ character.name }}</h1>
                    <p class="mt-2 text-sm text-ink-muted">{{ projectName }}</p>
                    <p
                        v-if="character.deletedAt"
                        class="mt-2 text-sm font-medium text-state-warning"
                    >
                        角色已删除
                    </p>
                </div>
                <div class="flex shrink-0 flex-wrap gap-2">
                    <button
                        class="min-h-11 rounded-full border border-hairline bg-surface px-4 text-sm font-semibold hover:bg-canvas-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                        type="button"
                        :aria-expanded="showHistory"
                        :aria-label="showHistory ? '收起角色变更历史' : '查看角色变更历史'"
                        @click="showHistory = !showHistory"
                    >
                        {{ showHistory ? '收起变更历史' : '变更历史' }}
                    </button>
                    <button
                        v-if="!character.deletedAt"
                        class="min-h-11 rounded-full border border-hairline bg-surface px-4 text-sm font-semibold hover:bg-canvas-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                        type="button"
                        :aria-label="`编辑角色：${character.name}`"
                        @click="emit('edit')"
                    >
                        编辑角色
                    </button>
                    <button
                        v-if="!character.deletedAt"
                        class="min-h-11 rounded-full border border-state-error-border px-4 text-sm font-semibold text-state-error hover:bg-state-error-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                        type="button"
                        @click="emit('delete')"
                    >
                        删除角色
                    </button>
                    <button
                        v-else
                        class="min-h-11 rounded-full bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-active focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                        type="button"
                        @click="emit('restore')"
                    >
                        恢复角色
                    </button>
                </div>
            </header>
            <ChangeHistory
                v-if="showHistory"
                subject="角色"
                :entries="character.history"
            />
            <dl class="grid gap-x-8 gap-y-7 px-5 py-7 sm:grid-cols-2 sm:px-7 sm:py-9">
                <div class="sm:col-span-2">
                    <dt class="text-xs font-semibold uppercase tracking-widest text-ink-muted">别名</dt>
                    <dd class="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink-secondary">
                        {{ character.aliases.join('、') || '暂无别名。' }}
                    </dd>
                </div>
                <div class="sm:col-span-2">
                    <dt class="text-xs font-semibold uppercase tracking-widest text-ink-muted">标签</dt>
                    <dd class="mt-2 flex flex-wrap gap-2 text-sm text-ink-secondary">
                        <span
                            v-for="tagName in tagNames"
                            :key="tagName"
                            class="rounded-full bg-canvas-soft px-2.5 py-1"
                        >
                            {{ tagName }}
                        </span>
                        <span v-if="!tagNames.length">暂无标签。</span>
                    </dd>
                </div>
                <div class="sm:col-span-2">
                    <dt class="text-xs font-semibold uppercase tracking-widest text-ink-muted">简介</dt>
                    <dd class="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink-secondary">
                        {{ character.introduction || '暂无简介。' }}
                    </dd>
                </div>
                <div>
                    <dt class="text-xs font-semibold uppercase tracking-widest text-ink-muted">外貌</dt>
                    <dd class="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink-secondary">
                        {{ character.appearance || '暂无记录。' }}
                    </dd>
                </div>
                <div>
                    <dt class="text-xs font-semibold uppercase tracking-widest text-ink-muted">性格</dt>
                    <dd class="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink-secondary">
                        {{ character.personality || '暂无记录。' }}
                    </dd>
                </div>
                <div class="sm:col-span-2">
                    <dt class="text-xs font-semibold uppercase tracking-widest text-ink-muted">背景故事</dt>
                    <dd class="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink-secondary">
                        {{ character.backstory || '暂无记录。' }}
                    </dd>
                </div>
                <div>
                    <dt class="text-xs font-semibold uppercase tracking-widest text-ink-muted">目标 / 动机</dt>
                    <dd class="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink-secondary">
                        {{ character.motivation || '暂无记录。' }}
                    </dd>
                </div>
                <div>
                    <dt class="text-xs font-semibold uppercase tracking-widest text-ink-muted">能力</dt>
                    <dd class="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink-secondary">
                        {{ character.abilities || '暂无记录。' }}
                    </dd>
                </div>
                <div class="sm:col-span-2">
                    <dt class="text-xs font-semibold uppercase tracking-widest text-ink-muted">备注</dt>
                    <dd class="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink-secondary">
                        {{ character.notes || '暂无备注。' }}
                    </dd>
                </div>
            </dl>
        </section>
    </div>
</template>
