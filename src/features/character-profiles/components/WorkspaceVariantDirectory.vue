<script setup lang="ts">
    import { ref } from 'vue'
    import type { WorkspaceVariantProps } from '../types'

    defineProps<WorkspaceVariantProps>()
    const emit = defineEmits<{
        'select-project': [projectId: string]
        'select-character': [characterId: string]
        'update-search-query': [query: string]
        'toggle-tag': [tag: string]
        'new-project': []
        'new-character': []
        'edit-character': [character: NonNullable<WorkspaceVariantProps['selectedCharacter']>]
    }>()
    const detailOpen = ref(true)

    function showDetails(characterId: string) {
        emit('select-character', characterId)
        detailOpen.value = true
    }
</script>

<template>
    <section
        aria-label="Variant C：角色目录"
        class="space-y-6"
    >
        <div class="flex flex-wrap items-end justify-between gap-4">
            <div>
                <p class="text-sm font-medium text-ink-muted">按项目整理的角色索引</p>
                <h2 class="mt-1 text-3xl font-semibold tracking-tight">角色目录</h2>
            </div>
            <div class="flex gap-2">
                <button
                    class="min-h-11 rounded-lg border border-hairline bg-white px-4 text-sm font-semibold hover:bg-canvas-soft"
                    type="button"
                    @click="$emit('new-project')"
                >
                    管理项目
                </button>
                <button
                    class="min-h-11 rounded-lg bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-active"
                    type="button"
                    @click="$emit('new-character')"
                >
                    ＋ 新建角色
                </button>
            </div>
        </div>
        <nav
            class="flex gap-2 overflow-x-auto border-b border-hairline"
            aria-label="项目目录"
        >
            <button
                v-for="project in projects"
                :key="project.id"
                type="button"
                class="min-h-12 shrink-0 border-b-2 px-4 text-sm font-semibold"
                :class="
                    project.id === selectedProjectId
                        ? 'border-primary text-primary'
                        : 'border-transparent text-ink-muted hover:text-ink'
                "
                :aria-current="project.id === selectedProjectId ? 'page' : undefined"
                @click="$emit('select-project', project.id)"
            >
                {{ project.name }}
            </button>
        </nav>
        <div class="rounded-2xl border border-hairline bg-white p-4 sm:p-6">
            <div class="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h3 class="text-xl font-semibold">{{ currentProject.name }}</h3>
                    <p class="mt-1 text-sm text-ink-muted">{{ currentProject.description }}</p>
                </div>
                <span class="text-sm text-ink-muted">{{ filteredCharacters.length }} 个档案</span>
            </div>
            <div class="mt-5 grid gap-3 md:grid-cols-[minmax(220px,1fr)_auto] md:items-start">
                <label
                    class="flex min-h-11 items-center gap-3 rounded-lg border border-hairline px-3 focus-within:border-primary"
                >
                    <span
                        aria-hidden="true"
                        class="text-ink-muted"
                    >
                        ⌕
                    </span>
                    <span class="sr-only">搜索姓名、别名或简介</span>
                    <input
                        :value="searchQuery"
                        class="w-full bg-transparent text-sm outline-none"
                        placeholder="搜索姓名、别名或简介"
                        @input="$emit('update-search-query', ($event.target as HTMLInputElement).value)"
                    />
                </label>
                <div
                    class="flex flex-wrap gap-2"
                    aria-label="按标签筛选"
                >
                    <button
                        v-for="tag in allTags"
                        :key="tag"
                        type="button"
                        class="min-h-9 rounded-full border px-3 text-xs font-medium"
                        :class="
                            selectedTags.includes(tag)
                                ? 'border-primary bg-primary text-white'
                                : 'border-hairline text-ink-secondary hover:border-primary'
                        "
                        :aria-pressed="selectedTags.includes(tag)"
                        @click="$emit('toggle-tag', tag)"
                    >
                        {{ tag }}
                    </button>
                </div>
            </div>
            <div class="mt-5 overflow-x-auto">
                <table class="w-full min-w-[560px] border-collapse text-left text-sm">
                    <thead>
                        <tr class="border-y border-hairline text-xs uppercase tracking-wide text-ink-muted">
                            <th class="py-3 pr-4 font-semibold">角色</th>
                            <th class="py-3 pr-4 font-semibold">简介</th>
                            <th class="py-3 font-semibold">标签</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr
                            v-for="character in filteredCharacters"
                            :key="character.id"
                            class="cursor-pointer border-b border-hairline align-top hover:bg-canvas-soft/70"
                            :class="selectedCharacter?.id === character.id ? 'bg-canvas-soft' : ''"
                            tabindex="0"
                            @click="showDetails(character.id)"
                            @keydown.enter="showDetails(character.id)"
                        >
                            <td
                                class="py-4 pr-4 font-semibold"
                                :class="selectedCharacter?.id === character.id ? 'text-primary' : 'text-ink'"
                            >
                                {{ character.name }}
                                <span class="mt-1 block text-xs font-normal text-ink-muted">
                                    {{ character.aliases.join(' · ') || '—' }}
                                </span>
                            </td>
                            <td class="max-w-[420px] py-4 pr-4 leading-6 text-ink-secondary">
                                {{ character.introduction }}
                            </td>
                            <td class="py-4">
                                <span class="flex flex-wrap gap-1">
                                    <span
                                        v-for="tag in character.tags"
                                        :key="tag"
                                        class="rounded-full bg-canvas-soft px-2 py-1 text-xs text-ink-secondary"
                                    >
                                        {{ tag }}
                                    </span>
                                </span>
                            </td>
                        </tr>
                        <tr v-if="filteredCharacters.length === 0">
                            <td
                                colspan="3"
                                class="py-10 text-center text-ink-muted"
                            >
                                没有符合条件的角色。
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
        <div
            v-if="selectedCharacter && detailOpen"
            class="fixed inset-0 z-30 flex justify-end bg-ink/30"
            @click.self="detailOpen = false"
        >
            <aside
                class="h-full w-full max-w-xl overflow-y-auto border-l border-hairline bg-white p-6 shadow-xl sm:p-8"
                aria-label="角色详情面板"
            >
                <div class="flex items-start justify-between gap-4">
                    <div>
                        <p class="text-sm text-ink-muted">{{ currentProject.name }} · 档案详情</p>
                        <h3 class="mt-2 text-3xl font-semibold">{{ selectedCharacter.name }}</h3>
                        <p class="mt-1 text-sm text-ink-muted">
                            {{ selectedCharacter.aliases.join(' · ') || '暂无别名' }}
                        </p>
                    </div>
                    <button
                        class="min-h-11 min-w-11 rounded-lg border border-hairline text-lg hover:bg-canvas-soft"
                        type="button"
                        aria-label="关闭详情面板"
                        @click="detailOpen = false"
                    >
                        ×
                    </button>
                </div>
                <p class="mt-6 leading-7 text-ink-secondary">{{ selectedCharacter.introduction }}</p>
                <dl class="mt-7 space-y-5">
                    <div>
                        <dt class="text-xs font-semibold uppercase tracking-wide text-ink-muted">外貌</dt>
                        <dd class="mt-2 leading-6">{{ selectedCharacter.appearance }}</dd>
                    </div>
                    <div>
                        <dt class="text-xs font-semibold uppercase tracking-wide text-ink-muted">性格</dt>
                        <dd class="mt-2 leading-6">{{ selectedCharacter.personality }}</dd>
                    </div>
                    <div>
                        <dt class="text-xs font-semibold uppercase tracking-wide text-ink-muted">背景故事</dt>
                        <dd class="mt-2 leading-6">{{ selectedCharacter.backstory }}</dd>
                    </div>
                    <div>
                        <dt class="text-xs font-semibold uppercase tracking-wide text-ink-muted">目标 / 动机</dt>
                        <dd class="mt-2 leading-6">{{ selectedCharacter.motivation }}</dd>
                    </div>
                    <div>
                        <dt class="text-xs font-semibold uppercase tracking-wide text-ink-muted">能力</dt>
                        <dd class="mt-2 leading-6">{{ selectedCharacter.abilities }}</dd>
                    </div>
                    <div>
                        <dt class="text-xs font-semibold uppercase tracking-wide text-ink-muted">备注</dt>
                        <dd class="mt-2 leading-6">{{ selectedCharacter.notes }}</dd>
                    </div>
                </dl>
                <div class="mt-7 flex flex-wrap gap-2">
                    <span
                        v-for="tag in selectedCharacter.tags"
                        :key="tag"
                        class="rounded-full bg-canvas-soft px-3 py-1.5 text-xs text-ink-secondary"
                    >
                        {{ tag }}
                    </span>
                </div>
                <button
                    class="mt-8 min-h-11 w-full rounded-lg bg-primary px-4 font-semibold text-white hover:bg-primary-active"
                    type="button"
                    @click="$emit('edit-character', selectedCharacter)"
                >
                    编辑档案
                </button>
            </aside>
        </div>
    </section>
</template>
