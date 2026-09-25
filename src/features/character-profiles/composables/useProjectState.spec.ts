import { describe, expect, it } from 'vitest'
import type { Project } from '../types/project'
import type { ProjectWorkspaceProjectAdapter } from '../types/workspace'
import { useProjectState } from './useProjectState'

describe('project state', () => {
    it('keeps a newer refresh authoritative and loading until it completes', async () => {
        const firstProject = createProject('first', 'First')
        const secondProject = createProject('second', 'Second')
        let releaseFirst!: (result: { projects: Project[]; deletedProjects: Project[]; issues: [] }) => void
        let listCall = 0
        const state = useProjectState({
            ...adapterDefaults(),
            list: async () => {
                listCall += 1
                return listCall === 1
                    ? new Promise((resolve) => {
                          releaseFirst = resolve
                      })
                    : { projects: [secondProject], deletedProjects: [], issues: [] }
            }
        })

        const firstRefresh = state.refresh()
        await new Promise((resolve) => setTimeout(resolve, 0))
        const secondRefresh = state.refresh()
        await secondRefresh

        expect(state.projects.value).toEqual([secondProject])
        expect(state.loading.value).toBe(false)
        releaseFirst({ projects: [firstProject], deletedProjects: [], issues: [] })
        await firstRefresh

        expect(state.projects.value).toEqual([secondProject])
    })

    it('isolates project request errors and exposes the error without rejecting the load', async () => {
        const state = useProjectState({
            ...adapterDefaults(),
            list: async () => {
                throw new Error('项目读取失败')
            }
        })

        await expect(state.load(null)).resolves.toBeUndefined()

        expect(state.error.value).toBe('项目读取失败')
        expect(state.projects.value).toEqual([])
        expect(state.loading.value).toBe(false)
    })

    it('supports an explicit refresh without changing the selected project', async () => {
        const project = createProject('project', 'Project')
        let listCall = 0
        const state = useProjectState({
            ...adapterDefaults(),
            list: async () => {
                listCall += 1
                return { projects: [project], deletedProjects: [], issues: [] }
            }
        })

        await state.load(project.id)
        await state.refresh()

        expect(listCall).toBe(2)
        expect(state.selectedProject.value).toEqual(project)
    })
})

function adapterDefaults(): ProjectWorkspaceProjectAdapter {
    const project = createProject('default', 'Default')
    return {
        list: async () => ({ projects: [project], deletedProjects: [], issues: [] }),
        create: async () => project,
        update: async () => project,
        remove: async () => project,
        restore: async () => project,
        repair: async () => undefined
    }
}

function createProject(id: string, name: string): Project {
    return { id, name, description: '', createdAt: '', updatedAt: '', history: [] }
}
