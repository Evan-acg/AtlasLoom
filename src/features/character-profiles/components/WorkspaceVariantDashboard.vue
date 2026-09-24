<script setup lang="ts">
    import type { WorkspaceVariantProps } from '../types'

    defineProps<WorkspaceVariantProps>()
    defineEmits<{
        'select-project': [projectId: string]
        'select-character': [characterId: string]
        'update-search-query': [query: string]
        'toggle-tag': [tag: string]
        'new-project': []
        'new-character': []
        'edit-character': [character: NonNullable<WorkspaceVariantProps['selectedCharacter']>]
    }>()
</script>

<template>
    <section
        aria-label="Variant A：项目看板"
        class="space-y-8"
    >
        <div class="flex flex-wrap items-end justify-between gap-4">
            <div>
                <p class="text-sm font-medium text-ink-muted">你的创作空间</p>
                <h2 class="mt-1 text-3xl font-semibold tracking-tight">项目看板</h2>
            </div>
            <button
                class="min-h-11 rounded-lg bg-primary px-5 font-semibold text-white hover:bg-primary-active focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                type="button"
                @click="$emit('new-project')"
            >
                ＋ 新建项目
            </button>
        </div>

        <div class="grid gap-4 md:grid-cols-3">
            <button
                v-for="project in projects"
                :key="project.id"
                type="button"
                class="min-h-36 rounded-xl border p-5 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                :class="
                    project.id === selectedProjectId
                        ? 'border-primary bg-white shadow-sm'
                        : 'border-hairline bg-white/70 hover:bg-white'
                "
                @click="$emit('select-project', project.id)"
            >
                <span
                    class="text-xs font-semibold uppercase tracking-wide"
                    :class="project.id === selectedProjectId ? 'text-primary' : 'text-ink-muted'"
                >
                    {{ project.id === selectedProjectId ? '当前项目' : '项目' }}
                </span>
                <span class="mt-3 block text-xl font-semibold">{{ project.name }}</span>
                <span class="mt-2 block text-sm leading-6 text-ink-muted">{{ project.description }}</span>
            </button>
        </div>

        <div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.8fr)]">
            <section
                class="rounded-2xl border border-hairline bg-white p-5 sm:p-6"
                aria-label="项目角色"
            >
                <div class="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <p class="text-sm text-ink-muted">{{ currentProject.name }}</p>
                        <h3 class="mt-1 text-xl font-semibold">
                            角色档案
                            <span class="text-sm font-normal text-ink-muted">{{ filteredCharacters.length }} 位</span>
                        </h3>
                    </div>
                    <button
                        class="min-h-11 rounded-lg border border-hairline px-4 text-sm font-semibold hover:bg-canvas-soft"
                        type="button"
                        @click="$emit('new-character')"
                    >
                        ＋ 新建角色
                    </button>
                </div>
                <label
                    class="mt-5 flex min-h-11 items-center gap-3 rounded-lg border border-hairline px-3 focus-within:border-primary"
                >
                    <span
                        aria-hidden="true"
                        class="text-ink-muted"
                    >
                        ⌕
                    </span>
                    <span class="sr-only">搜索角色姓名、别名或简介</span>
                    <input
                        :value="searchQuery"
                        class="w-full bg-transparent text-sm outline-none"
                        placeholder="搜索姓名、别名或简介"
                        @input="$emit('update-search-query', ($event.target as HTMLInputElement).value)"
                    />
                </label>
                <div
                    class="mt-3 flex flex-wrap gap-2"
                    aria-label="标签筛选"
                >
                    <button
                        v-for="tag in allTags"
                        :key="tag"
                        type="button"
                        class="min-h-9 rounded-full border px-3 text-xs font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                        :class="
                            selectedTags.includes(tag)
                                ? 'border-primary bg-primary text-white'
                                : 'border-hairline bg-white text-ink-secondary hover:border-primary'
                        "
                        :aria-pressed="selectedTags.includes(tag)"
                        @click="$emit('toggle-tag', tag)"
                    >
                        {{ tag }}
                    </button>
                </div>
                <div class="mt-5 divide-y divide-hairline">
                    <button
                        v-for="character in filteredCharacters"
                        :key="character.id"
                        type="button"
                        class="flex min-h-20 w-full items-center gap-3 py-3 text-left focus-visible:outline-2 focus-visible:outline-primary"
                        @click="$emit('select-character', character.id)"
                    >
                        <span
                            class="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-canvas-soft text-sm font-semibold text-ink-secondary"
                        >
                            {{ character.name.slice(0, 1) }}
                        </span>
                        <span class="min-w-0 flex-1">
                            <span
                                class="block font-semibold"
                                :class="selectedCharacter?.id === character.id ? 'text-primary' : 'text-ink'"
                            >
                                {{ character.name }}
                            </span>
                            <span class="mt-1 block truncate text-sm text-ink-muted">{{ character.introduction }}</span>
                        </span>
                        <span class="hidden gap-1 sm:flex">
                            <span
                                v-for="tag in character.tags.slice(0, 2)"
                                :key="tag"
                                class="rounded-full bg-canvas-soft px-2 py-1 text-xs text-ink-secondary"
                            >
                                {{ tag }}
                            </span>
                        </span>
                    </button>
                    <p
                        v-if="filteredCharacters.length === 0"
                        class="py-8 text-center text-sm text-ink-muted"
                    >
                        没有符合条件的角色。
                    </p>
                </div>
            </section>

            <aside
                class="rounded-2xl border border-hairline bg-white p-6"
                aria-label="角色档案预览"
            >
                <template v-if="selectedCharacter">
                    <div class="flex items-start justify-between gap-3">
                        <div>
                            <p class="text-sm text-ink-muted">角色档案预览</p>
                            <h3 class="mt-1 text-2xl font-semibold">{{ selectedCharacter.name }}</h3>
                            <p class="mt-1 text-sm text-ink-muted">
                                {{ selectedCharacter.aliases.join(' · ') || '暂无别名' }}
                            </p>
                        </div>
                        <button
                            class="min-h-11 rounded-lg border border-hairline px-3 text-sm font-semibold hover:bg-canvas-soft"
                            type="button"
                            @click="$emit('edit-character', selectedCharacter)"
                        >
                            编辑
                        </button>
                    </div>
                    <p class="mt-5 leading-7 text-ink-secondary">{{ selectedCharacter.introduction }}</p>
                    <dl class="mt-6 space-y-4 text-sm">
                        <div>
                            <dt class="font-semibold">外貌</dt>
                            <dd class="mt-1 leading-6 text-ink-muted">{{ selectedCharacter.appearance }}</dd>
                        </div>
                        <div>
                            <dt class="font-semibold">性格</dt>
                            <dd class="mt-1 leading-6 text-ink-muted">{{ selectedCharacter.personality }}</dd>
                        </div>
                        <div>
                            <dt class="font-semibold">目标 / 动机</dt>
                            <dd class="mt-1 leading-6 text-ink-muted">{{ selectedCharacter.motivation }}</dd>
                        </div>
                    </dl>
                    <div class="mt-6 flex flex-wrap gap-2">
                        <span
                            v-for="tag in selectedCharacter.tags"
                            :key="tag"
                            class="rounded-full bg-canvas-soft px-3 py-1.5 text-xs text-ink-secondary"
                        >
                            {{ tag }}
                        </span>
                    </div>
                </template>
                <div
                    v-else
                    class="grid min-h-64 place-items-center text-center"
                >
                    <p class="text-sm text-ink-muted">选择一个角色，查看档案预览。</p>
                </div>
            </aside>
        </div>
    </section>
</template>
