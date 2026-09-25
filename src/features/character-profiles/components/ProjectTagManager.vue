<script setup lang="ts">
    import { computed, ref } from 'vue'
    import type { Tag, TagInput } from '../types/tag'

    const props = defineProps<{
        tags: Tag[]
        error: string
        renameTag: (tagId: string, input: TagInput) => Promise<Tag | undefined>
    }>()
    const editingTagId = ref('')
    const editingTagName = ref('')
    const formError = ref('')
    const sortedTags = computed(() => [...props.tags].sort((a, b) => a.name.localeCompare(b.name)))
    const displayError = computed(() => props.error || formError.value)

    function startRename(tag: Tag) {
        editingTagId.value = tag.id
        editingTagName.value = tag.name
        formError.value = ''
    }

    function cancelRename() {
        editingTagId.value = ''
        editingTagName.value = ''
        formError.value = ''
    }

    async function saveRename() {
        const name = editingTagName.value.trim()
        if (!name) {
            formError.value = '请填写标签名称。'
            return
        }

        formError.value = ''
        try {
            await props.renameTag(editingTagId.value, { name })
            cancelRename()
        } catch {
            return
        }
    }
</script>

<template>
    <section
        class="mt-6 rounded-lg border border-hairline p-4"
        aria-labelledby="project-tags-title"
    >
        <h3
            id="project-tags-title"
            class="text-sm font-semibold"
        >
            项目标签
        </h3>
        <div
            v-if="sortedTags.length"
            class="mt-3 space-y-2"
        >
            <div
                v-for="tag in sortedTags"
                :key="tag.id"
                class="flex flex-wrap items-center gap-2 text-sm"
            >
                <span class="rounded-full bg-canvas-soft px-2.5 py-1">{{ tag.name }}</span>
                <button
                    class="min-h-9 rounded-md px-2 text-ink-secondary hover:bg-canvas-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    type="button"
                    :aria-label="`重命名标签：${tag.name}`"
                    @click="startRename(tag)"
                >
                    重命名
                </button>
                <template v-if="editingTagId === tag.id">
                    <input
                        v-model="editingTagName"
                        class="min-h-9 rounded border border-hairline bg-white px-2 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                        aria-label="标签名称"
                        maxlength="80"
                    />
                    <button
                        class="min-h-9 rounded-full bg-primary px-3 text-white hover:bg-primary-active focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                        type="button"
                        @click="saveRename"
                    >
                        保存标签
                    </button>
                    <button
                        class="min-h-9 rounded-md px-2 text-ink-secondary hover:bg-canvas-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                        type="button"
                        @click="cancelRename"
                    >
                        取消
                    </button>
                </template>
            </div>
        </div>
        <p
            v-else
            class="mt-2 text-sm text-ink-muted"
        >
            还没有项目标签。
        </p>
        <p
            v-if="displayError"
            class="mt-3 rounded-md bg-state-error-surface px-3 py-2 text-sm text-state-error"
            role="alert"
        >
            {{ displayError }}
        </p>
    </section>
</template>
