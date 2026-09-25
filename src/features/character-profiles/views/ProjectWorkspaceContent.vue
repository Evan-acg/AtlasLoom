<script setup lang="ts">
    import { computed, ref, watch } from 'vue'
    import { useRoute, useRouter } from 'vue-router'
    import type { Character, CharacterInput } from '../types/character'
    import type { Project, ProjectInput, ProjectRepairResolution, ProjectStorageIssue } from '../types/project'
    import type { Tag } from '../types/tag'
    import ProjectDetail from '../components/ProjectDetail.vue'
    import ProjectForm from '../components/ProjectForm.vue'
    import ProjectList from '../components/ProjectList.vue'
    import type { CharacterJourneyState, ProjectJourneyState } from '../types/workspace'

    const props = defineProps<{
        projectState: ProjectJourneyState
        characterState: CharacterJourneyState
        openProject: (project: Project) => void
        showProjectList: () => void
    }>()
    const openProject = props.openProject
    const showProjectList = props.showProjectList
    const projects = props.projectState.projects
    const storageIssues = props.projectState.storageIssues
    const loading = props.projectState.loading
    const pageError = props.projectState.error
    const selectedProject = props.projectState.selectedProject
    const characters = props.characterState.characters
    const deletedCharacters = props.characterState.deletedCharacters
    const charactersLoading = props.characterState.charactersLoading
    const characterPageError = props.characterState.error
    const tags = props.characterState.tags
    const tagError = props.characterState.tagError

    const saving = ref(false)
    const projectSaving = ref(false)
    const formError = ref('')
    const projectFormError = ref('')
    const tagFormError = ref('')
    const selectedCharacter = ref<Character | null>(null)
    const characterSearch = ref('')
    const selectedTagIds = ref<string[]>([])
    const newTagName = ref('')
    const editingTagId = ref('')
    const editingTagName = ref('')
    const projectDialogMode = ref<'create' | 'edit' | null>(null)
    const characterDialogMode = ref<'create' | 'edit' | null>(null)
    const editingProject = ref<Project | null>(null)
    const characterForm = ref<CharacterInput>(emptyCharacterInput())
    const characterAliases = ref('')
    const editingCharacterId = ref('')
    const route = useRoute()
    const router = useRouter()

    const sortedTags = computed(() => [...tags.value].sort((a, b) => a.name.localeCompare(b.name)))
    const tagDisplayError = computed(() => tagError.value || tagFormError.value)
    const filteredCharacters = computed(() => {
        const search = characterSearch.value.trim().normalize('NFC').toLocaleLowerCase()
        return characters.value.filter((character) => matchesCharacter(character, search))
    })

    watch(
        () => route.query.project,
        () => {
            resetCharacterFilters()
            syncSelectedCharacter()
        }
    )
    watch([characters, deletedCharacters, () => route.query.character], syncSelectedCharacter, { immediate: true })

    async function loadProjects() {
        await props.projectState.refresh()
    }

    function openCreateDialog() {
        props.projectState.clearError()
        projectDialogMode.value = 'create'
        editingProject.value = null
        projectFormError.value = ''
    }

    function openEditDialog(project: Project) {
        props.projectState.clearError()
        projectDialogMode.value = 'edit'
        editingProject.value = project
        projectFormError.value = ''
    }

    function closeDialog() {
        if (projectSaving.value) return
        props.projectState.clearError()
        projectDialogMode.value = null
        editingProject.value = null
        projectFormError.value = ''
    }

    async function saveProject(input: ProjectInput) {
        projectSaving.value = true
        projectFormError.value = ''
        try {
            if (projectDialogMode.value === 'edit' && editingProject.value) {
                await props.projectState.update(editingProject.value.id, input)
            } else {
                await props.projectState.create(input)
            }
            projectDialogMode.value = null
            editingProject.value = null
            props.projectState.clearError()
        } catch (error) {
            projectFormError.value = errorMessage(error)
        } finally {
            projectSaving.value = false
        }
    }

    async function softDeleteProject(project: Project) {
        const confirmed = globalThis.confirm(`项目“${project.name}”及其角色将从正常浏览中隐藏。是否继续？`)
        if (!confirmed) return
        try {
            await props.projectState.remove(project.id)
        } catch {
            return
        }
    }

    async function restoreProject(project: Project) {
        try {
            await props.projectState.restore(project.id)
        } catch {
            return
        }
    }

    async function repairStorageIssue(issue: ProjectStorageIssue, resolution: ProjectRepairResolution) {
        try {
            await props.projectState.repair(issue.directoryName, resolution)
        } catch {
            return
        }
    }

    async function handleProjectRepair(issue: ProjectStorageIssue, resolution: ProjectRepairResolution) {
        if (resolution === 'restore-backup') {
            await restoreBackup(issue)
            return
        }
        await repairStorageIssue(issue, resolution)
    }

    async function restoreBackup(issue: ProjectStorageIssue) {
        const confirmed = globalThis.confirm(
            `将使用“${issue.directoryName}”中保存的有效备份替换当前损坏数据。是否继续？`
        )
        if (!confirmed) return
        await repairStorageIssue(issue, 'restore-backup')
    }

    function openCharacter(character: Character) {
        if (route.query.character === character.id) return
        void router.push({ query: { ...route.query, character: character.id } })
    }

    function showCharacterList() {
        const query = { ...route.query, character: undefined }
        void router.push({ query })
    }

    function openCreateCharacter() {
        characterDialogMode.value = 'create'
        characterForm.value = emptyCharacterInput()
        characterAliases.value = ''
        editingCharacterId.value = ''
        formError.value = ''
        tagFormError.value = ''
        newTagName.value = ''
    }

    function openEditCharacter(character: Character) {
        characterDialogMode.value = 'edit'
        characterForm.value = {
            name: character.name,
            aliases: [...character.aliases],
            tagIds: [...character.tagIds],
            introduction: character.introduction,
            appearance: character.appearance,
            personality: character.personality,
            backstory: character.backstory,
            motivation: character.motivation,
            abilities: character.abilities,
            notes: character.notes
        }
        characterAliases.value = character.aliases.join('\n')
        editingCharacterId.value = character.id
        formError.value = ''
        tagFormError.value = ''
        newTagName.value = ''
    }

    function closeCharacterDialog() {
        if (saving.value) return
        characterDialogMode.value = null
        formError.value = ''
    }

    async function saveCharacter() {
        if (!selectedProject.value) return
        const input: CharacterInput = {
            ...characterForm.value,
            name: characterForm.value.name.trim(),
            aliases: characterAliases.value
                .split('\n')
                .map((alias) => alias.trim())
                .filter(Boolean)
        }
        if (!input.name) {
            formError.value = '请填写角色姓名。'
            return
        }

        saving.value = true
        formError.value = ''
        try {
            const character =
                characterDialogMode.value === 'edit'
                    ? await props.characterState.update(editingCharacterId.value, input)
                    : await props.characterState.create(input)
            if (!character) return
            selectedCharacter.value = character
            characterDialogMode.value = null
            openCharacter(character)
        } catch (error) {
            formError.value = errorMessage(error)
        } finally {
            saving.value = false
        }
    }

    async function softDeleteCharacter(character: Character) {
        if (!selectedProject.value) return
        const confirmed = globalThis.confirm(`角色“${character.name}”将从正常浏览中隐藏。是否继续？`)
        if (!confirmed) return
        try {
            const deleted = await props.characterState.remove(character.id)
            if (!deleted) return
            if (selectedCharacter.value?.id === deleted.id) selectedCharacter.value = deleted
        } catch {
            return
        }
    }

    async function restoreCharacter(character: Character) {
        if (!selectedProject.value) return
        try {
            const restored = await props.characterState.restore(character.id)
            if (!restored) return
            if (selectedCharacter.value?.id === restored.id) selectedCharacter.value = restored
        } catch {
            return
        }
    }

    async function createTagFromCharacter() {
        if (!selectedProject.value) return
        const name = newTagName.value.trim()
        if (!name) {
            tagFormError.value = '请填写标签名称。'
            return
        }

        tagFormError.value = ''
        try {
            const tag = await props.characterState.createTag({ name })
            if (!tag) return
            characterForm.value.tagIds = [...new Set([...(characterForm.value.tagIds ?? []), tag.id])]
            newTagName.value = ''
        } catch {
            return
        }
    }

    function startRenameTag(tag: Tag) {
        editingTagId.value = tag.id
        editingTagName.value = tag.name
        tagFormError.value = ''
    }

    function cancelRenameTag() {
        editingTagId.value = ''
        editingTagName.value = ''
        tagFormError.value = ''
    }

    async function saveTagRename() {
        if (!selectedProject.value) return
        const name = editingTagName.value.trim()
        if (!name) {
            tagFormError.value = '请填写标签名称。'
            return
        }

        tagFormError.value = ''
        try {
            await props.characterState.renameTag(editingTagId.value, { name })
            cancelRenameTag()
        } catch {
            return
        }
    }

    function resetCharacterFilters() {
        characterSearch.value = ''
        selectedTagIds.value = []
    }

    function syncSelectedCharacter() {
        const characterId = route.query.character
        selectedCharacter.value =
            typeof characterId === 'string'
                ? ([...characters.value, ...deletedCharacters.value].find(
                      (character) => character.id === characterId
                  ) ?? null)
                : null
    }

    function matchesCharacter(character: Character, search: string): boolean {
        const matchesSearch =
            !search ||
            [character.name, ...character.aliases, character.introduction].some((value) =>
                value.normalize('NFC').toLocaleLowerCase().includes(search)
            )
        const matchesTags = selectedTagIds.value.every((tagId) => character.tagIds.includes(tagId))
        return matchesSearch && matchesTags
    }

    function characterTagNames(character: Character): string[] {
        return character.tagIds.map((tagId) => tags.value.find((tag) => tag.id === tagId)?.name ?? '标签不可用')
    }

    function errorMessage(error: unknown): string {
        return error instanceof Error ? error.message : '本地项目服务暂时无法处理请求。'
    }

    function emptyCharacterInput(): CharacterInput {
        return {
            name: '',
            aliases: [],
            tagIds: [],
            introduction: '',
            appearance: '',
            personality: '',
            backstory: '',
            motivation: '',
            abilities: '',
            notes: ''
        }
    }
