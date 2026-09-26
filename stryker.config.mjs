const breakThreshold = Number(globalThis.process?.env?.STRYKER_BREAK ?? 60)

/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
export default {
    testRunner: 'vitest',
    plugins: ['@stryker-mutator/vitest-runner'],
    vitest: {
        configFile: 'vite.config.ts'
    },
    mutate: ['src/**/*.ts', '!src/**/*.spec.ts', '!src/**/prototypes/**', '!src/**/e2e/**'],
    incremental: true,
    incrementalFile: 'reports/stryker-incremental.json',
    reporters: ['clear-text', 'json'],
    jsonReporter: {
        fileName: 'reports/mutation.json'
    },
    thresholds: {
        high: 80,
        low: 60,
        break: breakThreshold
    },
    concurrency: 2,
    tempDirName: '.stryker-tmp'
}
