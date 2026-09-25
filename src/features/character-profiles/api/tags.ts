import type { Tag, TagInput, TagListResult } from '../types/tag'

export async function listTags(projectId: string): Promise<TagListResult> {
    return request<TagListResult>(`/projects/${encodeURIComponent(projectId)}/tags`)
}

export async function createTag(projectId: string, input: TagInput): Promise<Tag> {
    const result = await request<{ tag: Tag }>(`/projects/${encodeURIComponent(projectId)}/tags`, {
        method: 'POST',
        body: JSON.stringify(input)
    })
    return result.tag
}

export async function renameTag(projectId: string, tagId: string, input: TagInput): Promise<Tag> {
    const result = await request<{ tag: Tag }>(
        `/projects/${encodeURIComponent(projectId)}/tags/${encodeURIComponent(tagId)}`,
        { method: 'PATCH', body: JSON.stringify(input) }
    )
    return result.tag
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`/api${path}`, {
        ...options,
        headers: { 'Content-Type': 'application/json', ...options.headers }
    })
    const body = (await response.json()) as T | { error?: string }

    if (!response.ok) {
        const message = typeof body === 'object' && body !== null && 'error' in body ? body.error : undefined
        throw new Error(typeof message === 'string' ? message : '请求本地标签服务失败。')
    }

    return body as T
}
