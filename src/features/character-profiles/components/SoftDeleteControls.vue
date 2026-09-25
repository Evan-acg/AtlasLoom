<script setup lang="ts">
    import { computed, onMounted, ref, watch } from 'vue'
    import { useRoute, useRouter } from 'vue-router'
    import { listCharacters, restoreCharacter } from '../api/characters'
    import { listProjects, restoreProject } from '../api/projects'
    import type { Character } from '../types/character'
    import type { Project } from '../types/project'

    const route = useRoute()
    const router = useRouter()
    const projects = ref<Project[]>([])
    const deletedProjects = ref<Project[]>([])
    const deletedCharacters = ref<Character[]>([])
    const error = ref('')

    const selectedProject = computed(() => {
        const projectId = route.query.project
        if (typeof projectId !== 'string') return null
        return [...projects.value, ...deletedProjects.value].find((project) => project.id === projectId) ?? null
    })
    onMounted(() => void load())
    watch(
        () => `${route.query.project ?? ''}:${route.query.character ?? ''}`,
        () => void load()
    )

    async function load() {
        error.value = ''
        try {
            const result = await listProjects()
            projects.value = result.projects
            deletedProjects.value = result.deletedProjects
            if (typeof route.query.project !== 'string') {
                deletedCharacters.value = []
                return
            }
            const characterResult = await listCharacters(route.query.project)
            deletedCharacters.value = characterResult.deletedCharacters
        } catch (reason) {
            error.value = reason instanceof Error ? reason.message : '本地项目服务暂时无法处理请求。'
        }
    }

    async function restoreProjectRecord(project = selectedProject.value) {
        if (!project) return
        try {
            await restoreProject(project.id)
            globalThis.location.reload()
        } catch (reason) {
            error.value = reason instanceof Error ? reason.message : '本地项目服务暂时无法处理请求。'
        }
    }

    async function restoreCharacterRecord(character: Character) {
        if (!selectedProject.value) return
        try {
            await restoreCharacter(selectedProject.value.id, character.id)
            globalThis.location.reload()
        } catch (reason) {
            error.value = reason instanceof Error ? reason.message : '本地项目服务暂时无法处理请求。'
        }
    }

    function openProject(project: Project) {
        void router.push({ query: { project: project.id, character: undefined } })
    }
</script>

<template>
    <div class="pointer-events-none fixed inset-x-0 top-0 z-40 flex justify-center px-4 pt-3">
        <section
            v-if="!selectedProject && deletedProjects.length"
            class="pointer-events-auto flex w-full max-w-[1200px] flex-col gap-3 rounded-lg border border-state-warning-border bg-state-warning-surface px-4 py-3 shadow-sm"
            aria-labelledby="deleted-projects-title"
        >
            <h2
                id="deleted-projects-title"
                class="text-sm font-semibold"
            >
                已删除项目
            </h2>
            <div
                v-for="project in deletedProjects"
                :key="project.id"
                class="flex items-center justify-between gap-3 rounded-md bg-white/70 px-3 py-2"
            >
                <span class="truncate text-sm font-medium">{{ project.name }}</span>
                <div class="flex shrink-0 gap-1">
                    <button
                        class="min-h-11 rounded-md px-3 text-sm font-medium text-ink-secondary hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                        type="button"
                        :aria-label="`打开 ${project.name}`"
                        @click="openProject(project)"
                    >
                        打开
                    </button>
                    <button
                        class="min-h-11 rounded-md px-3 text-sm font-semibold text-primary hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                        type="button"
                        :aria-label="`恢复 ${project.name}`"
                        @click="restoreProjectRecord(project)"
                    >
                        恢复
                    </button>
                </div>
            </div>
        </section>

        <section
            v-if="
                selectedProject &&
                !selectedProject.deletedAt &&
                route.query.character === undefined &&
                deletedCharacters.length
            "
            class="pointer-events-auto flex w-full max-w-[1200px] flex-col gap-3 rounded-lg border border-state-warning-border bg-state-warning-surface px-4 py-3 shadow-sm"
            aria-labelledby="deleted-characters-title"
        >
            <h2
                id="deleted-characters-title"
                class="text-sm font-semibold"
            >
                已删除角色
            </h2>
            <div
                v-for="character in deletedCharacters"
                :key="character.id"
                class="flex items-center justify-between gap-3 rounded-md bg-white/70 px-3 py-2"
            >
                <span class="truncate text-sm font-medium">{{ character.name }}</span>
                <button
                    class="min-h-11 rounded-md px-3 text-sm font-semibold text-primary hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    type="button"
                    :aria-label="`恢复 ${character.name}`"
                    @click="restoreCharacterRecord(character)"
                >
                    恢复
                </button>
            </div>
        </section>

        <p
            v-if="error"
            class="pointer-events-auto rounded-md bg-state-error-surface px-3 py-2 text-sm text-state-error"
            role="alert"
        >
            {{ error }}
        </p>
    </div>
</template>
