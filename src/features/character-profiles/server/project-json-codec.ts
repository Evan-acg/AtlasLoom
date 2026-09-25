import type { Character } from '../types/character.ts'
import type { Project, ProjectHistoryEntry } from '../types/project.ts'
import type { Tag } from '../types/tag.ts'
import { isRecord } from './guards.ts'

export const projectFormatVersion = 1

export type ProjectJsonCodecEntity = 'project' | 'character' | 'tag'
export type ProjectJsonCodecErrorCode = 'invalid-json' | 'unsupported-version' | 'invalid-fields'

export class ProjectJsonCodecError extends Error {
    constructor(
        readonly entity: ProjectJsonCodecEntity,
        readonly code: ProjectJsonCodecErrorCode
    ) {
        super(`${entity} JSON is invalid: ${code}`)
        this.name = 'ProjectJsonCodecError'
    }
}

export interface ProjectJsonCodec {
    decodeProject(contents: string): Project
    decodeCharacter(contents: string, projectId: string): Character
    decodeTag(contents: string, projectId: string): Tag
    encodeProject(project: Project): string
    encodeCharacter(character: Character): string
    encodeTag(tag: Tag): string
}

export const projectJsonCodec: ProjectJsonCodec = {
    decodeProject: (contents) => decodeProject(parse(contents, 'project')),
    decodeCharacter: (contents, projectId) => decodeCharacter(parse(contents, 'character'), projectId),
    decodeTag: (contents, projectId) => decodeTag(parse(contents, 'tag'), projectId),
    encodeProject: (project) => stringify({ formatVersion: projectFormatVersion, ...project }),
    encodeCharacter: (character) => stringify({ formatVersion: projectFormatVersion, ...character }),
    encodeTag: (tag) => stringify({ formatVersion: projectFormatVersion, ...tag })
}

function parse(contents: string, entity: ProjectJsonCodecEntity): unknown {
    try {
        return JSON.parse(contents) as unknown
    } catch {
        throw new ProjectJsonCodecError(entity, 'invalid-json')
    }
}

function stringify(value: unknown): string {
    return `${JSON.stringify(value, null, 2)}\n`
}

function decodeProject(value: unknown): Project {
    if (!hasVersion(value)) throw new ProjectJsonCodecError('project', 'unsupported-version')
    if (
        typeof value.id !== 'string' ||
        typeof value.name !== 'string' ||
        typeof value.description !== 'string' ||
        typeof value.createdAt !== 'string' ||
        typeof value.updatedAt !== 'string' ||
        !Array.isArray(value.history) ||
        !value.history.every(isHistoryEntry) ||
        (value.deletedAt !== undefined && typeof value.deletedAt !== 'string')
    ) {
        throw new ProjectJsonCodecError('project', 'invalid-fields')
    }

    return {
        id: value.id,
        name: value.name,
        description: value.description,
        createdAt: value.createdAt,
        updatedAt: value.updatedAt,
        ...(typeof value.deletedAt === 'string' ? { deletedAt: value.deletedAt } : {}),
        history: value.history
    }
}

function decodeCharacter(value: unknown, projectId: string): Character {
    if (
        !hasVersion(value) ||
        value.projectId !== projectId ||
        typeof value.id !== 'string' ||
        typeof value.name !== 'string' ||
        !Array.isArray(value.aliases) ||
        !value.aliases.every((alias) => typeof alias === 'string') ||
        (value.tagIds !== undefined &&
            (!Array.isArray(value.tagIds) || !value.tagIds.every((tagId) => typeof tagId === 'string'))) ||
        typeof value.introduction !== 'string' ||
        typeof value.appearance !== 'string' ||
        typeof value.personality !== 'string' ||
        typeof value.backstory !== 'string' ||
        typeof value.motivation !== 'string' ||
        typeof value.abilities !== 'string' ||
        typeof value.notes !== 'string' ||
        typeof value.createdAt !== 'string' ||
        typeof value.updatedAt !== 'string'
    ) {
        throw new ProjectJsonCodecError('character', 'invalid-fields')
    }

    return {
        id: value.id,
        projectId: value.projectId,
        name: value.name,
        aliases: value.aliases,
        tagIds: value.tagIds === undefined ? [] : value.tagIds,
        introduction: value.introduction,
        appearance: value.appearance,
        personality: value.personality,
        backstory: value.backstory,
        motivation: value.motivation,
        abilities: value.abilities,
        notes: value.notes,
        createdAt: value.createdAt,
        updatedAt: value.updatedAt,
        ...(typeof value.deletedAt === 'string' ? { deletedAt: value.deletedAt } : {})
    }
}

function decodeTag(value: unknown, projectId: string): Tag {
    if (
        !hasVersion(value) ||
        value.projectId !== projectId ||
        typeof value.id !== 'string' ||
        typeof value.name !== 'string' ||
        typeof value.createdAt !== 'string' ||
        typeof value.updatedAt !== 'string'
    ) {
        throw new ProjectJsonCodecError('tag', 'invalid-fields')
    }

    return {
        id: value.id,
        projectId: value.projectId,
        name: value.name,
        createdAt: value.createdAt,
        updatedAt: value.updatedAt
    }
}

function hasVersion(value: unknown): value is Record<string, unknown> & { formatVersion: number } {
    return isRecord(value) && value.formatVersion === projectFormatVersion
}

function isHistoryEntry(value: unknown): value is ProjectHistoryEntry {
    return isRecord(value) && typeof value.at === 'string' && typeof value.summary === 'string'
}