</script>

<template>
    <main class="min-h-screen min-w-[320px] bg-canvas-soft px-4 py-7 text-ink sm:px-6 sm:py-10">
        <div class="mx-auto max-w-[1200px]">
            <template v-if="selectedProject">
                <template v-if="selectedCharacter">
                    <button
                        class="mb-5 inline-flex min-h-11 items-center gap-2 rounded-md px-2 text-sm font-medium text-ink-secondary hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                        type="button"
                        @click="showCharacterList"
                    >
                        <span aria-hidden="true">←</span>
                        角色列表
                    </button>

                    <section class="overflow-hidden rounded-xl border border-hairline bg-surface">
                        <header
                            class="flex flex-col gap-4 border-b border-hairline px-5 py-5 sm:flex-row sm:items-start sm:justify-between sm:px-7 sm:py-6"
                        >
                            <div class="min-w-0">
                                <p class="mb-2 text-xs font-semibold uppercase tracking-widest text-ink-muted">
                                    角色档案
                                </p>
                                <h1 class="break-words text-2xl font-semibold tracking-tight sm:text-3xl">
                                    {{ selectedCharacter.name }}
                                </h1>
                                <p class="mt-2 text-sm text-ink-muted">{{ selectedProject.name }}</p>
                                <p
                                    v-if="selectedCharacter.deletedAt"
                                    class="mt-2 text-sm font-medium text-state-warning"
                                >
                                    角色已删除
                                </p>
                            </div>
                            <div class="flex shrink-0 flex-wrap gap-2">
                                <button
                                    v-if="!selectedCharacter.deletedAt"
                                    class="min-h-11 rounded-full border border-hairline bg-surface px-4 text-sm font-semibold hover:bg-canvas-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                                    type="button"
                                    :aria-label="`编辑角色：${selectedCharacter.name}`"
                                    @click="openEditCharacter(selectedCharacter)"
                                >
                                    编辑角色
                                </button>
                                <button
                                    v-if="!selectedCharacter.deletedAt"
                                    class="min-h-11 rounded-full border border-state-error-border px-4 text-sm font-semibold text-state-error hover:bg-state-error-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                                    type="button"
                                    @click="softDeleteCharacter(selectedCharacter)"
                                >
                                    删除角色
                                </button>
                                <button
                                    v-else
                                    class="min-h-11 rounded-full bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-active focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                                    type="button"
                                    @click="restoreCharacter(selectedCharacter)"
                                >
                                    恢复角色
                                </button>
                            </div>
                        </header>
                        <dl class="grid gap-x-8 gap-y-7 px-5 py-7 sm:grid-cols-2 sm:px-7 sm:py-9">
                            <div class="sm:col-span-2">
                                <dt class="text-xs font-semibold uppercase tracking-widest text-ink-muted">别名</dt>
                                <dd class="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink-secondary">
                                    {{ selectedCharacter.aliases.join('、') || '暂无别名。' }}
                                </dd>
                            </div>
                            <div class="sm:col-span-2">
                                <dt class="text-xs font-semibold uppercase tracking-widest text-ink-muted">标签</dt>
                                <dd class="mt-2 flex flex-wrap gap-2 text-sm text-ink-secondary">
                                    <span
                                        v-for="tagName in characterTagNames(selectedCharacter)"
                                        :key="tagName"
                                        class="rounded-full bg-canvas-soft px-2.5 py-1"
                                    >
                                        {{ tagName }}
                                    </span>
                                    <span v-if="!characterTagNames(selectedCharacter).length">暂无标签。</span>
                                </dd>
                            </div>
                            <div class="sm:col-span-2">
                                <dt class="text-xs font-semibold uppercase tracking-widest text-ink-muted">简介</dt>
                                <dd class="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink-secondary">
                                    {{ selectedCharacter.introduction || '暂无简介。' }}
                                </dd>
                            </div>
                            <div>
                                <dt class="text-xs font-semibold uppercase tracking-widest text-ink-muted">外貌</dt>
                                <dd class="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink-secondary">
                                    {{ selectedCharacter.appearance || '暂无记录。' }}
                                </dd>
                            </div>
                            <div>
                                <dt class="text-xs font-semibold uppercase tracking-widest text-ink-muted">性格</dt>
                                <dd class="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink-secondary">
                                    {{ selectedCharacter.personality || '暂无记录。' }}
                                </dd>
                            </div>
                            <div class="sm:col-span-2">
                                <dt class="text-xs font-semibold uppercase tracking-widest text-ink-muted">背景故事</dt>
                                <dd class="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink-secondary">
                                    {{ selectedCharacter.backstory || '暂无记录。' }}
                                </dd>
                            </div>
                            <div>
                                <dt class="text-xs font-semibold uppercase tracking-widest text-ink-muted">
                                    目标 / 动机
                                </dt>
                                <dd class="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink-secondary">
                                    {{ selectedCharacter.motivation || '暂无记录。' }}
                                </dd>
                            </div>
                            <div>
                                <dt class="text-xs font-semibold uppercase tracking-widest text-ink-muted">能力</dt>
                                <dd class="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink-secondary">
                                    {{ selectedCharacter.abilities || '暂无记录。' }}
                                </dd>
                            </div>
                            <div class="sm:col-span-2">
                                <dt class="text-xs font-semibold uppercase tracking-widest text-ink-muted">备注</dt>
                                <dd class="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink-secondary">
                                    {{ selectedCharacter.notes || '暂无备注。' }}
                                </dd>
                            </div>
                        </dl>
                    </section>
                </template>
                <template v-else>
                    <ProjectDetail
                        :project="selectedProject"
                        @back="showProjectList"
                        @edit="openEditDialog(selectedProject)"
                        @remove="softDeleteProject(selectedProject)"
                        @restore="restoreProject(selectedProject)"
                    >
                        <div class="px-5 py-7 sm:px-7 sm:py-9">
                            <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                <div>
                                    <h2 class="text-lg font-semibold">角色档案</h2>
                                    <p class="mt-2 text-sm text-ink-muted">{{ filteredCharacters.length }} 个角色</p>
                                </div>
                                <button
                                    class="min-h-11 shrink-0 rounded-full bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-active active:bg-primary-active focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                                    type="button"
                                    @click="openCreateCharacter"
                                >
                                    ＋ 新建角色
                                </button>
                            </div>
                            <div
                                class="mt-6 grid gap-4 rounded-lg border border-hairline bg-canvas-soft p-4 sm:grid-cols-2"
                            >
                                <div>
                                    <label
                                        class="mb-2 block text-sm font-medium"
                                        for="character-search"
                                    >
                                        搜索角色
                                    </label>
                                    <input
                                        id="character-search"
                                        v-model="characterSearch"
                                        class="min-h-11 w-full rounded border border-hairline bg-white px-3 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                                        type="search"
                                        placeholder="姓名、别名或简介"
                                    />
                                </div>
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
                            </div>
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
                                            class="min-h-9 rounded-md px-2 text-ink-secondary hover:bg-canvas-soft"
                                            type="button"
                                            :aria-label="`重命名标签：${tag.name}`"
                                            @click="startRenameTag(tag)"
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
                                                @click="saveTagRename"
                                            >
                                                保存标签
                                            </button>
                                            <button
                                                class="min-h-9 rounded-md px-2 text-ink-secondary hover:bg-canvas-soft"
                                                type="button"
                                                @click="cancelRenameTag"
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
                                    v-if="tagDisplayError && !characterDialogMode"
                                    class="mt-3 rounded-md bg-state-error-surface px-3 py-2 text-sm text-state-error"
                                    role="alert"
                                >
                                    {{ tagDisplayError }}
                                </p>
                            </section>
                            <p
                                v-if="characterPageError && !characterDialogMode"
                                class="mt-5 rounded-md bg-state-error-surface px-3 py-2 text-sm text-state-error"
                                role="alert"
                            >
                                {{ characterPageError }}
                            </p>
                            <p
                                v-else-if="charactersLoading"
                                class="mt-7 text-center text-sm text-ink-muted"
                                role="status"
                            >
                                正在读取角色档案…
                            </p>
                            <div
                                v-else-if="filteredCharacters.length"
                                class="mt-6 divide-y divide-hairline border-y border-hairline"
                            >
                                <div
                                    v-for="character in filteredCharacters"
                                    :key="character.id"
                                    class="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
                                >
                                    <div class="min-w-0">
                                        <button
                                            class="max-w-full truncate text-left text-base font-semibold text-ink hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                                            type="button"
                                            @click="openCharacter(character)"
                                        >
                                            {{ character.name }}
                                        </button>
                                        <p class="mt-1 line-clamp-2 text-sm leading-5 text-ink-muted">
                                            {{ character.introduction || '暂无简介。' }}
                                        </p>
                                        <div
                                            v-if="characterTagNames(character).length"
                                            class="mt-2 flex flex-wrap gap-1.5"
                                        >
                                            <span
                                                v-for="tagName in characterTagNames(character)"
                                                :key="tagName"
                                                class="rounded-full bg-canvas-soft px-2 py-0.5 text-xs text-ink-secondary"
                                            >
                                                {{ tagName }}
                                            </span>
                                        </div>
                                    </div>
                                    <button
                                        class="min-h-11 shrink-0 self-start rounded-md px-3 text-sm font-medium text-ink-secondary hover:bg-canvas-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:self-auto"
                                        type="button"
                                        :aria-label="`打开 ${character.name}`"
                                        @click="openCharacter(character)"
                                    >
                                        打开
                                    </button>
                                </div>
                            </div>
                            <p
                                v-else
                                class="mt-7 border-y border-hairline py-8 text-center text-sm text-ink-muted"
                            >
                                {{
                                    characters.length
                                        ? '没有符合当前搜索或筛选条件的角色。'
                                        : '这个项目还没有角色档案。'
                                }}
                            </p>
                        </div>
                    </ProjectDetail>
                </template>
            </template>

            <template v-else>
                <ProjectList
                    :projects="projects"
                    :storage-issues="storageIssues"
                    :loading="loading"
                    :error="pageError"
                    :form-open="Boolean(projectDialogMode)"
                    @create="openCreateDialog"
                    @edit="openEditDialog"
                    @open="openProject"
                    @refresh="loadProjects"
                    @repair="handleProjectRepair"
                />
            </template>
        </div>

        <div
            v-if="characterDialogMode"
            class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4"
            role="presentation"
            tabindex="-1"
            @click.self="closeCharacterDialog"
            @keydown.esc="closeCharacterDialog"
        >
            <section
                class="my-auto w-full max-w-2xl rounded-xl border border-hairline bg-surface p-5 shadow-lg sm:p-7"
                role="dialog"
                aria-modal="true"
                aria-labelledby="character-dialog-title"
            >
                <h2
                    id="character-dialog-title"
                    class="text-xl font-semibold"
                >
                    {{ characterDialogMode === 'edit' ? '编辑角色' : '新建角色' }}
                </h2>
                <p class="mt-1 text-sm text-ink-muted">角色姓名在当前项目中必须唯一。</p>
                <form
                    class="mt-6 space-y-5"
                    @submit.prevent="saveCharacter"
                >
                    <div>
                        <label
                            class="mb-2 block text-sm font-medium"
                            for="character-name"
                        >
                            角色姓名
                        </label>
                        <input
                            id="character-name"
                            v-model="characterForm.name"
                            class="min-h-11 w-full rounded border border-hairline bg-white px-3 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                            name="character-name"
                            maxlength="180"
                            required
                            autocomplete="off"
                        />
                    </div>
                    <div>
                        <label
                            class="mb-2 block text-sm font-medium"
                            for="character-aliases"
                        >
                            别名
                        </label>
                        <textarea
                            id="character-aliases"
                            v-model="characterAliases"
                            class="min-h-20 w-full resize-y rounded border border-hairline bg-white px-3 py-2 text-base leading-6 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                            name="character-aliases"
                            placeholder="每行填写一个别名"
                            rows="2"
                        />
                    </div>
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
                                    v-model="characterForm.tagIds"
                                    type="checkbox"
                                    :aria-label="`角色标签：${tag.name}`"
                                    :value="tag.id"
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
                                class="min-h-10 rounded-md border border-hairline px-3 text-sm font-medium hover:bg-canvas-soft"
                                type="button"
                                @click="createTagFromCharacter"
                            >
                                新建标签
                            </button>
                        </div>
                        <p
                            v-if="tagDisplayError"
                            class="mt-3 rounded-md bg-state-error-surface px-3 py-2 text-sm text-state-error"
                            role="alert"
                        >
                            {{ tagDisplayError }}
                        </p>
                    </fieldset>
                    <div>
                        <label
                            class="mb-2 block text-sm font-medium"
                            for="character-introduction"
                        >
                            角色简介
                        </label>
                        <textarea
                            id="character-introduction"
                            v-model="characterForm.introduction"
                            class="min-h-24 w-full resize-y rounded border border-hairline bg-white px-3 py-2 text-base leading-6 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                            name="character-introduction"
                            rows="3"
                        />
                    </div>
                    <div class="grid gap-5 sm:grid-cols-2">
                        <div>
                            <label
                                class="mb-2 block text-sm font-medium"
                                for="character-appearance"
                            >
                                外貌
                            </label>
                            <textarea
                                id="character-appearance"
                                v-model="characterForm.appearance"
                                class="min-h-24 w-full resize-y rounded border border-hairline bg-white px-3 py-2 text-base leading-6 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                                name="character-appearance"
                                rows="3"
                            />
                        </div>
                        <div>
                            <label
                                class="mb-2 block text-sm font-medium"
                                for="character-personality"
                            >
                                性格
                            </label>
                            <textarea
                                id="character-personality"
                                v-model="characterForm.personality"
                                class="min-h-24 w-full resize-y rounded border border-hairline bg-white px-3 py-2 text-base leading-6 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                                name="character-personality"
                                rows="3"
                            />
                        </div>
                    </div>
                    <div>
                        <label
                            class="mb-2 block text-sm font-medium"
                            for="character-backstory"
                        >
                            背景故事
                        </label>
                        <textarea
                            id="character-backstory"
                            v-model="characterForm.backstory"
                            class="min-h-28 w-full resize-y rounded border border-hairline bg-white px-3 py-2 text-base leading-6 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                            name="character-backstory"
                            rows="4"
                        />
                    </div>
                    <div class="grid gap-5 sm:grid-cols-2">
                        <div>
                            <label
                                class="mb-2 block text-sm font-medium"
                                for="character-motivation"
                            >
                                目标 / 动机
                            </label>
                            <textarea
                                id="character-motivation"
                                v-model="characterForm.motivation"
                                class="min-h-24 w-full resize-y rounded border border-hairline bg-white px-3 py-2 text-base leading-6 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                                name="character-motivation"
                                rows="3"
                            />
                        </div>
                        <div>
                            <label
                                class="mb-2 block text-sm font-medium"
                                for="character-abilities"
                            >
                                能力
                            </label>
                            <textarea
                                id="character-abilities"
                                v-model="characterForm.abilities"
                                class="min-h-24 w-full resize-y rounded border border-hairline bg-white px-3 py-2 text-base leading-6 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                                name="character-abilities"
                                rows="3"
                            />
                        </div>
                    </div>
                    <div>
                        <label
                            class="mb-2 block text-sm font-medium"
                            for="character-notes"
                        >
                            备注
                        </label>
                        <textarea
                            id="character-notes"
                            v-model="characterForm.notes"
                            class="min-h-24 w-full resize-y rounded border border-hairline bg-white px-3 py-2 text-base leading-6 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                            name="character-notes"
                            rows="3"
                        />
                    </div>
                    <p
                        v-if="formError"
                        class="rounded-md bg-state-error-surface px-3 py-2 text-sm text-state-error"
                        role="alert"
                    >
                        {{ formError }}
                    </p>
                    <div class="flex flex-col-reverse justify-end gap-2 border-t border-hairline pt-4 sm:flex-row">
                        <button
                            class="min-h-11 rounded-full border border-hairline px-4 text-sm font-medium hover:bg-canvas-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                            type="button"
                            :disabled="saving"
                            @click="closeCharacterDialog"
                        >
                            取消
                        </button>
                        <button
                            class="min-h-11 rounded-full bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-active active:bg-primary-active focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-wait disabled:opacity-60"
                            type="submit"
                            :disabled="saving"
                        >
                            {{ saving ? '保存中…' : characterDialogMode === 'edit' ? '保存角色' : '创建角色' }}
                        </button>
                    </div>
                </form>
            </section>
        </div>

        <ProjectForm
            v-if="projectDialogMode"
            :mode="projectDialogMode"
            :project="editingProject"
            :saving="projectSaving"
            :error="projectFormError"
            @close="closeDialog"
            @submit="saveProject"
        />
    </main>
</template>
