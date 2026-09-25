<script setup lang="ts">
    import { computed, ref } from 'vue'
    import CharacterDetail from './CharacterDetail.vue'
    import CharacterForm from './CharacterForm.vue'
    import CharacterList from './CharacterList.vue'
    import type { Character, CharacterInput } from '../types/character'
    import type { Project } from '../types/project'
    import type { Tag, TagInput } from '../types/tag'
    import { getCharacterProfilesErrorMessage } from '../utils/error-message'

    const props = defineProps<{
        project: Project
        characters: Character[]
        deletedCharacters: Character[]
        selectedCharacterId: string | null
        loading: boolean
        error: string
        tags: Tag[]
        tagError: string
        tagsLoading: boolean
        tagsSaving: boolean
        createCharacter: (input: CharacterInput) => Promise<Character | undefined>
        updateCharacter: (characterId: string, input: CharacterInput) => Promise<Character | undefined>
        deleteCharacter: (characterId: string) => Promise<Character | undefined>
        restoreCharacter: (characterId: string) => Promise<Character | undefined>
        createTag: (input: TagInput) => Promise<Tag | undefined>
    }>()

    const emit = defineEmits<{
        selectCharacter: [characterId: string]
        showList: []
    }>()

    const dialogMode = ref<'create' | 'edit' | null>(null)
    const editingCharacter = ref<Character | undefined>()
    const saving = ref(false)
    const formError = ref('')
    const selectedCharacter = computed(() => {
        if (!props.selectedCharacterId) return null
        return (
            [...props.characters, ...props.deletedCharacters].find(
                (character) => character.id === props.selectedCharacterId
            ) ?? null
        )
    })

    async function saveCharacter(input: CharacterInput) {
        saving.value = true
        formError.value = ''
        try {
            const character =
                dialogMode.value === 'edit' && editingCharacter.value
                    ? await props.updateCharacter(editingCharacter.value.id, input)
                    : await props.createCharacter(input)
            if (!character) return
            dialogMode.value = null
            editingCharacter.value = undefined
            emit('selectCharacter', character.id)
        } catch (reason) {
            formError.value = getCharacterProfilesErrorMessage(reason)
        } finally {
            saving.value = false
        }
    }

    function openCreateCharacter() {
        editingCharacter.value = undefined
        dialogMode.value = 'create'
        formError.value = ''
    }

    function openEditCharacter() {
        if (!selectedCharacter.value || selectedCharacter.value.deletedAt) return
        editingCharacter.value = selectedCharacter.value
        dialogMode.value = 'edit'
        formError.value = ''
    }

    function closeForm() {
        if (saving.value) return
        dialogMode.value = null
        editingCharacter.value = undefined
        formError.value = ''
    }

    async function deleteSelectedCharacter() {
        const character = selectedCharacter.value
        if (!character) return
        const confirmed = globalThis.confirm(`角色“${character.name}”将从正常浏览中隐藏。是否继续？`)
        if (!confirmed) return
        try {
            await props.deleteCharacter(character.id)
        } catch {
            return
        }
    }

    async function restoreSelectedCharacter() {
        if (!selectedCharacter.value) return
        try {
            await props.restoreCharacter(selectedCharacter.value.id)
        } catch {
            return
        }
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
