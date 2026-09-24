import type { IncomingMessage, ServerResponse } from 'node:http'
import type { ProjectInput, ProjectRepairResolution } from '../types/project.ts'
import { isRecord } from './guards.ts'
import { ProjectRepository, ProjectRepositoryError } from './project-repository.ts'

const maximumRequestBytes = 64 * 1024

class ApiError extends Error {
    constructor(
        message: string,
        readonly status: number
    ) {
        super(message)
    }
}

export function createProjectApiMiddleware(dataDirectory: string) {
    const repository = new ProjectRepository(dataDirectory)

    return (request: IncomingMessage, response: ServerResponse) => {
        void handleRequest(request, response, repository).catch((error: unknown) => {
            if (response.writableEnded) return
            const status = getErrorStatus(error)
            const message = status === 500 ? '本地项目服务暂时无法处理请求。' : errorMessage(error)
            sendJson(response, status, { error: message })
        })
    }
}

async function handleRequest(
    request: IncomingMessage,
    response: ServerResponse,
    repository: ProjectRepository
): Promise<void> {
    response.setHeader('Cache-Control', 'no-store')
    if (!isLoopbackAddress(request.socket.remoteAddress)) {
        sendJson(response, 403, { error: '项目数据服务仅允许本机访问。' })
        return
    }

    const pathname = new URL(request.url ?? '/', 'http://localhost').pathname
    const segments = pathname.split('/').filter(Boolean)
    if (segments[0] !== 'projects') {
        sendJson(response, 404, { error: '找不到请求的本地 API。' })
        return
    }

    if (segments.length === 1 && request.method === 'GET') {
        sendJson(response, 200, await repository.listProjects())
        return
    }

    if (segments.length === 1 && request.method === 'POST') {
        const project = await repository.createProject(await readProjectInput(request))
        sendJson(response, 201, { project })
        return
    }

    if (segments.length === 2 && segments[1] === 'repair' && request.method === 'POST') {
        const input = await readProjectRepairInput(request)
        await repository.repairProject(input.directoryName, input.resolution)
        sendJson(response, 200, { repaired: true })
        return
    }

    if (segments.length === 2 && request.method === 'PATCH') {
        let id: string
        try {
            id = decodeURIComponent(segments[1] ?? '')
        } catch {
            throw new ApiError('项目 ID 格式无效。', 400)
        }
        const project = await repository.updateProject(id, await readProjectInput(request))
        sendJson(response, 200, { project })
        return
    }

    const allowed = segments.length === 1 ? 'GET, POST' : segments[1] === 'repair' ? 'POST' : 'PATCH'
    response.setHeader('Allow', allowed)
    sendJson(response, 405, { error: '不支持该 API 操作。' })
}

async function readProjectInput(request: IncomingMessage): Promise<ProjectInput> {
    const body = await readJsonRequestBody(request)
    if (!isRecord(body) || typeof body.name !== 'string') {
        throw new ApiError('项目名称必须是文本。', 400)
    }
    if (body.description !== undefined && typeof body.description !== 'string') {
        throw new ApiError('项目简介必须是文本。', 400)
    }

    return { name: body.name, description: typeof body.description === 'string' ? body.description : '' }
}

async function readProjectRepairInput(
    request: IncomingMessage
): Promise<{ directoryName: string; resolution: ProjectRepairResolution }> {
    const body = await readJsonRequestBody(request)
    if (!isRecord(body) || typeof body.directoryName !== 'string' || !isProjectRepairResolution(body.resolution)) {
        throw new ApiError('项目修复请求格式无效。', 400)
    }

    return { directoryName: body.directoryName, resolution: body.resolution }
}

async function readJsonRequestBody(request: IncomingMessage): Promise<unknown> {
    const contentType = request.headers['content-type']?.split(';')[0]?.trim().toLowerCase()
    if (contentType !== 'application/json') throw new ApiError('请求必须使用 JSON 格式。', 415)
    return readJsonBody(request)
}

function readJsonBody(request: IncomingMessage): Promise<unknown> {
    return new Promise((resolve, reject) => {
        const chunks: Buffer[] = []
        let size = 0
        let tooLarge = false

        request.on('data', (chunk: Buffer | string) => {
            const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
            size += buffer.byteLength
            if (size > maximumRequestBytes) tooLarge = true
            else chunks.push(buffer)
        })
        request.on('error', reject)
        request.on('end', () => {
            if (tooLarge) {
                reject(new ApiError('请求内容过大。', 413))
                return
            }
            try {
                resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown)
            } catch {
                reject(new ApiError('请求内容不是有效 JSON。', 400))
            }
        })
    })
}

function sendJson(response: ServerResponse, status: number, body: unknown): void {
    response.statusCode = status
    response.setHeader('Content-Type', 'application/json; charset=utf-8')
    response.end(JSON.stringify(body))
}

function isLoopbackAddress(address: string | undefined): boolean {
    if (!address) return false
    if (address === '::1' || address === '127.0.0.1') return true

    const ipv4Address = address.startsWith('::ffff:') ? address.slice('::ffff:'.length) : address
    const firstOctet = Number(ipv4Address.split('.')[0])
    return ipv4Address.includes('.') && firstOctet === 127
}

function getErrorStatus(error: unknown): number {
    if (error instanceof ApiError) return error.status
    if (error instanceof ProjectRepositoryError) {
        switch (error.code) {
            case 'invalid-name':
                return 400
            case 'duplicate-name':
            case 'read-only':
                return 409
            case 'not-found':
                return 404
            case 'invalid-data':
                return 422
        }
    }
    return 500
}

function errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : '请求无法完成。'
}

function isProjectRepairResolution(value: unknown): value is ProjectRepairResolution {
    return value === 'directory-name' || value === 'metadata-name' || value === 'restore-backup'
}
