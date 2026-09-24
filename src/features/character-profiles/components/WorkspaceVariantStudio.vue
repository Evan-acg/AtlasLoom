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
        aria-label="Variant B：创作工作台"
        class="overflow-hidden rounded-2xl border border-hairline bg-white lg:grid lg:min-h-[680px] lg:grid-cols-[220px_minmax(250px,0.8fr)_minmax(320px,1.3fr)]"
    >
        <aside
            class="border-b border-hairline bg-white p-5 lg:border-b-0 lg:border-r"
            aria-label="项目导航"
        >
            <div class="flex items-center justify-between gap-2">
                <div>
                    <p class="text-xs font-semibold tracking-wide text-primary">工作台</p>
                    <h2 class="mt-1 text-lg font-semibold">创作项目</h2>
                </div>
                <button
                    class="min-h-11 min-w-11 rounded-lg border border-hairline text-lg hover:bg-canvas-soft"
                    type="button"
                    aria-label="新建项目"
                    @click="$emit('new-project')"
                >
                    ＋
                </button>
            </div>
            <nav
                class="mt-5 flex gap-2 overflow-x-auto lg:flex-col"
                aria-label="选择项目"
            >
                <button
                    v-for="project in projects"
                    :key="project.id"
                    class="min-h-12 shrink-0 rounded-lg px-3 text-left text-sm font-medium lg:w-full"
                    :class="
                        project.id === selectedProjectId
                            ? 'bg-canvas-soft text-primary'
                            : 'text-ink-secondary hover:bg-canvas-soft'
                    "
                    type="button"
                    @click="$emit('select-project', project.id)"
                >
                    {{ project.name }}
                </button>
            </nav>
            <div class="mt-8 hidden border-t border-hairline pt-5 lg:block">
                <p class="text-xs font-semibold uppercase tracking-wide text-ink-muted">当前项目</p>
                <p class="mt-2 text-sm font-semibold">{{ currentProject.name }}</p>
                <p class="mt-1 text-sm leading-6 text-ink-muted">{{ currentProject.description }}</p>
            </div>
        </aside>

        <section
            class="border-b border-hairline p-5 lg:border-b-0 lg:border-r"
            aria-label="角色列表"
        >
            <div class="flex items-center justify-between gap-2">
                <div>
                    <p class="text-xs font-semibold tracking-wide text-ink-muted">{{ currentProject.name }}</p>
                    <h3 class="mt-1 text-lg font-semibold">人物</h3>
                </div>
                <button
                    class="min-h-11 min-w-11 rounded-lg bg-primary text-lg font-semibold text-white hover:bg-primary-active"
                    type="button"
                    aria-label="新建角色"
                    @click="$emit('new-character')"
                >
                    ＋
                </button>
            </div>
            <label class="mt-4 block">
                <span class="sr-only">搜索角色姓名、别名或简介</span>
                <input
                    :value="searchQuery"
                    class="min-h-11 w-full rounded-md border border-hairline px-3 text-sm focus:border-primary focus:outline-none"
                    placeholder="搜索角色"
                    @input="$emit('update-search-query', ($event.target as HTMLInputElement).value)"
                />
            </label>
            <div class="mt-3 flex flex-wrap gap-1.5">
                <button
                    v-for="tag in allTags"
                    :key="tag"
                    type="button"
                    class="min-h-8 rounded-md border px-2 text-xs"
                    :class="
                        selectedTags.includes(tag)
                            ? 'border-primary bg-primary text-white'
                            : 'border-hairline text-ink-muted'
                    "
                    :aria-pressed="selectedTags.includes(tag)"
                    @click="$emit('toggle-tag', tag)"
                >
                    {{ tag }}
                </button>
            </div>
            <div class="mt-4 space-y-1">
                <button
                    v-for="character in filteredCharacters"
                    :key="character.id"
                    type="button"
                    class="w-full rounded-lg p-3 text-left"
                    :class="selectedCharacter?.id === character.id ? 'bg-canvas-soft' : 'hover:bg-canvas-soft/70'"
                    @click="$emit('select-character', character.id)"
                >
                    <span
                        class="block font-semibold"
                        :class="selectedCharacter?.id === character.id ? 'text-primary' : 'text-ink'"
                    >
                        {{ character.name }}
                    </span>
                    <span class="mt-1 block line-clamp-2 text-xs leading-5 text-ink-muted">
                        {{ character.introduction }}
                    </span>
                </button>
                <p
                    v-if="filteredCharacters.length === 0"
                    class="px-2 py-6 text-sm text-ink-muted"
                >
                    没有匹配角色。
                </p>
            </div>
        </section>

        <article
            class="min-w-0 p-6 sm:p-8"
            aria-label="角色档案工作区"
        >
            <template v-if="selectedCharacter">
                <div class="flex flex-wrap items-start justify-between gap-4 border-b border-hairline pb-5">
                    <div>
                        <p class="text-sm text-ink-muted">{{ currentProject.name }} / 角色档案</p>
                        <h3 class="mt-2 text-3xl font-semibold tracking-tight">{{ selectedCharacter.name }}</h3>
                        <p class="mt-2 text-sm text-ink-muted">
                            {{ selectedCharacter.aliases.join(' · ') || '尚无别名' }}
                        </p>
                    </div>
                    <button
                        class="min-h-11 rounded-lg border border-hairline px-4 font-semibold hover:bg-canvas-soft"
                        type="button"
                        @click="$emit('edit-character', selectedCharacter)"
                    >
                        编辑档案
                    </button>
                </div>
                <p class="mt-6 max-w-2xl text-base leading-7 text-ink-secondary">
                    {{ selectedCharacter.introduction }}
                </p>
                <div class="mt-7 grid gap-x-8 gap-y-6 sm:grid-cols-2">
                    <div>
                        <p class="text-xs font-semibold uppercase tracking-wide text-ink-muted">外貌</p>
                        <p class="mt-2 leading-6">{{ selectedCharacter.appearance }}</p>
                    </div>
                    <div>
                        <p class="text-xs font-semibold uppercase tracking-wide text-ink-muted">性格</p>
                        <p class="mt-2 leading-6">{{ selectedCharacter.personality }}</p>
                    </div>
                    <div>
                        <p class="text-xs font-semibold uppercase tracking-wide text-ink-muted">背景故事</p>
                        <p class="mt-2 leading-6">{{ selectedCharacter.backstory }}</p>
                    </div>
                    <div>
                        <p class="text-xs font-semibold uppercase tracking-wide text-ink-muted">目标 / 动机</p>
                        <p class="mt-2 leading-6">{{ selectedCharacter.motivation }}</p>
                    </div>
                    <div>
                        <p class="text-xs font-semibold uppercase tracking-wide text-ink-muted">能力</p>
                        <p class="mt-2 leading-6">{{ selectedCharacter.abilities }}</p>
                    </div>
                    <div>
                        <p class="text-xs font-semibold uppercase tracking-wide text-ink-muted">备注</p>
                        <p class="mt-2 leading-6">{{ selectedCharacter.notes }}</p>
                    </div>
                </div>
                <div class="mt-8 border-t border-hairline pt-5">
                    <p class="text-xs font-semibold uppercase tracking-wide text-ink-muted">标签</p>
                    <div class="mt-3 flex flex-wrap gap-2">
                        <span
                            v-for="tag in selectedCharacter.tags"
                            :key="tag"
                            class="rounded-full bg-canvas-soft px-3 py-1.5 text-xs text-ink-secondary"
                        >
                            {{ tag }}
                        </span>
                    </div>
                </div>
            </template>
            <div
                v-else
                class="grid min-h-80 place-items-center text-center"
            >
                <p class="text-sm text-ink-muted">从左侧选择一个角色，查看或编辑完整档案。</p>
            </div>
        </article>
    </section>
</template>
