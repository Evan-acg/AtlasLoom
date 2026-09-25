import { ref, type Ref } from 'vue'
import type { Character, CharacterInput } from '../types/character'
import type { ProjectWorkspaceCharacterAdapter } from '../types/workspace'

export function useCharacterWorkspace(
    adapter: ProjectWorkspaceCharacterAdapter,
    selectedProjectId: Ref<string | null>
) {
    const characters = ref<Character[]>([])
    const deletedCharacters = ref<Character[]>([])
    const loading = ref(false)
    const error = ref('')
    let requestToken = 0

    function reset() {
        requestToken += 1
        characters.value = []
        deletedCharacters.value = []
        loading.value = false
        error.value = ''
    }

    async function refresh(projectId = selectedProjectId.value) {
        const token = ++requestToken
        if (!projectId) {
            characters.value = []
            deletedCharacters.value = []
            loading.value = false
            error.value = ''
            return
        }

        loading.value = true
        error.value = ''
        try {
            const result = await adapter.list(projectId)
            if (!isCurrent(projectId, token)) return
            characters.value = result.characters
            deletedCharacters.value = result.deletedCharacters
        } catch (reason) {
            if (isCurrent(projectId, token)) error.value = errorMessage(reason)
            throw reason
        } finally {
            if (isCurrent(projectId, token)) loading.value = false
        }
    }

    async function create(input: CharacterInput) {
        const projectId = selectedProjectId.value
        if (!projectId) return
        try {
            const character = await adapter.create(projectId, input)
            if (!isSelectedProject(projectId)) return
            await refresh(projectId)
            return character
        } catch (reason) {
            if (isSelectedProject(projectId)) error.value = errorMessage(reason)
            throw reason
        }
    }

    async function update(characterId: string, input: CharacterInput) {
        const projectId = selectedProjectId.value
        if (!projectId) return
        try {
            const character = await adapter.update(projectId, characterId, input)
            if (!isSelectedProject(projectId)) return
            await refresh(projectId)
            return character
        } catch (reason) {
            if (isSelectedProject(projectId)) error.value = errorMessage(reason)
            throw reason
        }
    }

    async function remove(characterId: string) {
        const projectId = selectedProjectId.value
        if (!projectId) return
        try {
            const character = await adapter.remove(projectId, characterId)
            if (!isSelectedProject(projectId)) return
            await refresh(projectId)
            return character
        } catch (reason) {
            if (isSelectedProject(projectId)) error.value = errorMessage(reason)
            throw reason
        }
    }

    async function restore(characterId: string) {
        const projectId = selectedProjectId.value
        if (!projectId) return
        try {
            const character = await adapter.restore(projectId, characterId)
            if (!isSelectedProject(projectId)) return
            await refresh(projectId)
            return character
        } catch (reason) {
            if (isSelectedProject(projectId)) error.value = errorMessage(reason)
            throw reason
        }
    }

    function isSelectedProject(projectId: string): boolean {
        return selectedProjectId.value === projectId
    }

    function isCurrent(projectId: string, token: number): boolean {
        return token === requestToken && isSelectedProject(projectId)
    }

    return {
        characters,
        deletedCharacters,
        loading,
        error,
        reset,
        refresh,
        create,
        update,
        remove,
        restore
    }
}

function errorMessage(reason: unknown): string {
    return reason instanceof Error ? reason.message : '本地项目服务暂时无法处理请求。'
}
