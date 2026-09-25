<script setup lang="ts">
    import { computed, onMounted, ref } from 'vue'
    import type {
        BackupArchive,
        BackupConflict,
        BackupConflictChoice,
        BackupDecisions,
        BackupMode,
        BackupPreview,
        ProjectBackup
    } from '../types/backup'
    import { getCharacterProfilesErrorMessage } from '../utils/error-message'

    const props = defineProps<{
        exportBackup: () => Promise<unknown>
        previewBackup: (backup: unknown, mode: BackupMode) => Promise<BackupPreview>
        applyBackup: (backup: ProjectBackup, mode: BackupMode, decisions: BackupDecisions) => Promise<void>
        listBackupArchives: () => Promise<BackupArchive[]>
        restoreBackupArchive: (id: string) => Promise<void>
        refresh: () => Promise<void>
    }>()

    const fileInput = ref<{ click: () => void } | null>(null)
    const backup = ref<ProjectBackup | null>(null)
    const preview = ref<BackupPreview | null>(null)
    const decisions = ref<BackupDecisions>({})
    const mode = ref<BackupMode>('merge')
    const fileName = ref('')
    const error = ref('')
    const status = ref('')
    const dialogOpen = ref(false)
    const loading = ref(false)
    const archives = ref<BackupArchive[]>([])

    onMounted(() => void refreshArchives())

    const blockingIssues = computed(() => {
        const issues = [...(preview.value?.blockingIssues ?? [])]
        if (!backup.value || !preview.value || mode.value !== 'merge') return issues

        const skippedTagIds = new Set(
            preview.value.conflicts
                .filter((conflict) => conflict.entity === 'tag' && decisions.value[conflict.id]?.choice === 'skip')
                .map((conflict) => conflict.id.slice(conflict.id.lastIndexOf(':') + 1))
        )
        for (const bundle of backup.value.projects) {
            for (const character of bundle.characters) {
                const conflicts = preview.value.conflicts.filter(
                    (conflict) => conflict.entity === 'character' && conflict.id.endsWith(`:${character.id}`)
                )
                const skipped = conflicts.some((conflict) => decisions.value[conflict.id]?.choice === 'skip')
                const keptCurrent = conflicts.some(
                    (conflict) => conflict.kind === 'same-id' && decisions.value[conflict.id]?.choice === 'keep-current'
                )
                if (skipped || keptCurrent) continue
                for (const tagId of character.tagIds) {
                    if (skippedTagIds.has(tagId)) {
                        issues.push(`角色“${character.name}”引用了被跳过的标签，无法确认导入。`)
                        break
                    }
                }
            }
        }
        return [...new Set(issues)]
    })

    const readyToApply = computed(() => {
        if (!preview.value || loading.value || blockingIssues.value.length) return false
        return preview.value.conflicts.every((conflict) => {
            const decision = decisions.value[conflict.id]
            return Boolean(decision?.choice && (decision.choice !== 'rename' || decision.name?.trim()))
        })
    })

    async function download() {
        loading.value = true
        error.value = ''
        status.value = ''
        try {
            const blob = await props.exportBackup()
            const url = globalThis.URL.createObjectURL(blob as Parameters<typeof globalThis.URL.createObjectURL>[0])
            const link = globalThis.document.createElement('a')
            link.href = url
            link.download = 'atlasloom-backup.json'
            link.click()
            globalThis.URL.revokeObjectURL(url)
            status.value = '完整备份已准备下载。'
        } catch (reason) {
            error.value = getCharacterProfilesErrorMessage(reason)
        } finally {
            loading.value = false
        }
    }

    async function refreshArchives() {
        try {
            archives.value = await props.listBackupArchives()
        } catch (reason) {
            archives.value = []
            error.value = getCharacterProfilesErrorMessage(reason)
        }
    }

    async function restoreArchive(archive: BackupArchive) {
        if (
            !globalThis.confirm(
                `将恢复 ${formatArchiveDate(archive.createdAt)} 保存的旧资料库，并保留当前资料库。是否继续？`
            )
        )
            return
        loading.value = true
        error.value = ''
        try {
            await props.restoreBackupArchive(archive.id)
            await props.refresh()
            await refreshArchives()
            status.value = '旧资料库已恢复，当前项目列表已刷新。'
        } catch (reason) {
            error.value = getCharacterProfilesErrorMessage(reason)
        } finally {
            loading.value = false
        }
    }

    function chooseFile() {
        fileInput.value?.click()
    }

    async function readFile(event: unknown) {
        const input = (
            event as { target: { files?: ArrayLike<{ name: string; text: () => Promise<string> }>; value: string } }
        ).target
        const file = input.files?.[0]
        input.value = ''
        if (!file) return

        error.value = ''
        status.value = ''
        try {
            const parsed = JSON.parse(await file.text()) as ProjectBackup
            backup.value = parsed
            fileName.value = file.name
            decisions.value = {}
            dialogOpen.value = true
            await refreshPreview()
        } catch (reason) {
            error.value =
                reason instanceof SyntaxError ? '备份文件不是有效 JSON。' : getCharacterProfilesErrorMessage(reason)
        }
    }

    async function refreshPreview() {
        if (!backup.value) return
        loading.value = true
        error.value = ''
        try {
            preview.value = await props.previewBackup(backup.value, mode.value)
            decisions.value = {}
        } catch (reason) {
            preview.value = null
            error.value = getCharacterProfilesErrorMessage(reason)
        } finally {
            loading.value = false
        }
    }

    function setMode(nextMode: BackupMode) {
        mode.value = nextMode
        void refreshPreview()
    }

    function setDecision(conflict: BackupConflict, choice: BackupConflictChoice) {
        decisions.value = {
            ...decisions.value,
            [conflict.id]: {
                choice,
                ...(choice === 'rename' ? { name: `${conflict.backupName}（导入）` } : {})
            }
        }
    }

    function setRename(conflict: BackupConflict, name: string) {
        const current = decisions.value[conflict.id]
        if (!current) return
        decisions.value = { ...decisions.value, [conflict.id]: { ...current, name } }
    }

    function handleDecisionChange(conflict: BackupConflict, event: unknown) {
        const choice = (event as { target: { value: string } }).target.value as BackupConflictChoice
        setDecision(conflict, choice)
    }

    function handleRenameInput(conflict: BackupConflict, event: unknown) {
        setRename(conflict, (event as { target: { value: string } }).target.value)
    }

    function closeDialog() {
        if (loading.value) return
        dialogOpen.value = false
        backup.value = null
        preview.value = null
        decisions.value = {}
        error.value = ''
    }

    async function apply() {
        if (!backup.value || !preview.value || !readyToApply.value) return
        if (!globalThis.confirm('确认按当前预览导入备份？在确认前可以取消，确认后将修改本地资料库。')) return

        loading.value = true
        error.value = ''
        try {
            await props.applyBackup(backup.value, mode.value, decisions.value)
            await props.refresh()
            await refreshArchives()
            loading.value = false
            closeDialog()
            status.value = '备份已导入，当前项目列表已刷新。'
        } catch (reason) {
            error.value = getCharacterProfilesErrorMessage(reason)
        } finally {
            loading.value = false
        }
    }

    function choicesFor(conflict: BackupConflict): BackupConflictChoice[] {
        if (conflict.kind === 'same-id') return ['keep-current', 'use-backup']
        if (conflict.kind === 'ownership') return ['skip', 'import-new-id']
        return ['skip', 'rename']
    }

    function choiceLabel(choice: BackupConflictChoice): string {
        return {
            'keep-current': '保留当前记录',
            'use-backup': '采用备份记录',
            skip: '跳过备份记录',
            rename: '修改名称后导入',
            'import-new-id': '以新 ID 导入'
        }[choice]
    }

    function formatArchiveDate(value: string): string {
        return new Date(value).toLocaleString()
    }
