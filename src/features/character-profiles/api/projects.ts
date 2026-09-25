import type { Project, ProjectInput, ProjectListResult, ProjectRepairResolution } from '../types/project'
import { request } from './request'

export async function listProjects(): Promise<ProjectListResult> {
    return request<ProjectListResult>('/projects', {}, '请求本地项目服务失败。')
}

export async function createProject(input: ProjectInput): Promise<Project> {
    const result = await request<{ project: Project }>(
        '/projects',
        {
            method: 'POST',
            body: JSON.stringify(input)
        },
        '请求本地项目服务失败。'
    )
    return result.project
}

export async function updateProject(id: string, input: ProjectInput): Promise<Project> {
    const result = await request<{ project: Project }>(
        `/projects/${encodeURIComponent(id)}`,
        {
            method: 'PATCH',
            body: JSON.stringify(input)
        },
        '请求本地项目服务失败。'
    )
    return result.project
}

export async function repairProject(directoryName: string, resolution: ProjectRepairResolution): Promise<void> {
    await request<{ repaired: boolean }>(
        '/projects/repair',
        {
            method: 'POST',
            body: JSON.stringify({ directoryName, resolution })
        },
        '请求本地项目服务失败。'
    )
}
