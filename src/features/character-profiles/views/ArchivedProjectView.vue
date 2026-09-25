<script setup lang="ts">
    import { computed, onMounted, ref, watch } from 'vue'
    import { useRoute, useRouter } from 'vue-router'
    import { listCharacters, restoreCharacter } from '../api/characters'
    import { listProjects, restoreProject } from '../api/projects'
    import type { Character } from '../types/character'
    import type { Project } from '../types/project'

    const route = useRoute()
    const router = useRouter()
    const project = ref<Project | null>(null)
    const characters = ref<Character[]>([])
    const loading = ref(true)
    const error = ref('')

    const sortedCharacters = computed(() => [...characters.value].sort((a, b) => a.name.localeCompare(b.name)))

    onMounted(() => void load())
    watch(
        () => route.query.project,
        () => void load()
    )

    async function load() {
        const projectId = route.query.project
        if (typeof projectId !== 'string') return
        loading.value = true
        error.value = ''
        try {
            const projects = await listProjects()
            project.value = projects.deletedProjects.find((item) => item.id === projectId) ?? null
            const result = await listCharacters(projectId)
            characters.value = [...result.characters, ...result.deletedCharacters]
        } catch (reason) {
            error.value = reason instanceof Error ? reason.message : '本地项目服务暂时无法处理请求。'
        } finally {
            loading.value = false
        }
    }

    async function restoreArchivedProject() {
        if (!project.value) return
        try {
            await restoreProject(project.value.id)
            globalThis.location.reload()
        } catch (reason) {
            error.value = reason instanceof Error ? reason.message : '本地项目服务暂时无法处理请求。'
        }
    }

    async function restoreArchivedCharacter(character: Character) {
        if (!project.value) return
        try {
            await restoreCharacter(project.value.id, character.id)
            await load()
        } catch (reason) {
            error.value = reason instanceof Error ? reason.message : '本地项目服务暂时无法处理请求。'
        }
    }

    function showProjectList() {
        void router.push({ query: { project: undefined, character: undefined } })
    }
</script>

<template>
    <main class="min-h-screen min-w-[320px] bg-canvas-soft px-4 py-7 text-ink sm:px-6 sm:py-10">
        <div class="mx-auto max-w-[1200px]">
            <button
                class="mb-5 inline-flex min-h-11 items-center gap-2 rounded-md px-2 text-sm font-medium text-ink-secondary hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                type="button"
                @click="showProjectList"
            >
                <span aria-hidden="true">←</span>
                全部项目
            </button>

            <p
                v-if="loading"
                class="rounded-xl border border-hairline bg-surface px-5 py-8 text-center text-sm text-ink-muted"
            >
                正在读取归档项目…
            </p>
            <p
                v-else-if="error"
                class="rounded-xl bg-state-error-surface px-4 py-3 text-sm text-state-error"
                role="alert"
            >
                {{ error }}
            </p>
            <section
                v-else-if="project"
                class="overflow-hidden rounded-xl border border-hairline bg-surface"
            >
                <header
                    class="flex flex-col gap-4 border-b border-hairline px-5 py-5 sm:flex-row sm:items-start sm:justify-between sm:px-7 sm:py-6"
                >
                    <div class="min-w-0">
                        <p class="mb-2 text-xs font-semibold uppercase tracking-widest text-ink-muted">归档项目</p>
                        <h1 class="break-words text-2xl font-semibold tracking-tight sm:text-3xl">
                            {{ project.name }}
                        </h1>
                        <p class="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink-secondary">
                            {{ project.description || '暂无项目简介。' }}
                        </p>
                        <p class="mt-2 text-sm font-medium text-state-warning">
                            项目已删除，角色不会出现在正常工作区。
                        </p>
                    </div>
                    <button
                        class="min-h-11 shrink-0 rounded-full bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-active focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                        type="button"
                        @click="restoreArchivedProject"
                    >
                        恢复项目
                    </button>
                </header>

                <div class="px-5 py-7 sm:px-7 sm:py-9">
                    <h2 class="text-lg font-semibold">归档角色</h2>
                    <p class="mt-2 text-sm text-ink-muted">恢复项目后，未单独删除的角色会重新出现在正常列表中。</p>
                    <div
                        v-if="sortedCharacters.length"
                        class="mt-6 divide-y divide-hairline border-y border-hairline"
                    >
                        <div
                            v-for="character in sortedCharacters"
                            :key="character.id"
                            class="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
                        >
                            <div class="min-w-0">
                                <h3 class="text-base font-semibold">{{ character.name }}</h3>
                                <p class="mt-1 text-sm text-ink-muted">
                                    {{ character.deletedAt ? '角色已单独删除。' : '角色随项目归档。' }}
                                </p>
                                <p
                                    v-if="character.introduction"
                                    class="mt-1 text-sm text-ink-secondary"
                                >
                                    {{ character.introduction }}
                                </p>
                            </div>
                            <button
                                v-if="character.deletedAt"
                                class="min-h-11 shrink-0 self-start rounded-md px-3 text-sm font-semibold text-primary hover:bg-canvas-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:self-auto"
                                type="button"
                                :aria-label="`恢复 ${character.name}`"
                                @click="restoreArchivedCharacter(character)"
                            >
                                恢复角色
                            </button>
                        </div>
                    </div>
                    <p
                        v-else
                        class="mt-6 border-y border-hairline py-8 text-center text-sm text-ink-muted"
                    >
                        这个项目还没有角色档案。
                    </p>
                </div>
            </section>
        </div>
    </main>
</template>