</script>

<template>
    <section class="mb-4 rounded-xl border border-hairline bg-surface px-4 py-4 sm:px-6">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
                <h2 class="text-base font-semibold">资料库备份</h2>
                <p class="mt-1 text-sm text-ink-muted">导出全部项目，或验证后合并、替换本地资料。</p>
            </div>
            <div class="flex flex-wrap gap-2">
                <button
                    class="min-h-11 rounded-md border border-hairline px-3 text-sm font-medium hover:bg-canvas-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    type="button"
                    :disabled="loading"
                    @click="download"
                >
                    导出完整备份
                </button>
                <button
                    class="min-h-11 rounded-full bg-primary px-3 text-sm font-semibold text-white hover:bg-primary-active focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    type="button"
                    :disabled="loading"
                    @click="chooseFile"
                >
                    导入备份
                </button>
            </div>
        </div>
        <input
            ref="fileInput"
            class="sr-only"
            type="file"
            accept="application/json,.json"
            aria-label="选择备份文件"
            @change="readFile"
        />
        <p
            v-if="status"
            class="mt-3 text-sm text-state-success"
            role="status"
        >
            {{ status }}
        </p>
        <p
            v-if="error && !dialogOpen"
            class="mt-3 text-sm text-state-error"
            role="alert"
        >
            {{ error }}
        </p>
    </section>

    <section
        v-if="archives.length"
        class="mb-4 rounded-xl border border-state-warning-border bg-state-warning-surface px-4 py-4 sm:px-6"
        aria-labelledby="backup-archives-title"
    >
        <h2
            id="backup-archives-title"
            class="text-base font-semibold"
        >
            可恢复的旧资料库
        </h2>
        <ul class="mt-3 space-y-2 text-sm">
            <li
                v-for="archive in archives"
                :key="archive.id"
                class="flex flex-wrap items-center justify-between gap-2"
            >
                <span class="text-ink-secondary">{{ formatArchiveDate(archive.createdAt) }}</span>
                <button
                    class="min-h-10 rounded-md border border-hairline bg-surface px-3 text-xs font-semibold hover:bg-canvas-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    type="button"
                    :disabled="loading"
                    :aria-label="`恢复旧资料库 ${formatArchiveDate(archive.createdAt)}`"
                    @click="restoreArchive(archive)"
                >
                    恢复此版本
                </button>
            </li>
        </ul>
    </section>

    <div
        v-if="dialogOpen"
        class="fixed inset-0 z-20 overflow-y-auto bg-black/30 px-4 py-8"
        role="presentation"
    >
        <section
            class="mx-auto max-w-3xl rounded-xl border border-hairline bg-surface p-5 shadow-lg sm:p-7"
            role="dialog"
            aria-modal="true"
            aria-labelledby="backup-dialog-title"
        >
            <div class="flex items-start justify-between gap-4">
                <div>
                    <p class="text-xs font-semibold uppercase tracking-widest text-ink-muted">导入备份</p>
                    <h2
                        id="backup-dialog-title"
                        class="mt-1 text-xl font-semibold"
                    >
                        {{ fileName }}
                    </h2>
                </div>
                <button
                    class="min-h-11 rounded-md px-3 text-sm font-medium hover:bg-canvas-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    type="button"
                    :disabled="loading"
                    @click="closeDialog"
                >
                    取消
                </button>
            </div>

            <fieldset class="mt-6 flex flex-col gap-3 sm:flex-row">
                <legend class="mb-2 text-sm font-semibold">导入方式</legend>
                <label class="flex items-start gap-2 text-sm">
                    <input
                        class="mt-1"
                        type="radio"
                        name="backup-mode"
                        :checked="mode === 'merge'"
                        @change="setMode('merge')"
                    />
                    <span>
                        <strong>合并</strong>
                        <br />
                        <span class="text-ink-muted">保留当前记录，并逐条处理冲突。</span>
                    </span>
                </label>
                <label class="flex items-start gap-2 text-sm">
                    <input
                        class="mt-1"
                        type="radio"
                        name="backup-mode"
                        :checked="mode === 'replace'"
                        @change="setMode('replace')"
                    />
                    <span>
                        <strong>替换</strong>
                        <br />
                        <span class="text-ink-muted">用备份完整替换当前资料库。</span>
                    </span>
                </label>
            </fieldset>

            <p
                v-if="loading"
                class="mt-6 rounded-lg bg-canvas-soft px-4 py-3 text-sm text-ink-muted"
                role="status"
            >
                正在验证备份内容…
            </p>
            <template v-else-if="preview">
                <dl class="mt-6 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                    <div class="rounded-lg bg-canvas-soft p-3">
                        <dt class="text-ink-muted">项目</dt>
                        <dd class="mt-1 font-semibold">{{ preview.incoming.projects }}</dd>
                    </div>
                    <div class="rounded-lg bg-canvas-soft p-3">
                        <dt class="text-ink-muted">角色</dt>
                        <dd class="mt-1 font-semibold">{{ preview.incoming.characters }}</dd>
                    </div>
                    <div class="rounded-lg bg-canvas-soft p-3">
                        <dt class="text-ink-muted">标签</dt>
                        <dd class="mt-1 font-semibold">{{ preview.incoming.tags }}</dd>
                    </div>
                    <div class="rounded-lg bg-canvas-soft p-3">
                        <dt class="text-ink-muted">待处理冲突</dt>
                        <dd class="mt-1 font-semibold">{{ preview.conflicts.length }}</dd>
                    </div>
                </dl>

                <p
                    v-if="mode === 'replace' && !preview.currentDataIssues.length"
                    class="mt-4 rounded-lg border border-state-warning-border bg-state-warning-surface px-4 py-3 text-sm text-ink-secondary"
                >
                    此操作将移除当前 {{ preview.removals.projects }} 个项目、{{ preview.removals.characters }} 个角色和
                    {{ preview.removals.tags }} 个标签，并保留可恢复的旧资料库副本。
                </p>
                <p
                    v-if="preview.currentDataIssues.length"
                    class="mt-4 rounded-lg border border-state-error-border bg-state-error-surface px-4 py-3 text-sm text-state-error"
                    role="alert"
                >
                    {{ preview.currentDataIssues.join(' ') }}
                </p>

                <ul
                    v-if="preview.conflicts.length"
                    class="mt-4 space-y-3"
                    aria-label="备份冲突列表"
                >
                    <li
                        v-for="conflict in preview.conflicts"
                        :key="conflict.id"
                        class="rounded-lg border border-state-warning-border bg-state-warning-surface p-4"
                    >
                        <p class="text-sm font-semibold">{{ conflict.message }}</p>
                        <p class="mt-1 text-xs text-ink-muted">
                            备份记录：{{ conflict.backupName }}
                            <span v-if="conflict.currentName">；当前记录：{{ conflict.currentName }}</span>
                        </p>
                        <select
                            class="mt-3 min-h-10 w-full rounded-md border border-hairline bg-surface px-3 text-sm focus-visible:outline-2 focus-visible:outline-primary"
                            :aria-label="`处理${conflict.entity}冲突 ${conflict.backupName}`"
                            :value="decisions[conflict.id]?.choice ?? ''"
                            @change="handleDecisionChange(conflict, $event)"
                        >
                            <option value="">请选择处理方式</option>
                            <option
                                v-for="choice in choicesFor(conflict)"
                                :key="choice"
                                :value="choice"
                            >
                                {{ choiceLabel(choice) }}
                            </option>
                        </select>
                        <input
                            v-if="decisions[conflict.id]?.choice === 'rename'"
                            class="mt-2 min-h-10 w-full rounded-md border border-hairline px-3 text-sm focus-visible:outline-2 focus-visible:outline-primary"
                            type="text"
                            :value="decisions[conflict.id]?.name"
                            :aria-label="`冲突记录新名称 ${conflict.backupName}`"
                            @input="handleRenameInput(conflict, $event)"
                        />
                    </li>
                </ul>
                <p
                    v-if="blockingIssues.length"
                    class="mt-4 rounded-lg border border-state-error-border bg-state-error-surface px-4 py-3 text-sm text-state-error"
                    role="alert"
                >
                    {{ blockingIssues.join(' ') }}
                </p>
                <div
                    v-if="mode === 'replace' && (preview.addedRecords.length || preview.removedRecords.length)"
                    class="mt-4 grid gap-4 text-sm sm:grid-cols-2"
                >
                    <div>
                        <h3 class="font-semibold">将导入</h3>
                        <ul class="mt-2 list-disc space-y-1 pl-5 text-ink-secondary">
                            <li
                                v-for="record in preview.addedRecords"
                                :key="`add-${record}`"
                            >
                                {{ record }}
                            </li>
                        </ul>
                    </div>
                    <div>
                        <h3 class="font-semibold">将移除</h3>
                        <ul class="mt-2 list-disc space-y-1 pl-5 text-ink-secondary">
                            <li
                                v-for="record in preview.removedRecords"
                                :key="`remove-${record}`"
                            >
                                {{ record }}
                            </li>
                        </ul>
                    </div>
                </div>
            </template>
            <p
                v-if="error"
                class="mt-4 rounded-lg border border-state-error-border bg-state-error-surface px-4 py-3 text-sm text-state-error"
                role="alert"
            >
                {{ error }}
            </p>

            <div class="mt-7 flex justify-end gap-2">
                <button
                    class="min-h-11 rounded-md border border-hairline px-4 text-sm font-medium hover:bg-canvas-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    type="button"
                    :disabled="loading"
                    @click="closeDialog"
                >
                    取消
                </button>
                <button
                    class="min-h-11 rounded-full bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-active disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    type="button"
                    :disabled="!readyToApply"
                    @click="apply"
                >
                    确认导入
                </button>
            </div>
        </section>
    </div>
</template>
