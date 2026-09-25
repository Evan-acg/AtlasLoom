import type { BackupArchive, BackupDecisions, BackupMode, BackupPreview, ProjectBackup } from '../types/backup'
import { request } from './request'

export async function exportBackup(): Promise<Blob> {
    return request<Blob>({ url: '/backup', responseType: 'blob' }, '导出本地备份失败。')
}

export async function previewBackup(backup: unknown, mode: BackupMode): Promise<BackupPreview> {
    return request<BackupPreview>(
        { url: '/backup/preview', method: 'POST', data: { backup, mode } },
        '验证本地备份失败。'
    )
}

export async function listBackupArchives(): Promise<BackupArchive[]> {
    const result = await request<{ archives: BackupArchive[] }>({ url: '/backup/archives' }, '读取旧资料库列表失败。')
    return result.archives
}

export async function restoreBackupArchive(id: string): Promise<void> {
    await request<{ restored: boolean }>(
        { url: `/backup/archives/${encodeURIComponent(id)}`, method: 'POST' },
        '恢复旧资料库失败。'
    )
}

export async function applyBackup(backup: ProjectBackup, mode: BackupMode, decisions: BackupDecisions): Promise<void> {
    await request<{ imported: boolean }>(
        { url: '/backup/apply', method: 'POST', data: { backup, mode, decisions } },
        '导入本地备份失败。'
    )
}
