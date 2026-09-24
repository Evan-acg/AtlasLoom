import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { env } from 'node:process'
import { defineConfig } from '@playwright/test'

export default defineConfig({
    testDir: './src/features/character-profiles/e2e',
    testMatch: '**/*.spec.ts',
    fullyParallel: false,
    workers: 1,
    reporter: 'list',
    outputDir: join(tmpdir(), 'atlasloom-playwright-results'),
    use: {
        headless: true,
        launchOptions: env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? { executablePath: env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } : {}
    }
})
