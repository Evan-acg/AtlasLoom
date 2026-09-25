<script setup lang="ts">
    import type { HistoryEntry } from '../types/history'

    defineProps<{
        subject: string
        entries: HistoryEntry[]
    }>()
</script>

<template>
    <section
        class="border-b border-hairline px-5 py-5 sm:px-7"
        :aria-label="`${subject}变更历史`"
    >
        <h2 class="text-sm font-semibold">{{ subject }}变更历史</h2>
        <ol class="mt-3 space-y-2">
            <li
                v-for="(entry, index) in entries"
                :key="`${entry.at}-${index}`"
                class="flex flex-wrap gap-x-4 text-sm"
            >
                <time
                    class="text-ink-muted"
                    :datetime="entry.at"
                >
                    {{ entry.at }}
                </time>
                <span>{{ entry.summary }}</span>
            </li>
        </ol>
    </section>
</template>
