import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import UnoCSS from 'unocss/vite'
import { characterProfilesApiPlugin } from './src/features/character-profiles/server/vite-plugin.ts'

export default defineConfig({
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url))
        }
    },
    plugins: [vue(), UnoCSS(), characterProfilesApiPlugin()],
    server: { host: '127.0.0.1' },
    preview: { host: '127.0.0.1' },
    test: {
        include: ['src/**/*.spec.ts'],
        exclude: ['src/features/character-profiles/e2e/**'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'lcov'],
            include: ['src/**/*.{ts,vue}'],
            exclude: ['src/**/*.spec.ts', 'src/**/prototypes/**', 'src/features/character-profiles/e2e/**']
        }
    }
})
