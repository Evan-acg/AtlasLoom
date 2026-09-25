<script setup lang="ts">
    import { computed, ref, watch } from 'vue'
    import type { Project, ProjectInput } from '../types/project'

    const props = defineProps<{
        mode: 'create' | 'edit'
        project: Project | null
        saving: boolean
        error: string
    }>()
    const emit = defineEmits<{
        close: []
        submit: [input: ProjectInput]
    }>()
    const name = ref('')
    const description = ref('')
    const validationError = ref('')
    const title = computed(() => (props.mode === 'edit' ? '编辑项目' : '新建项目'))
    const displayError = computed(() => validationError.value || props.error)

    watch(
        [() => props.mode, () => props.project],
        () => {
            name.value = props.project?.name ?? ''
            description.value = props.project?.description ?? ''
            validationError.value = ''
        },
        { immediate: true }
    )

    function submit() {
        const input = { name: name.value.trim(), description: description.value.trim() }
        if (!input.name) {
            validationError.value = '请填写项目名称。'
            return
        }
        validationError.value = ''
        emit('submit', input)
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
            class="my-auto w-full max-w-lg rounded-xl border border-hairline bg-surface p-5 shadow-lg sm:p-7"
            role="dialog"
            aria-modal="true"
            aria-labelledby="project-dialog-title"
        >
            <h2
                id="project-dialog-title"
                class="text-xl font-semibold"
            >
                {{ title }}
            </h2>
            <p class="mt-1 text-sm text-ink-muted">项目名称在本机所有项目中必须唯一。</p>
            <form
                class="mt-6 space-y-5"
                @submit.prevent="submit"
            >
                <div>
                    <label
                        class="mb-2 block text-sm font-medium"
                        for="project-name"
                    >
                        项目名称
                    </label>
                    <input
                        id="project-name"
                        v-model="name"
                        class="min-h-11 w-full rounded border border-hairline bg-white px-3 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                        name="project-name"
                        maxlength="180"
                        required
                        autocomplete="off"
                    />
                </div>
                <div>
                    <label
                        class="mb-2 block text-sm font-medium"
                        for="project-description"
                    >
                        项目简介
                    </label>
                    <textarea
                        id="project-description"
                        v-model="description"
                        class="min-h-28 w-full resize-y rounded border border-hairline bg-white px-3 py-2 text-base leading-6 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                        name="project-description"
                        rows="4"
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
                        {{ saving ? '保存中…' : mode === 'edit' ? '保存修改' : '创建项目' }}
                    </button>
                </div>
            </form>
        </section>
    </div>
</template>
