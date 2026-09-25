import type { Tag, TagInput, TagListResult } from '../types/tag'
import { request } from './request'

export async function listTags(projectId: string): Promise<TagListResult> {
    return request<TagListResult>({ url: `/projects/${encodeURIComponent(projectId)}/tags` }, '请求本地标签服务失败。')
}

export async function createTag(projectId: string, input: TagInput): Promise<Tag> {
    const result = await request<{ tag: Tag }>(
        { url: `/projects/${encodeURIComponent(projectId)}/tags`, method: 'POST', data: input },
        '请求本地标签服务失败。'
    )
    return result.tag
}

export async function renameTag(projectId: string, tagId: string, input: TagInput): Promise<Tag> {
    const result = await request<{ tag: Tag }>(
        {
            url: `/projects/${encodeURIComponent(projectId)}/tags/${encodeURIComponent(tagId)}`,
            method: 'PATCH',
            data: input
        },
        '请求本地标签服务失败。'
    )
    return result.tag
}
