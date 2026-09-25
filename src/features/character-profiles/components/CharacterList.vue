<script setup lang="ts">
    import { computed, ref } from 'vue'
    import TagFilterControls from './TagFilterControls.vue'
    import type { Character, CharacterStorageIssue } from '../types/character'
    import type { Tag } from '../types/tag'

    const props = defineProps<{
        characters: Character[]
        tags: Tag[]
        loading: boolean
        error: string
        storageIssues: CharacterStorageIssue[]
    }>()

    const emit = defineEmits<{
        create: []
        select: [characterId: string]
    }>()

    const search = ref('')
    const selectedTagIds = ref<string[]>([])
    const hasActiveFilters = computed(() => Boolean(search.value.trim() || selectedTagIds.value.length))
    const filteredCharacters = computed(() => {
        const normalizedSearch = search.value.trim().normalize('NFC').toLocaleLowerCase()
        return props.characters.filter((character) => {
            const matchesSearch =
                !normalizedSearch ||
                [character.name, ...character.aliases, character.introduction].some((value) =>
                    value.normalize('NFC').toLocaleLowerCase().includes(normalizedSearch)
                )
            const matchesTags = selectedTagIds.value.every((tagId) => character.tagIds.includes(tagId))
            return matchesSearch && matchesTags
        })
    })

    function storageIssueMessage(issue: CharacterStorageIssue): string {
        const reason = {
            'invalid-json': '无法解析为有效 JSON',
            'unsupported-version': '使用了不受支持的格式版本',
            'invalid-fields': '缺少必需字段或字段格式错误',
            unreadable: '无法读取'
        }[issue.reason]
        return `角色文件“${issue.fileName}”${reason}，已跳过。`
    }

    function characterTagNames(character: Character): string[] {
        return character.tagIds.map((tagId) => props.tags.find((tag) => tag.id === tagId)?.name ?? '标签不可用')
    }

    function resetFilters() {
        search.value = ''
        selectedTagIds.value = []
    }
</script>

<template>
    <div class="px-5 py-7 sm:px-7 sm:py-9">
        <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
                <h2 class="text-lg font-semibold">角色档案</h2>
                <p class="mt-2 text-sm text-ink-muted">{{ filteredCharacters.length }} 个角色</p>
            </div>
            <button
                class="min-h-11 shrink-0 rounded-full bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-active active:bg-primary-active focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                type="button"
                @click="emit('create')"
            >
                ＋ 新建角色
            </button>
        </div>

        <div class="mt-6 grid gap-4 rounded-lg border border-hairline bg-canvas-soft p-4 sm:grid-cols-2">
            <div>
                <label
                    class="mb-2 block text-sm font-medium"
                    for="character-search"
                >
                    搜索角色
                </label>
                <input
                    id="character-search"
                    v-model="search"
                    class="min-h-11 w-full rounded border border-hairline bg-white px-3 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    type="search"
                    placeholder="姓名、别名或简介"
                />
            </div>
            <TagFilterControls
                v-model="selectedTagIds"
                :tags="tags"
            />
            <button
                v-if="hasActiveFilters"
                class="min-h-10 self-end rounded-md border border-hairline px-3 text-sm font-medium hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:col-span-2 sm:justify-self-end"
                type="button"
                @click="resetFilters"
            >
                清除筛选
            </button>
        </div>

        <p
            v-if="error"
            class="mt-5 rounded-md bg-state-error-surface px-3 py-2 text-sm text-state-error"
            role="alert"
        >
            {{ error }}
        </p>
        <template v-if="storageIssues.length">
            <p
                class="mt-5 rounded-md bg-state-warning-surface px-3 py-2 text-sm text-ink-secondary"
                role="status"
            >
                部分角色档案无法读取：{{ storageIssues.map(storageIssueMessage).join(' ') }}
            </p>
        </template>
        <p
            v-if="loading"
            class="mt-7 text-center text-sm text-ink-muted"
            role="status"
        >
            正在读取角色档案…
        </p>
        <div
            v-else-if="filteredCharacters.length"
            class="mt-6 divide-y divide-hairline border-y border-hairline"
        >
            <div
                v-for="character in filteredCharacters"
                :key="character.id"
                class="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
                <div class="min-w-0">
                    <button
                        class="max-w-full truncate text-left text-base font-semibold text-ink hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                        type="button"
                        @click="emit('select', character.id)"
                    >
                        {{ character.name }}
                    </button>
                    <p class="mt-1 line-clamp-2 text-sm leading-5 text-ink-muted">
                        {{ character.introduction || '暂无简介。' }}
                    </p>
                    <div
                        v-if="characterTagNames(character).length"
                        class="mt-2 flex flex-wrap gap-1.5"
                    >
                        <span
                            v-for="tagName in characterTagNames(character)"
                            :key="tagName"
                            class="rounded-full bg-canvas-soft px-2 py-0.5 text-xs text-ink-secondary"
                        >
                            {{ tagName }}
                        </span>
                    </div>
                </div>
                <button
                    class="min-h-11 shrink-0 self-start rounded-md px-3 text-sm font-medium text-ink-secondary hover:bg-canvas-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:self-auto"
                    type="button"
                    :aria-label="`打开 ${character.name}`"
                    @click="emit('select', character.id)"
                >
                    打开
                </button>
            </div>
        </div>
        <p
            v-else
            class="mt-7 border-y border-hairline py-8 text-center text-sm text-ink-muted"
        >
            {{ characters.length ? '没有符合当前搜索或筛选条件的角色。' : '这个项目还没有角色档案。' }}
        </p>
    </div>
</template>
