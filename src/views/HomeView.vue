<script setup lang="ts">
    import { useCounterStore } from '../stores/counter'

    const counter = useCounterStore()
</script>

<template>
    <main class="mx-auto min-h-screen max-w-5xl px-6 py-16 sm:px-10 sm:py-24">
        <section class="mx-auto max-w-2xl">
            <p class="mb-3 text-sm font-semibold uppercase tracking-widest text-indigo-600">
                Vue 3 · TypeScript · Pinia
            </p>
            <h1 class="text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">AtlasLoom</h1>
            <p class="mt-4 text-lg leading-8 text-slate-600">
                项目骨架已就绪。这个计数器用于演示路由、Pinia 状态和 UnoCSS 样式。
            </p>

            <div class="mt-10 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                <p class="text-sm font-medium text-slate-500">当前计数</p>
                <output
                    class="mt-2 block text-5xl font-semibold tabular-nums text-slate-900"
                    aria-live="polite"
                >
                    {{ counter.count }}
                </output>
                <button
                    class="mt-6 rounded-lg bg-indigo-600 px-5 py-3 font-semibold text-white transition hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                    type="button"
                    @click="counter.increment()"
                >
                    增加计数
                </button>
            </div>
        </section>
    </main>
</template>
