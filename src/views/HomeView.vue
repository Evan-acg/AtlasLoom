<script setup lang="ts">
    import { computed } from 'vue'
    import { WorkspacePrototype } from '@/features/character-profiles'

    const showWorkspacePrototype = computed(
        () =>
            import.meta.env.DEV &&
            new globalThis.URLSearchParams(globalThis.location.search).get('prototype') === 'workspace'
    )
</script>

<template>
    <WorkspacePrototype v-if="showWorkspacePrototype" />

    <main
        v-else
        class="mx-auto min-h-screen max-w-5xl px-6 py-16 sm:px-10 sm:py-24"
    >
        <section class="mx-auto max-w-2xl">
            <p class="mb-3 text-sm font-semibold uppercase tracking-widest text-indigo-600">
                Vue 3 · TypeScript · Pinia
            </p>
            <h1 class="text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">AtlasLoom</h1>
            <p class="mt-4 text-lg leading-8 text-slate-600">项目骨架已就绪，业务功能将在后续按 feature 逐步添加。</p>
        </section>
    </main>
</template>
