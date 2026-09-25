import type { Project } from '../types/project.ts'

export interface LocatedProject {
    directoryName: string
    project: Project
}

export interface ProjectLookup {
    findProject(id: string): Promise<LocatedProject>
}
