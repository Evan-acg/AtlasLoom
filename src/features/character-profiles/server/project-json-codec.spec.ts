import { describe, expect, it } from 'vitest'
import { ProjectJsonCodecError, projectFormatVersion, projectJsonCodec } from './project-json-codec'

describe('project JSON codec', () => {
    const project = {
        id: 'project-1',
        name: '雾港编年',
        description: '群岛城市',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        history: [{ at: '2026-01-01T00:00:00.000Z', summary: '创建项目' }]
    }

    it('encodes and decodes format version 1 without leaking the storage field', () => {
        const encoded = projectJsonCodec.encodeProject(project)

        expect(JSON.parse(encoded)).toMatchObject({ formatVersion: projectFormatVersion, id: project.id })
        expect(projectJsonCodec.decodeProject(encoded)).toEqual(project)
    })

    it('rejects unsupported project versions before field validation', () => {
        const contents = JSON.stringify({ ...project, formatVersion: 2 })

        expect(() => projectJsonCodec.decodeProject(contents)).toThrowError(
            expect.objectContaining({ entity: 'project', code: 'unsupported-version' })
        )
        expect(() => projectJsonCodec.decodeProject('{invalid json')).toThrowError(
            expect.objectContaining({ entity: 'project', code: 'invalid-json' })
        )
    })

    it('rejects records whose fields do not match the resource contract', () => {
        expect(() =>
            projectJsonCodec.decodeProject(JSON.stringify({ ...project, formatVersion: 1, history: [] }))
        ).not.toThrow()

        try {
            projectJsonCodec.decodeTag(
                JSON.stringify({ formatVersion: 1, id: 'tag-1', projectId: 'other', name: '标签' }),
                'project-1'
            )
            throw new Error('Expected invalid tag fields to be rejected.')
        } catch (error) {
            expect(error).toBeInstanceOf(ProjectJsonCodecError)
            expect(error).toMatchObject({ entity: 'tag', code: 'invalid-fields' })
        }
    })
})
