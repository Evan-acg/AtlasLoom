<script setup lang="ts">
    import { computed, ref } from 'vue'
    import type { Tag, TagInput } from '../types/tag'

    const props = defineProps<{
        tags: Tag[]
        modelValue: string[]
        error: string
        createTag: (input: TagInput) => Promise<Tag | undefined>
    }>()
    const emit = defineEmits<{ 'update:modelValue': [value: string[]] }>()
    const newTagName = ref('')
    const formError = ref('')
    const sortedTags = computed(() => [...props.tags].sort((a, b) => a.name.localeCompare(b.name)))
    const displayError = computed(() => props.error || formError.value)

    async function createTagFromInput() {
        const name = newTagName.value.trim()
        if (!name) {
            formError.value = '请填写标签名称。'
            return
        }

        formError.value = ''
        try {
            const tag = await props.createTag({ name })
            if (!tag) return
            emit('update:modelValue', [...new Set([...props.modelValue, tag.id])])
            newTagName.value = ''
        } catch {
            return
        }
    }
</script>

<template>
    <fieldset class="rounded-lg border border-hairline p-4">
        <legend class="px-1 text-sm font-medium">角色标签</legend>
        <div
            v-if="sortedTags.length"
            class="mt-1 flex flex-wrap gap-x-4 gap-y-2"
        >
            <label
                v-for="tag in sortedTags"
                :key="tag.id"
                class="inline-flex min-h-9 items-center gap-2 text-sm text-ink-secondary"
            >
                <input
                    :checked="modelValue.includes(tag.id)"
                    type="checkbox"
                    :aria-label="`角色标签：${tag.name}`"
                    :value="tag.id"
                    @change="
                        emit(
                            'update:modelValue',
                            ($event.target as HTMLInputElement).checked
                                ? [...new Set([...modelValue, tag.id])]
                                : modelValue.filter((id) => id !== tag.id)
                        )
                    "
                />
                {{ tag.name }}
            </label>
        </div>
        <div class="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
                v-model="newTagName"
                class="min-h-10 min-w-0 flex-1 rounded border border-hairline bg-white px-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                aria-label="新建标签"
                maxlength="80"
                placeholder="输入标签名称"
            />
            <button
                class="min-h-10 rounded-md border border-hairline px-3 text-sm font-medium hover:bg-canvas-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                type="button"
                @click="createTagFromInput"
            >
                新建标签
            </button>
        </div>
        <p
            v-if="displayError"
            class="mt-3 rounded-md bg-state-error-surface px-3 py-2 text-sm text-state-error"
            role="alert"
        >
            {{ displayError }}
        </p>
    </fieldset>
</template>
