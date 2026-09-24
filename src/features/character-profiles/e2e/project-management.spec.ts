import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { cwd, env } from 'node:process'
import { expect, test as base, type Page } from '@playwright/test'
import { createServer, type ViteDevServer } from 'vite'

interface LocalProjectApp {
    readonly url: string
    readonly dataDirectory: string
    restart(): Promise<void>
}

const test = base.extend<{ projectApp: LocalProjectApp }>({
    projectApp: async ({ browserName }, use) => {
        void browserName
        const dataDirectory = await mkdtemp(join(tmpdir(), 'atlasloom-projects-e2e-'))
        const previousDataDirectory = env.ATLASLOOM_DATA_DIR
        env.ATLASLOOM_DATA_DIR = dataDirectory
        let running: Awaited<ReturnType<typeof startApp>> | undefined
        const projectApp: LocalProjectApp = {
            dataDirectory,
            get url() {
                if (!running) throw new Error('Local project app has not started.')
                return running.url
            },
            async restart() {
                if (!running) throw new Error('Local project app has not started.')
                await running.server.close()
                running = await startApp()
            }
        }

        try {
            running = await startApp()
            await use(projectApp)
        } finally {
            await running?.server.close()
            if (previousDataDirectory === undefined) delete env.ATLASLOOM_DATA_DIR
            else env.ATLASLOOM_DATA_DIR = previousDataDirectory
            await rm(dataDirectory, { recursive: true, force: true })
        }
    }
})

// Given the app runs with a fresh isolated data directory
// When the user creates a project with a unique name and optional description
// Then the project is visible and remains available after restarting the app
test('persists projects created through the browser across an app restart', async ({ page, projectApp }) => {
    await page.goto(projectApp.url)
    await createProjectThroughUi(page, '雾港编年', '群岛城市的旧秩序与新航路')

    await expect(page.getByRole('row', { name: /雾港编年/ })).toContainText('群岛城市的旧秩序与新航路')
    await projectApp.restart()

    await page.goto(projectApp.url)
    await expect(page.getByRole('row', { name: /雾港编年/ })).toContainText('群岛城市的旧秩序与新航路')
})

// Given an existing project
// When the user opens it, returns to the list, and uses browser back/forward
// Then the URL and visible project level stay synchronized
test('synchronizes project navigation with browser history', async ({ page, projectApp }) => {
    await page.goto(projectApp.url)
    await createProjectThroughUi(page, '星垂边境')
    await expect(page.getByRole('row', { name: /星垂边境/ })).toBeVisible()

    await page.getByRole('button', { name: '打开 星垂边境' }).click()
    await expect(page).toHaveURL(/project=/)
    await expect(page.getByRole('heading', { name: '星垂边境' })).toBeVisible()

    await page.getByRole('button', { name: /全部项目/ }).click()
    await expect(page).toHaveURL(/\/$/)
    await page.goBack()
    await expect(page.getByRole('heading', { name: '星垂边境' })).toBeVisible()
    await page.goForward()
    await expect(page.getByRole('heading', { name: '创作项目' })).toBeVisible()
})

// Given an existing project
// When the user edits its name and description
// Then the project list and persisted data show the new values after restart
test('saves project edits and renames the project directory', async ({ page, projectApp }) => {
    await page.goto(projectApp.url)
    await createProjectThroughUi(page, '雾港编年', '旧简介')

    await page.getByRole('button', { name: '编辑 雾港编年' }).click()
    await page.getByLabel('项目名称').fill('雾港新编')
    await page.getByLabel('项目简介').fill('更新后的简介')
    await page.getByRole('button', { name: '保存修改' }).click()
    await expect(page.getByRole('row', { name: /雾港新编/ })).toContainText('更新后的简介')
    await expect(page.getByRole('row', { name: /雾港编年/ })).toHaveCount(0)

    await projectApp.restart()
    await page.goto(projectApp.url)
    await expect(page.getByRole('row', { name: /雾港新编/ })).toContainText('更新后的简介')
})

