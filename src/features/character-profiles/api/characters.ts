import type { Character, CharacterInput, CharacterListResult } from '../types/character'
import { request } from './request'

export async function listCharacters(projectId: string): Promise<CharacterListResult> {
    return request<CharacterListResult>(
        `/projects/${encodeURIComponent(projectId)}/characters`,
        {},
        '请求本地角色服务失败。'
    )
}

export async function createCharacter(projectId: string, input: CharacterInput): Promise<Character> {
    const result = await request<{ character: Character }>(
        `/projects/${encodeURIComponent(projectId)}/characters`,
        {
            method: 'POST',
            body: JSON.stringify(input)
        },
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
        `/projects/${encodeURIComponent(projectId)}/characters/${encodeURIComponent(characterId)}`,
        { method: 'PATCH', body: JSON.stringify(input) },
        '请求本地角色服务失败。'
    )
    return result.character
}
