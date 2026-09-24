import { resolve } from 'node:path'
import { env } from 'node:process'
import type { Plugin } from 'vite'
import { createProjectApiMiddleware } from './project-api.ts'

export function characterProfilesApiPlugin(): Plugin {
    return {
        name: 'atlasloom-character-profiles-api',
        configureServer(server) {
            const dataDirectory = getDataDirectory(server.config.root)
            server.middlewares.use('/api', createProjectApiMiddleware(dataDirectory))
        },
        configurePreviewServer(server) {
            const dataDirectory = getDataDirectory(server.config.root)
            server.middlewares.use('/api', createProjectApiMiddleware(dataDirectory))
        }
    }
}

function getDataDirectory(projectRoot: string): string {
    return resolve(env.ATLASLOOM_DATA_DIR ?? resolve(projectRoot, 'data'))
}
