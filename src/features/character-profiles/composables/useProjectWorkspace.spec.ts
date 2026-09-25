import { describe, expect, it } from 'vitest'
import type { Character, CharacterInput } from '../types/character'
import type { Project, ProjectRepairResolution } from '../types/project'
import type { Tag } from '../types/tag'
import { useProjectWorkspace } from './useProjectWorkspace'

describe('project workspace state', () => {
    // Given a project workspace with injected project, character, and tag adapters
    // When the selected project changes
    // Then the workspace resets and loads only the new project's characters and tags
    it('loads project-scoped characters and tags after selecting a project', async () => {
        const projectA = createProject('project-a', 'Project A')
        const projectB = createProject('project-b', 'Project B')
        const characterB = createCharacter('character-b', projectB.id)
        const tagB = createTag('tag-b', projectB.id)
        const workspace = useProjectWorkspace({
            projects: {
                list: async () => ({ projects: [projectA, projectB], deletedProjects: [], issues: [] }),
                create: async () => projectB,
                update: async () => projectB,
                remove: async () => projectB,
                restore: async () => projectB,
                repair: async () => undefined
            },
            characters: {
                list: async (projectId: string) => ({
                    characters: projectId === projectB.id ? [characterB] : [],
                    deletedCharacters: []
                }),
                create: async () => characterB,
                update: async () => characterB,
                remove: async () => characterB,
                restore: async () => characterB
            },
            tags: {
                list: async (projectId: string) => ({ tags: projectId === projectB.id ? [tagB] : [] }),
                create: async () => tagB,
                rename: async () => tagB
            }
        })

        await workspace.load('project-b')

        expect(workspace.selectedProject.value).toEqual(projectB)
        expect(workspace.characters.value).toEqual([characterB])
        expect(workspace.tags.value).toEqual([tagB])
    })

    // Given a project workspace whose character adapter fails
    // When the workspace loads the selected project
    // Then it exposes a character-specific error without replacing project or tag state
    it('keeps resource errors isolated', async () => {
        const project = createProject('project-a', 'Project A')
        const tag = createTag('tag-a', project.id)
        const workspace = useProjectWorkspace({
            projects: {
                list: async () => ({ projects: [project], deletedProjects: [], issues: [] }),
                create: async () => project,
                update: async () => project,
                remove: async () => project,
                restore: async () => project,
                repair: async () => undefined
            },
            characters: {
                list: async () => {
                    throw new Error('角色读取失败')
                },
                create: async () => createCharacter('character-a', project.id),
                update: async () => createCharacter('character-a', project.id),
                remove: async () => createCharacter('character-a', project.id),
                restore: async () => createCharacter('character-a', project.id)
            },
            tags: {
                list: async () => ({ tags: [tag] }),
                create: async () => tag,
                rename: async () => tag
            }
        })

        await workspace.load(project.id)

        expect(workspace.characterError.value).toBe('角色读取失败')
        expect(workspace.projects.value).toEqual([project])
        expect(workspace.tags.value).toEqual([tag])
    })

    // Given a soft-deleted character in the selected project
    // When the workspace restores that character
    // Then it refreshes the selected project's characters without changing project deletion state
    it('restores a character independently from its project', async () => {
        const project = createProject('project-a', 'Project A')
        const deletedCharacter = {
            ...createCharacter('character-a', project.id),
            deletedAt: '2026-01-01T00:00:00.000Z'
        }
        const restoredCharacter = createCharacter('character-a', project.id)
        let activeCharacters: Character[] = []
        let deletedCharacters: Character[] = [deletedCharacter]
        const workspace = useProjectWorkspace({
            projects: {
                list: async () => ({ projects: [project], deletedProjects: [], issues: [] }),
                create: async () => project,
                update: async () => project,
                remove: async () => project,
                restore: async () => project,
                repair: async () => undefined
            },
            characters: {
                list: async () => ({ characters: activeCharacters, deletedCharacters }),
                create: async () => restoredCharacter,
                update: async () => restoredCharacter,
                remove: async () => deletedCharacter,
                restore: async () => {
                    activeCharacters = [restoredCharacter]
                    deletedCharacters = []
                    return restoredCharacter
                }
            },
            tags: {
                list: async () => ({ tags: [] }),
                create: async () => createTag('tag-a', project.id),
                rename: async () => createTag('tag-a', project.id)
            }
        })

        await workspace.load(project.id)
        await workspace.restoreCharacter(deletedCharacter.id)

        expect(workspace.selectedProject.value).toEqual(project)
        expect(workspace.characters.value).toEqual([restoredCharacter])
        expect(workspace.deletedCharacters.value).toEqual([])
    })

    // Given a project workspace with a project adapter that persists a new project
    // When the workspace creates a project
    // Then it refreshes the project collection from the adapter
    it('refreshes projects after creating a project', async () => {
        const project = createProject('project-a', 'Project A')
        const createdProject = createProject('project-b', 'Project B')
        let currentProjects = [project]
        const workspace = useProjectWorkspace({
            projects: {
                list: async () => ({ projects: currentProjects, deletedProjects: [], issues: [] }),
                create: async () => {
                    currentProjects = [...currentProjects, createdProject]
                    return createdProject
                },
                update: async () => project,
                remove: async () => project,
                restore: async () => project,
                repair: async () => undefined
            },
            characters: {
                list: async () => ({ characters: [], deletedCharacters: [] }),
                create: async () => createCharacter('character-a', project.id),
                update: async () => createCharacter('character-a', project.id),
                remove: async () => createCharacter('character-a', project.id),
                restore: async () => createCharacter('character-a', project.id)
            },
            tags: {
                list: async () => ({ tags: [] }),
                create: async () => createTag('tag-a', project.id),
                rename: async () => createTag('tag-a', project.id)
            }
        })

        await workspace.load(null)
        await workspace.createProject({ name: createdProject.name, description: createdProject.description })

        expect(workspace.projects.value).toEqual([project, createdProject])
    })

    // Given a selected project and a character adapter that persists a new character
    // When the workspace creates a character
    // Then it refreshes characters for the selected project
    it('refreshes characters after creating a character', async () => {
        const project = createProject('project-a', 'Project A')
        const createdCharacter = createCharacter('character-a', project.id)
        let currentCharacters: Character[] = []
        const workspace = useProjectWorkspace({
            projects: {
                list: async () => ({ projects: [project], deletedProjects: [], issues: [] }),
                create: async () => project,
                update: async () => project,
                remove: async () => project,
                restore: async () => project,
                repair: async () => undefined
            },
            characters: {
                list: async () => ({ characters: currentCharacters, deletedCharacters: [] }),
                create: async () => {
                    currentCharacters = [createdCharacter]
                    return createdCharacter
                },
                update: async () => createdCharacter,
                remove: async () => createdCharacter,
                restore: async () => createdCharacter
            },
            tags: {
                list: async () => ({ tags: [] }),
                create: async () => createTag('tag-a', project.id),
                rename: async () => createTag('tag-a', project.id)
            }
        })

        await workspace.load(project.id)
        await workspace.createCharacter({ name: createdCharacter.name } as CharacterInput)

        expect(workspace.characters.value).toEqual([createdCharacter])
    })

    // Given a selected project and a tag adapter that persists a new tag
    // When the workspace creates a tag
    // Then it refreshes tags for the selected project
    it('refreshes tags after creating a tag', async () => {
        const project = createProject('project-a', 'Project A')
        const createdTag = createTag('tag-a', project.id)
        let currentTags: Tag[] = []
        const workspace = useProjectWorkspace({
            projects: {
                list: async () => ({ projects: [project], deletedProjects: [], issues: [] }),
                create: async () => project,
                update: async () => project,
                remove: async () => project,
                restore: async () => project,
                repair: async () => undefined
            },
            characters: {
                list: async () => ({ characters: [], deletedCharacters: [] }),
                create: async () => createCharacter('character-a', project.id),
                update: async () => createCharacter('character-a', project.id),
                remove: async () => createCharacter('character-a', project.id),
                restore: async () => createCharacter('character-a', project.id)
            },
            tags: {
                list: async () => ({ tags: currentTags }),
                create: async () => {
                    currentTags = [createdTag]
                    return createdTag
                },
                rename: async () => createdTag
            }
        })

        await workspace.load(project.id)
        await workspace.createTag({ name: createdTag.name })

        expect(workspace.tags.value).toEqual([createdTag])
    })

    // Given a project workspace with an existing project
    // When the workspace updates that project
    // Then it refreshes the project collection with the updated record
    it('refreshes projects after updating a project', async () => {
        const project = createProject('project-a', 'Project A')
        const updatedProject = { ...project, name: 'Renamed Project' }
        let currentProject = project
        const workspace = useProjectWorkspace({
            projects: {
                list: async () => ({ projects: [currentProject], deletedProjects: [], issues: [] }),
                create: async () => currentProject,
                update: async () => {
                    currentProject = updatedProject
                    return updatedProject
                },
                remove: async () => currentProject,
                restore: async () => currentProject,
                repair: async () => undefined
            },
            characters: {
                list: async () => ({ characters: [], deletedCharacters: [] }),
                create: async () => createCharacter('character-a', project.id),
                update: async () => createCharacter('character-a', project.id),
                remove: async () => createCharacter('character-a', project.id),
                restore: async () => createCharacter('character-a', project.id)
            },
            tags: {
                list: async () => ({ tags: [] }),
                create: async () => createTag('tag-a', project.id),
                rename: async () => createTag('tag-a', project.id)
            }
        })

        await workspace.load(null)
        await workspace.updateProject(project.id, {
            name: updatedProject.name,
            description: updatedProject.description
        })

        expect(workspace.projects.value).toEqual([updatedProject])
    })

    // Given an active project in a project workspace
    // When the workspace soft-deletes and restores that project
    // Then the project moves between active and deleted collections without changing the selected project
    it('keeps project soft-delete state in one workspace owner', async () => {
        const project = createProject('project-a', 'Project A')
        const deletedProject = { ...project, deletedAt: '2026-01-01T00:00:00.000Z' }
        let activeProjects = [project]
        let deletedProjects: Project[] = []
        const workspace = useProjectWorkspace({
            projects: {
                list: async () => ({ projects: activeProjects, deletedProjects, issues: [] }),
                create: async () => project,
                update: async () => project,
                remove: async () => {
                    activeProjects = []
                    deletedProjects = [deletedProject]
                    return deletedProject
                },
                restore: async () => {
                    activeProjects = [project]
                    deletedProjects = []
                    return project
                },
                repair: async () => undefined
            },
            characters: {
                list: async () => ({ characters: [], deletedCharacters: [] }),
                create: async () => createCharacter('character-a', project.id),
                update: async () => createCharacter('character-a', project.id),
                remove: async () => createCharacter('character-a', project.id),
                restore: async () => createCharacter('character-a', project.id)
            },
            tags: {
                list: async () => ({ tags: [] }),
                create: async () => createTag('tag-a', project.id),
                rename: async () => createTag('tag-a', project.id)
            }
        })

        await workspace.load(project.id)
        await workspace.deleteProject(project.id)
        expect(workspace.projects.value).toEqual([])
        expect(workspace.deletedProjects.value).toEqual([deletedProject])
        expect(workspace.selectedProject.value).toEqual(deletedProject)

        await workspace.restoreProject(project.id)
        expect(workspace.projects.value).toEqual([project])
        expect(workspace.deletedProjects.value).toEqual([])
        expect(workspace.selectedProject.value).toEqual(project)
    })

    // Given an active character in a selected project
    // When the workspace updates and soft-deletes that character
    // Then the character moves through the workspace-owned active and deleted collections
    it('keeps character mutations in the selected project workspace', async () => {
        const project = createProject('project-a', 'Project A')
        const character = createCharacter('character-a', project.id)
        const updatedCharacter = { ...character, name: 'Updated Character' }
        const deletedCharacter = { ...updatedCharacter, deletedAt: '2026-01-01T00:00:00.000Z' }
        let activeCharacters = [character]
        let deletedCharacters: Character[] = []
        const workspace = useProjectWorkspace({
            projects: {
                list: async () => ({ projects: [project], deletedProjects: [], issues: [] }),
                create: async () => project,
                update: async () => project,
                remove: async () => project,
                restore: async () => project,
                repair: async () => undefined
            },
            characters: {
                list: async () => ({ characters: activeCharacters, deletedCharacters }),
                create: async () => character,
                update: async () => {
                    activeCharacters = [updatedCharacter]
                    return updatedCharacter
                },
                remove: async () => {
                    activeCharacters = []
                    deletedCharacters = [deletedCharacter]
                    return deletedCharacter
                },
                restore: async () => updatedCharacter
            },
            tags: {
                list: async () => ({ tags: [] }),
                create: async () => createTag('tag-a', project.id),
                rename: async () => createTag('tag-a', project.id)
            }
        })

        await workspace.load(project.id)
        await workspace.updateCharacter(character.id, { ...updatedCharacter, name: updatedCharacter.name })
        expect(workspace.characters.value).toEqual([updatedCharacter])

        await workspace.deleteCharacter(character.id)
        expect(workspace.characters.value).toEqual([])
        expect(workspace.deletedCharacters.value).toEqual([deletedCharacter])
    })

    // Given an existing tag in a selected project
    // When the workspace renames that tag
    // Then it refreshes the selected project's tag collection
    it('refreshes tags after renaming a tag', async () => {
        const project = createProject('project-a', 'Project A')
        const tag = createTag('tag-a', project.id)
        const renamedTag = { ...tag, name: 'Renamed Tag' }
        let currentTags = [tag]
        const workspace = useProjectWorkspace({
            projects: {
                list: async () => ({ projects: [project], deletedProjects: [], issues: [] }),
                create: async () => project,
                update: async () => project,
                remove: async () => project,
                restore: async () => project,
                repair: async () => undefined
            },
            characters: {
                list: async () => ({ characters: [], deletedCharacters: [] }),
                create: async () => createCharacter('character-a', project.id),
                update: async () => createCharacter('character-a', project.id),
                remove: async () => createCharacter('character-a', project.id),
                restore: async () => createCharacter('character-a', project.id)
            },
            tags: {
                list: async () => ({ tags: currentTags }),
                create: async () => tag,
                rename: async () => {
                    currentTags = [renamedTag]
                    return renamedTag
                }
            }
        })

        await workspace.load(project.id)
        await workspace.renameTag(tag.id, { name: renamedTag.name })

        expect(workspace.tags.value).toEqual([renamedTag])
    })

    // Given a project workspace with a storage issue
    // When the workspace repairs that issue
    // Then it calls the project adapter and refreshes project state
    it('refreshes projects after repairing project storage', async () => {
        const project = createProject('project-a', 'Project A')
        let repairArguments: [string, ProjectRepairResolution] | undefined
        const workspace = useProjectWorkspace({
            projects: {
                list: async () => ({ projects: [project], deletedProjects: [], issues: [] }),
                create: async () => project,
                update: async () => project,
                remove: async () => project,
                restore: async () => project,
                repair: async (directoryName: string, resolution: ProjectRepairResolution) => {
                    repairArguments = [directoryName, resolution]
                }
            },
            characters: {
                list: async () => ({ characters: [], deletedCharacters: [] }),
                create: async () => createCharacter('character-a', project.id),
                update: async () => createCharacter('character-a', project.id),
                remove: async () => createCharacter('character-a', project.id),
                restore: async () => createCharacter('character-a', project.id)
            },
            tags: {
                list: async () => ({ tags: [] }),
                create: async () => createTag('tag-a', project.id),
                rename: async () => createTag('tag-a', project.id)
            }
        })

        await workspace.load(null)
        await workspace.repairProject('broken-project', 'directory-name')

        expect(repairArguments).toEqual(['broken-project', 'directory-name'])
        expect(workspace.projects.value).toEqual([project])
    })

    // Given a project adapter that rejects a project mutation
    // When the workspace creates a project
    // Then it exposes the failure through the project error state
    it('exposes project mutation errors through workspace state', async () => {
        const project = createProject('project-a', 'Project A')
        const workspace = useProjectWorkspace({
            projects: {
                list: async () => ({ projects: [project], deletedProjects: [], issues: [] }),
                create: async () => {
                    throw new Error('项目创建失败')
                },
                update: async () => project,
                remove: async () => project,
                restore: async () => project,
                repair: async () => undefined
            },
            characters: {
                list: async () => ({ characters: [], deletedCharacters: [] }),
                create: async () => createCharacter('character-a', project.id),
                update: async () => createCharacter('character-a', project.id),
                remove: async () => createCharacter('character-a', project.id),
                restore: async () => createCharacter('character-a', project.id)
            },
            tags: {
                list: async () => ({ tags: [] }),
                create: async () => createTag('tag-a', project.id),
                rename: async () => createTag('tag-a', project.id)
            }
        })

        await workspace.load(null)
        await expect(workspace.createProject({ name: 'Project B', description: '' })).rejects.toThrow('项目创建失败')

        expect(workspace.projectError.value).toBe('项目创建失败')
    })

    // Given a project workspace loading Project A's slow character response
    // When the selected project changes to Project B before Project A finishes
    // Then Project A's response cannot overwrite Project B's character and tag state
    it('ignores stale project resource responses', async () => {
        const projectA = createProject('project-a', 'Project A')
        const projectB = createProject('project-b', 'Project B')
        const characterA = createCharacter('character-a', projectA.id)
        const characterB = createCharacter('character-b', projectB.id)
        const tagA = createTag('tag-a', projectA.id)
        const tagB = createTag('tag-b', projectB.id)
        let releaseProjectACharacters!: (result: { characters: Character[]; deletedCharacters: Character[] }) => void
        const projectACharacters = new Promise<{ characters: Character[]; deletedCharacters: Character[] }>(
            (resolve) => {
                releaseProjectACharacters = resolve
            }
        )
        const workspace = useProjectWorkspace({
            projects: {
                list: async () => ({ projects: [projectA, projectB], deletedProjects: [], issues: [] }),
                create: async () => projectA,
                update: async () => projectA,
                remove: async () => projectA,
                restore: async () => projectA,
                repair: async () => undefined
            },
            characters: {
                list: async (projectId: string) =>
                    projectId === projectA.id
                        ? projectACharacters
                        : { characters: [characterB], deletedCharacters: [] },
                create: async () => characterB,
                update: async () => characterB,
                remove: async () => characterB,
                restore: async () => characterB
            },
            tags: {
                list: async (projectId: string) => ({ tags: projectId === projectA.id ? [tagA] : [tagB] }),
                create: async () => tagB,
                rename: async () => tagB
            }
        })

        const projectALoad = workspace.load(projectA.id)
        await new Promise((resolve) => setTimeout(resolve, 0))
        const projectBLoad = workspace.load(projectB.id)
        await projectBLoad
        releaseProjectACharacters({ characters: [characterA], deletedCharacters: [] })
        await projectALoad

        expect(workspace.selectedProject.value).toEqual(projectB)
        expect(workspace.characters.value).toEqual([characterB])
        expect(workspace.tags.value).toEqual([tagB])
    })

    // Given a project workspace waiting for Project A's slow project list
    // When the selected project changes to Project B before Project A finishes
    // Then Project A's project list cannot overwrite Project B's project state
    it('ignores stale project list responses', async () => {
        const projectA = createProject('project-a', 'Project A')
        const projectB = createProject('project-b', 'Project B')
        let releaseProjectAList!: (result: { projects: Project[]; deletedProjects: Project[]; issues: [] }) => void
        let listCall = 0
        const projectAList = new Promise<{ projects: Project[]; deletedProjects: Project[]; issues: [] }>((resolve) => {
            releaseProjectAList = resolve
        })
        const workspace = useProjectWorkspace({
            projects: {
                list: async () => {
                    listCall += 1
                    return listCall === 1 ? projectAList : { projects: [projectB], deletedProjects: [], issues: [] }
                },
                create: async () => projectB,
                update: async () => projectB,
                remove: async () => projectB,
                restore: async () => projectB,
                repair: async () => undefined
            },
            characters: {
                list: async () => ({ characters: [], deletedCharacters: [] }),
                create: async () => createCharacter('character-b', projectB.id),
                update: async () => createCharacter('character-b', projectB.id),
                remove: async () => createCharacter('character-b', projectB.id),
                restore: async () => createCharacter('character-b', projectB.id)
            },
            tags: {
                list: async () => ({ tags: [] }),
                create: async () => createTag('tag-b', projectB.id),
                rename: async () => createTag('tag-b', projectB.id)
            }
        })

        const projectALoad = workspace.load(projectA.id)
        await new Promise((resolve) => setTimeout(resolve, 0))
        await workspace.load(projectB.id)
        releaseProjectAList({ projects: [projectA, projectB], deletedProjects: [], issues: [] })
        await projectALoad

        expect(workspace.projects.value).toEqual([projectB])
        expect(workspace.selectedProject.value).toEqual(projectB)
    })
})

function createProject(id: string, name: string): Project {
    return { id, name, description: '', createdAt: '', updatedAt: '', history: [] }
}

function createCharacter(id: string, projectId: string): Character {
    return {
        id,
        projectId,
        name: id,
        aliases: [],
        tagIds: [],
        introduction: '',
        appearance: '',
        personality: '',
        backstory: '',
        motivation: '',
        abilities: '',
        notes: '',
        createdAt: '',
        updatedAt: ''
    }
}

function createTag(id: string, projectId: string): Tag {
    return { id, projectId, name: id, createdAt: '', updatedAt: '' }
}
