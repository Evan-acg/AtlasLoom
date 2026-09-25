<script setup lang="ts">
    import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
    import { useRoute } from 'vue-router'
    import { listProjects } from '../api/projects'
    import ArchivedProjectView from './ArchivedProjectView.vue'
    import ProjectWorkspaceContent from './ProjectWorkspaceContent.vue'
    import SoftDeleteControls from '../components/SoftDeleteControls.vue'

    const route = useRoute()
    const deletedProjectIds = ref<string[]>([])
    const projectStateError = ref('')
    const isArchivedProject = computed(() => {
        const projectId = route.query.project
        return typeof projectId === 'string' && deletedProjectIds.value.includes(projectId)
    })

    onMounted(() => {
        globalThis.addEventListener('atlasloom:data-changed', refreshProjectState)
        void loadProjectState()
    })
    onUnmounted(() => globalThis.removeEventListener('atlasloom:data-changed', refreshProjectState))
    watch(
        () => route.query.project,
        () => void loadProjectState()
    )

    async function loadProjectState() {
        try {
            const result = await listProjects()
            deletedProjectIds.value = result.deletedProjects.map((project) => project.id)
            projectStateError.value = ''
        } catch (reason) {
            projectStateError.value = reason instanceof Error ? reason.message : '本地项目服务暂时无法处理请求。'
        }
    }

    function refreshProjectState() {
        void loadProjectState()
    }
</script>

<template>
    <p
        v-if="projectStateError"
        class="fixed inset-x-4 top-3 z-50 mx-auto max-w-[1200px] rounded-md bg-state-error-surface px-3 py-2 text-sm text-state-error"
        role="alert"
    >
        {{ projectStateError }}
    </p>
    <SoftDeleteControls />
    <ArchivedProjectView v-if="isArchivedProject" />
    <ProjectWorkspaceContent v-else />
</template>
