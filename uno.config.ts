import { defineConfig, presetWind3 } from 'unocss'

export default defineConfig({
    presets: [presetWind3()],
    theme: {
        colors: {
            primary: 'var(--atlasloom-primary)',
            'primary-active': 'var(--atlasloom-primary-active)',
            secondary: '#213183',
            'on-primary': '#ffffff',
            canvas: '#ffffff',
            'canvas-soft': '#f6f5f4',
            surface: '#ffffff',
            ink: '#000000',
            'ink-secondary': '#31302e',
            'ink-muted': '#615d59',
            'ink-faint': '#a39e98',
            hairline: '#e6e6e6',
            'state-error': '#991b1b',
            'state-error-surface': '#fef2f2',
            'state-error-border': '#fecaca',
            'state-warning-border': '#fcd34d'
        },
        fontFamily: {
            sans: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
        }
    }
})
