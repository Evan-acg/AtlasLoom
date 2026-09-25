<script setup lang="ts">
    import { computed } from 'vue'
    import type { Character } from '../types/character'
    import type { Project } from '../types/project'

    const props = defineProps<{
        deletedProjects: Project[]
        selectedProject: Project | null
        deletedCharacters: Character[]
        selectedCharacterId: string | null
    }>()
    const emit = defineEmits<{
        'restore-project': [projectId: string]
        'restore-character': [characterId: string]
        'open-project': [project: Project]
        'open-character': [characterId: string]
    }>()
    const showDeletedCharacters = computed(
        () =>
            Boolean(props.selectedProject) &&
            !props.selectedProject?.deletedAt &&
            props.selectedCharacterId === null &&
            props.deletedCharacters.length > 0
    )

    function restoreProjectRecord(project: Project) {
        emit('restore-project', project.id)
    }

    function restoreCharacterRecord(character: Character) {
        if (!props.selectedProject) return
        emit('restore-character', character.id)
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
                        @click="emit('open-project', project)"
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
            v-if="showDeletedCharacters"
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
                <div class="flex shrink-0 gap-1">
                    <button
                        class="min-h-11 rounded-md px-3 text-sm font-semibold text-primary hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                        type="button"
                        :aria-label="`打开 ${character.name}`"
                        @click="emit('open-character', character.id)"
                    >
                        打开
                    </button>
                    <button
                        class="min-h-11 rounded-md px-3 text-sm font-semibold text-primary hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                        type="button"
                        :aria-label="`恢复 ${character.name}`"
                        @click="restoreCharacterRecord(character)"
                    >
                        恢复
                    </button>
                </div>
            </div>
        </section>
    </div>
</template>
