import type { Character, CharacterInput, CharacterListResult } from '../types/character'
import { request } from '../../../shared/utils/request'

export async function listCharacters(projectId: string): Promise<CharacterListResult> {
    return request<CharacterListResult>(
        { url: `/projects/${encodeURIComponent(projectId)}/characters` },
        '请求本地角色服务失败。'
    )
}

export async function createCharacter(projectId: string, input: CharacterInput): Promise<Character> {
    const result = await request<{ character: Character }>(
        { url: `/projects/${encodeURIComponent(projectId)}/characters`, method: 'POST', data: input },
        '请求本地角色服务失败。'
    )
    return result.character
}

export async function updateCharacter(
    projectId: string,
    characterId: string,
    input: CharacterInput
): Promise<Character> {
    const result = await request<{ character: Character }>(
        {
            url: `/projects/${encodeURIComponent(projectId)}/characters/${encodeURIComponent(characterId)}`,
            method: 'PATCH',
            data: input
        },
        '请求本地角色服务失败。'
    )
    return result.character
}

export async function deleteCharacter(projectId: string, characterId: string): Promise<Character> {
    const result = await request<{ character: Character }>(
        `/projects/${encodeURIComponent(projectId)}/characters/${encodeURIComponent(characterId)}`,
        { method: 'DELETE' },
        '请求本地角色服务失败。'
    )
    return result.character
}

export async function restoreCharacter(projectId: string, characterId: string): Promise<Character> {
    const result = await request<{ character: Character }>(
        `/projects/${encodeURIComponent(projectId)}/characters/${encodeURIComponent(characterId)}/restore`,
        { method: 'POST' },
        '请求本地角色服务失败。'
    )
    return result.character
}