// Given a project already uses a name
// When the user creates or renames another project to a case-equivalent name
// Then the form rejects the duplicate and leaves both existing projects intact
test('rejects duplicate project names on creation and rename in the browser', async ({ page, projectApp }) => {
    await page.goto(projectApp.url)
    await createProjectThroughUi(page, 'Atlas Loom')

    await page.getByRole('button', { name: '＋ 新建项目' }).click()
    await page.getByLabel('项目名称').fill('atlas loom')
    await page.getByRole('button', { name: '创建项目' }).click()

    await expect(page.getByRole('alert')).toContainText('已存在')
    await expect(page.getByRole('row', { name: /Atlas Loom/ })).toHaveCount(1)

    await page.getByRole('button', { name: '取消' }).click()
    await createProjectThroughUi(page, 'Other project')
    await expect(page.getByRole('row', { name: /Other project/ })).toBeVisible()

    await page.getByRole('button', { name: '编辑 Other project' }).click()
    await page.getByLabel('项目名称').fill('ATLAS LOOM')
    await page.getByRole('button', { name: '保存修改' }).click()

    await expect(page.getByRole('alert')).toContainText('已存在')
    await expect(page.getByRole('row', { name: /Other project/ })).toBeVisible()
    await expect(page.getByRole('row', { name: /Atlas Loom/ })).toHaveCount(1)
})

// Given a project folder whose name no longer matches its metadata
// When the user chooses to keep the folder name
// Then the project returns to the usable list under that name
test('lets the user choose how to repair a project directory mismatch', async ({ page, projectApp }) => {
    await page.goto(projectApp.url)
    await createProjectThroughUi(page, '项目原名', '仍需保留的简介')
    await expect(page.getByRole('row', { name: /项目原名/ })).toContainText('仍需保留的简介')
    const metadataPath = join(projectApp.dataDirectory, '项目原名', 'metadata.json')
    const metadata = JSON.parse(await readFile(metadataPath, 'utf8')) as { name: string }
    metadata.name = '磁盘目录名'
    await writeFile(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`)
    await page.reload()

    await expect(page.getByRole('status')).toContainText('目录名“项目原名”与项目名“磁盘目录名”不一致')
    await page.getByRole('button', { name: '使用目录名' }).click()
    await expect(page.getByRole('row', { name: /项目原名/ })).toContainText('仍需保留的简介')
})

// Given corrupted project metadata and an available previous version
// When the user confirms restoring that version
// Then the project list shows the restored version without changing any other project
test('requires confirmation before restoring a project metadata backup', async ({ page, projectApp }) => {
    await page.goto(projectApp.url)
    await createProjectThroughUi(page, '待恢复项目', '有效备份简介')
    await page.getByRole('button', { name: '编辑 待恢复项目' }).click()
    await page.getByLabel('项目简介').fill('损坏前的新简介')
    await page.getByRole('button', { name: '保存修改' }).click()
    await expect(page.getByRole('row', { name: /待恢复项目/ })).toContainText('损坏前的新简介')
    await writeFile(join(projectApp.dataDirectory, '待恢复项目', 'metadata.json'), '{invalid json')
    await page.reload()

    await expect(page.getByRole('status')).toContainText('检测到有效的上一份备份')
    page.once('dialog', (dialog) => dialog.accept())
    await page.getByRole('button', { name: '恢复有效备份' }).click()
    await expect(page.getByRole('row', { name: /待恢复项目/ })).toContainText('有效备份简介')
})

async function startApp(): Promise<{ server: ViteDevServer; url: string }> {
    const server = await createServer({
        configFile: resolve(cwd(), 'vite.config.ts'),
        logLevel: 'silent',
        server: { host: '127.0.0.1', port: 0 }
    })
    await server.listen()

    const address = server.httpServer?.address()
    if (!address || typeof address === 'string') throw new Error('Vite did not open a TCP listener.')

    return { server, url: `http://127.0.0.1:${address.port}` }
}

async function createProjectThroughUi(page: Page, name: string, description = ''): Promise<void> {
    await page.getByRole('button', { name: '＋ 新建项目' }).click()
    await page.getByLabel('项目名称').fill(name)
    if (description) await page.getByLabel('项目简介').fill(description)
    await page.getByRole('button', { name: '创建项目' }).click()
}
