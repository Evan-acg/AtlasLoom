import type { Project, ProjectInput, ProjectListResult, ProjectRepairResolution } from '../types/project'

export async function listProjects(): Promise<ProjectListResult> {
    return request<ProjectListResult>('/projects')
}

export async function createProject(input: ProjectInput): Promise<Project> {
    const result = await request<{ project: Project }>('/projects', {
        method: 'POST',
        body: JSON.stringify(input)
    })
    return result.project
}

export async function updateProject(id: string, input: ProjectInput): Promise<Project> {
    const result = await request<{ project: Project }>(`/projects/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify(input)
    })
    return result.project
}

export async function repairProject(directoryName: string, resolution: ProjectRepairResolution): Promise<void> {
    await request<{ repaired: boolean }>('/projects/repair', {
        method: 'POST',
        body: JSON.stringify({ directoryName, resolution })
    })
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`/api${path}`, {
        ...options,
        headers: { 'Content-Type': 'application/json', ...options.headers }
    })
    const body = (await response.json()) as T | { error?: string }

    if (!response.ok) {
        const message = typeof body === 'object' && body !== null && 'error' in body ? body.error : undefined
        throw new Error(typeof message === 'string' ? message : '请求本地项目服务失败。')
    }

    return body as T
}
