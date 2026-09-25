import type { Character, CharacterInput, CharacterListResult } from '../types/character'

export async function listCharacters(projectId: string): Promise<CharacterListResult> {
    return request<CharacterListResult>(`/projects/${encodeURIComponent(projectId)}/characters`)
}

export async function createCharacter(projectId: string, input: CharacterInput): Promise<Character> {
    const result = await request<{ character: Character }>(`/projects/${encodeURIComponent(projectId)}/characters`, {
        method: 'POST',
        body: JSON.stringify(input)
    })
    return result.character
}

export async function updateCharacter(
    projectId: string,
    characterId: string,
    input: CharacterInput
): Promise<Character> {
    const result = await request<{ character: Character }>(
        `/projects/${encodeURIComponent(projectId)}/characters/${encodeURIComponent(characterId)}`,
        { method: 'PATCH', body: JSON.stringify(input) }
    )
    return result.character
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`/api${path}`, {
        ...options,
        headers: { 'Content-Type': 'application/json', ...options.headers }
    })
    const body = (await response.json()) as T | { error?: string }

    if (!response.ok) {
        const message = typeof body === 'object' && body !== null && 'error' in body ? body.error : undefined
        throw new Error(typeof message === 'string' ? message : '请求本地角色服务失败。')
    }

    return body as T
}
