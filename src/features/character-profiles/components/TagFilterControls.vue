<script setup lang="ts">
    import { computed } from 'vue'
    import type { Tag } from '../types/tag'

    const props = defineProps<{
        tags: Tag[]
        modelValue: string[]
    }>()
    const emit = defineEmits<{ 'update:modelValue': [value: string[]] }>()
    const sortedTags = computed(() => [...props.tags].sort((a, b) => a.name.localeCompare(b.name)))
    const selectedTagIds = computed({
        get: () => props.modelValue,
        set: (value: string[]) => emit('update:modelValue', value)
    })
</script>

<template>
    <fieldset v-if="sortedTags.length">
        <legend class="mb-2 text-sm font-medium">按标签筛选</legend>
        <div class="flex flex-wrap gap-x-4 gap-y-2">
            <label
                v-for="tag in sortedTags"
                :key="tag.id"
                class="inline-flex min-h-8 items-center gap-2 text-sm text-ink-secondary"
            >
                <input
                    v-model="selectedTagIds"
                    type="checkbox"
                    :aria-label="`筛选标签：${tag.name}`"
                    :value="tag.id"
                />
                {{ tag.name }}
            </label>
        </div>
    </fieldset>
</template>
