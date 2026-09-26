import eslint from '@eslint/js'
import boundaries from 'eslint-plugin-boundaries'
import prettier from 'eslint-config-prettier'
import vue from 'eslint-plugin-vue'
import tseslint from 'typescript-eslint'

export default tseslint.config(
    {
        ignores: [
            'dist/**',
            'coverage/**',
            'reports/**',
            '.stryker-tmp/**',
            '.ts-anti-patterns-cache/**',
            'node_modules/**'
        ]
    },
    eslint.configs.recommended,
    ...tseslint.configs.recommended,
    ...vue.configs['flat/recommended'],
    {
        files: ['**/*.vue'],
        languageOptions: {
            parserOptions: {
                parser: tseslint.parser
            }
        }
    },
    {
        files: ['src/**/*.{js,jsx,ts,tsx,vue}'],
        plugins: {
            boundaries
        },
        settings: {
            'import/resolver': {
                typescript: {
                    alwaysTryTypes: true,
                    project: './tsconfig.json',
                    extensions: ['.ts', '.tsx', '.js', '.jsx', '.vue', '.css']
                }
            },
            'boundaries/elements': [
                {
                    type: 'feature',
                    pattern: 'src/features/*',
                    capture: ['feature'],
                    partialMatch: false
                },
                {
                    type: 'shared',
                    pattern: 'src/shared',
                    partialMatch: false
                },
                {
                    type: 'app',
                    pattern: 'src',
                    partialMatch: false
                }
            ],
            'boundaries/files': [
                {
                    pattern: 'src/features/*/index.ts',
                    category: 'feature-public'
                },
                {
                    pattern: 'src/features/*/development.ts',
                    category: 'feature-development'
                }
            ]
        },
        rules: {
            'boundaries/no-unknown-files': 'error',
            'boundaries/dependencies': [
                'error',
                {
                    default: 'disallow',
                    checkUnknownLocals: true,
                    policies: [
                        {
                            from: { element: { type: 'app' } },
                            allow: { to: { element: { types: ['app', 'shared'] } } }
                        },
                        {
                            from: { element: { type: 'app' } },
                            allow: {
                                to: {
                                    element: { type: 'feature' },
                                    file: { categories: 'feature-public' }
                                }
                            }
                        },
                        {
                            from: { element: { type: 'app' } },
                            allow: {
                                to: {
                                    element: { type: 'feature' },
                                    file: { categories: 'feature-development' }
                                }
                            }
                        },
                        {
                            from: { element: { type: 'feature' } },
                            allow: { to: { element: { type: 'shared' } } }
                        },
                        {
                            from: { element: { type: 'feature' } },
                            allow: {
                                to: {
                                    element: { type: 'feature' },
                                    file: { categories: 'feature-public' }
                                }
                            }
                        },
                        {
                            from: { element: { type: 'shared' } },
                            allow: { to: { element: { type: 'shared' } } }
                        }
                    ]
                }
            ]
        }
    },
    prettier
)
