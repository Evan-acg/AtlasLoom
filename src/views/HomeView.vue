<script setup lang="ts">
    import { computed } from 'vue'
    import { ProjectWorkspaceView, WorkspacePrototype } from '@/features/character-profiles'

    const showWorkspacePrototype = computed(
        () =>
            import.meta.env.DEV &&
            new globalThis.URLSearchParams(globalThis.location.search).get('prototype') === 'workspace'
    )
</script>

<template>
    <WorkspacePrototype v-if="showWorkspacePrototype" />
    <ProjectWorkspaceView v-else />
</template>
