import type { Project, ProjectInput, ProjectListResult, ProjectRepairResolution } from '../types/project'
import { request } from '../../../shared/utils/request'

export async function listProjects(): Promise<ProjectListResult> {
    return request<ProjectListResult>({ url: '/projects' }, '请求本地项目服务失败。')
}

export async function createProject(input: ProjectInput): Promise<Project> {
    const result = await request<{ project: Project }>(
        { url: '/projects', method: 'POST', data: input },
        '请求本地项目服务失败。'
    )
    return result.project
}

export async function updateProject(id: string, input: ProjectInput): Promise<Project> {
    const result = await request<{ project: Project }>(
        { url: `/projects/${encodeURIComponent(id)}`, method: 'PATCH', data: input },
        '请求本地项目服务失败。'
    )
    return result.project
}

export async function repairProject(directoryName: string, resolution: ProjectRepairResolution): Promise<void> {
    await request<{ repaired: boolean }>(
        { url: '/projects/repair', method: 'POST', data: { directoryName, resolution } },
        '请求本地项目服务失败。'
    )
}
