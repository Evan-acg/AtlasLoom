<script setup lang="ts">
    import { computed, ref, watch } from 'vue'
    import CharacterDetail from './CharacterDetail.vue'
    import CharacterForm from './CharacterForm.vue'
    import CharacterList from './CharacterList.vue'
    import type { Character, CharacterInput, CharacterStorageIssue } from '../types/character'
    import type { Project } from '../types/project'
    import type { Tag, TagInput } from '../types/tag'
    import type { CharacterSaveState } from '../types/workspace'

    const props = defineProps<{
        project: Project
        characters: Character[]
        deletedCharacters: Character[]
        characterIssues: CharacterStorageIssue[]
        selectedCharacterId: string | null
        loading: boolean
        error: string
        tags: Tag[]
        tagError: string
        tagsLoading: boolean
        tagsSaving: boolean
        saveState: CharacterSaveState
        createTag: (input: TagInput) => Promise<Tag | undefined>
    }>()

    const emit = defineEmits<{
        selectCharacter: [characterId: string]
        showList: []
        saveCharacter: [characterId: string | undefined, input: CharacterInput]
        resetSaveState: []
        deleteCharacter: [characterId: string]
        restoreCharacter: [characterId: string]
    }>()

    const dialogMode = ref<'create' | 'edit' | null>(null)
    const editingCharacter = ref<Character | undefined>()
    const saving = computed(() => props.saveState.status === 'saving')
    const formError = computed(() => (props.saveState.status === 'error' ? props.saveState.message : ''))
    const selectedCharacter = computed(() => {
        if (!props.selectedCharacterId) return null
        return (
            [...props.characters, ...props.deletedCharacters].find(
                (character) => character.id === props.selectedCharacterId
            ) ?? null
        )
    })

    watch(
        () => props.saveState,
        (saveState) => {
            if (saveState.status !== 'success') return
            dialogMode.value = null
            editingCharacter.value = undefined
            emit('selectCharacter', saveState.character.id)
        }
    )

    function saveCharacter(input: CharacterInput) {
        emit('saveCharacter', editingCharacter.value?.id, input)
    }

    function openCreateCharacter() {
        emit('resetSaveState')
        editingCharacter.value = undefined
        dialogMode.value = 'create'
    }

    function openEditCharacter() {
        if (!selectedCharacter.value || selectedCharacter.value.deletedAt) return
        emit('resetSaveState')
        editingCharacter.value = selectedCharacter.value
        dialogMode.value = 'edit'
    }

    function closeForm() {
        if (saving.value) return
        dialogMode.value = null
        editingCharacter.value = undefined
    }

    function deleteSelectedCharacter() {
        const character = selectedCharacter.value
        if (!character) return
        const confirmed = globalThis.confirm(`角色“${character.name}”将从正常浏览中隐藏。是否继续？`)
        if (!confirmed) return
        emit('deleteCharacter', character.id)
    }

    function restoreSelectedCharacter() {
        if (!selectedCharacter.value) return
        emit('restoreCharacter', selectedCharacter.value.id)
    }
</script>

<template>
    <template v-if="selectedCharacter">
        <CharacterDetail
            :character="selectedCharacter"
            :project-name="project.name"
            :tags="tags"
            @back="emit('showList')"
            @edit="openEditCharacter"
            @delete="deleteSelectedCharacter"
            @restore="restoreSelectedCharacter"
        />
    </template>
    <CharacterList
        v-else
        :characters="characters"
        :tags="tags"
        :loading="loading"
        :error="dialogMode ? '' : error"
        :storage-issues="characterIssues"
        @create="openCreateCharacter"
        @select="(characterId) => emit('selectCharacter', characterId)"
    />

    <CharacterForm
        v-if="dialogMode"
        :key="editingCharacter?.id ?? 'new'"
        :mode="dialogMode"
        :character="editingCharacter"
        :tags="tags"
        :saving="saving"
        :error="formError"
        :tag-error="tagError"
        :tags-loading="tagsLoading"
        :tags-saving="tagsSaving"
        :create-tag="props.createTag"
        @submit="saveCharacter"
        @close="closeForm"
    />
</template>
