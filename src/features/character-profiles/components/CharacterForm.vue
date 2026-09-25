<script setup lang="ts">
    import { computed, ref } from 'vue'
    import CharacterTagField from './CharacterTagField.vue'
    import type { Character, CharacterInput } from '../types/character'
    import type { Tag, TagInput } from '../types/tag'

    const props = defineProps<{
        mode: 'create' | 'edit'
        character?: Character
        tags: Tag[]
        saving: boolean
        error: string
        tagError: string
        createTag: (input: TagInput) => Promise<Tag | undefined>
    }>()

    const emit = defineEmits<{
        submit: [input: CharacterInput]
        close: []
    }>()

    const draft = ref<CharacterInput>(toCharacterInput(props.character))
    const validationError = ref('')
    const aliasesText = computed({
        get: () => draft.value.aliases.join('\n'),
        set: (value: string) => {
            draft.value.aliases = value.split('\n')
        }
    })
    const displayError = computed(() => props.error || validationError.value)

    function submit() {
        const name = draft.value.name.trim()
        if (!name) {
            validationError.value = '请填写角色姓名。'
            return
        }

        validationError.value = ''
        emit('submit', {
            ...draft.value,
            name,
            aliases: draft.value.aliases.map((alias) => alias.trim()).filter(Boolean)
        })
    }

    function updateTagIds(tagIds: string[]) {
        draft.value.tagIds = tagIds
    }

    function toCharacterInput(character?: Character): CharacterInput {
        return {
            name: character?.name ?? '',
            aliases: character ? [...character.aliases] : [],
            tagIds: character ? [...character.tagIds] : [],
            introduction: character?.introduction ?? '',
            appearance: character?.appearance ?? '',
            personality: character?.personality ?? '',
            backstory: character?.backstory ?? '',
            motivation: character?.motivation ?? '',
            abilities: character?.abilities ?? '',
            notes: character?.notes ?? ''
        }
    }
</script>

<template>
    <div
        class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4"
        role="presentation"
        tabindex="-1"
        @click.self="emit('close')"
        @keydown.esc="emit('close')"
    >
        <section
            class="my-auto w-full max-w-2xl rounded-xl border border-hairline bg-surface p-5 shadow-lg sm:p-7"
            role="dialog"
            aria-modal="true"
            aria-labelledby="character-dialog-title"
        >
            <h2
                id="character-dialog-title"
                class="text-xl font-semibold"
            >
                {{ mode === 'edit' ? '编辑角色' : '新建角色' }}
            </h2>
            <p class="mt-1 text-sm text-ink-muted">角色姓名在当前项目中必须唯一。</p>
            <form
                class="mt-6 space-y-5"
                @submit.prevent="submit"
            >
                <div>
                    <label
                        class="mb-2 block text-sm font-medium"
                        for="character-name"
                    >
                        角色姓名
                    </label>
                    <input
                        id="character-name"
                        v-model="draft.name"
                        class="min-h-11 w-full rounded border border-hairline bg-white px-3 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                        name="character-name"
                        maxlength="180"
                        required
                        autocomplete="off"
                    />
                </div>
                <div>
                    <label
                        class="mb-2 block text-sm font-medium"
                        for="character-aliases"
                    >
                        别名
                    </label>
                    <textarea
                        id="character-aliases"
                        v-model="aliasesText"
                        class="min-h-20 w-full resize-y rounded border border-hairline bg-white px-3 py-2 text-base leading-6 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                        name="character-aliases"
                        placeholder="每行填写一个别名"
                        rows="2"
                    />
                </div>
                <CharacterTagField
                    :model-value="draft.tagIds ?? []"
                    :tags="tags"
                    :error="tagError"
                    :create-tag="createTag"
                    @update:model-value="updateTagIds"
                />
                <div>
                    <label
                        class="mb-2 block text-sm font-medium"
                        for="character-introduction"
                    >
                        角色简介
                    </label>
                    <textarea
                        id="character-introduction"
                        v-model="draft.introduction"
                        class="min-h-24 w-full resize-y rounded border border-hairline bg-white px-3 py-2 text-base leading-6 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                        name="character-introduction"
                        rows="3"
                    />
                </div>
                <div class="grid gap-5 sm:grid-cols-2">
                    <div>
                        <label
                            class="mb-2 block text-sm font-medium"
                            for="character-appearance"
                        >
                            外貌
                        </label>
                        <textarea
                            id="character-appearance"
                            v-model="draft.appearance"
                            class="min-h-24 w-full resize-y rounded border border-hairline bg-white px-3 py-2 text-base leading-6 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                            name="character-appearance"
                            rows="3"
                        />
                    </div>
                    <div>
                        <label
                            class="mb-2 block text-sm font-medium"
                            for="character-personality"
                        >
                            性格
                        </label>
                        <textarea
                            id="character-personality"
                            v-model="draft.personality"
                            class="min-h-24 w-full resize-y rounded border border-hairline bg-white px-3 py-2 text-base leading-6 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                            name="character-personality"
                            rows="3"
                        />
                    </div>
                </div>
                <div>
                    <label
                        class="mb-2 block text-sm font-medium"
                        for="character-backstory"
                    >
                        背景故事
                    </label>
                    <textarea
                        id="character-backstory"
                        v-model="draft.backstory"
                        class="min-h-28 w-full resize-y rounded border border-hairline bg-white px-3 py-2 text-base leading-6 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                        name="character-backstory"
                        rows="4"
                    />
                </div>
                <div class="grid gap-5 sm:grid-cols-2">
                    <div>
                        <label
                            class="mb-2 block text-sm font-medium"
                            for="character-motivation"
                        >
                            目标 / 动机
                        </label>
                        <textarea
                            id="character-motivation"
                            v-model="draft.motivation"
                            class="min-h-24 w-full resize-y rounded border border-hairline bg-white px-3 py-2 text-base leading-6 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                            name="character-motivation"
                            rows="3"
                        />
                    </div>
                    <div>
                        <label
                            class="mb-2 block text-sm font-medium"
                            for="character-abilities"
                        >
                            能力
                        </label>
                        <textarea
                            id="character-abilities"
                            v-model="draft.abilities"
                            class="min-h-24 w-full resize-y rounded border border-hairline bg-white px-3 py-2 text-base leading-6 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                            name="character-abilities"
                            rows="3"
                        />
                    </div>
                </div>
                <div>
                    <label
                        class="mb-2 block text-sm font-medium"
                        for="character-notes"
                    >
                        备注
                    </label>
                    <textarea
                        id="character-notes"
                        v-model="draft.notes"
                        class="min-h-24 w-full resize-y rounded border border-hairline bg-white px-3 py-2 text-base leading-6 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                        name="character-notes"
                        rows="3"
                    />
                </div>
                <p
                    v-if="displayError"
                    class="rounded-md bg-state-error-surface px-3 py-2 text-sm text-state-error"
                    role="alert"
                >
                    {{ displayError }}
                </p>
                <div class="flex flex-col-reverse justify-end gap-2 border-t border-hairline pt-4 sm:flex-row">
                    <button
                        class="min-h-11 rounded-full border border-hairline px-4 text-sm font-medium hover:bg-canvas-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                        type="button"
                        :disabled="saving"
                        @click="emit('close')"
                    >
                        取消
                    </button>
                    <button
                        class="min-h-11 rounded-full bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-active active:bg-primary-active focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-wait disabled:opacity-60"
                        type="submit"
                        :disabled="saving"
                    >
                        {{ saving ? '保存中…' : mode === 'edit' ? '保存角色' : '创建角色' }}
                    </button>
                </div>
            </form>
        </section>
    </div>
</template>
