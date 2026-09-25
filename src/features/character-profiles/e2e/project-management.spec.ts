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

// Given a project and character with saved changes
// When the user opens their history before and after restarting the app
// Then the project and character summaries remain visible
test('shows project and character history across an app restart', async ({ page, projectApp }) => {
    await page.goto(projectApp.url)
    await createProjectThroughUi(page, '雾港编年')
    await page.getByRole('button', { name: '打开 雾港编年' }).click()
    const projectUrl = page.url()

    await page.getByRole('button', { name: '查看项目变更历史' }).click()
    await expect(page.getByRole('region', { name: '项目变更历史' })).toContainText('创建项目')

    await createCharacterThroughUi(page, { name: '沈潮生' })
    await page.getByRole('button', { name: '查看角色变更历史' }).click()
    await expect(page.getByRole('region', { name: '角色变更历史' })).toContainText('创建角色')

    await page.getByRole('button', { name: '编辑角色' }).click()
    await page.getByLabel('角色简介').fill('旧港口的领航员。')
    await page.getByRole('button', { name: '保存角色' }).click()
    await expect(page.getByRole('region', { name: '角色变更历史' })).toContainText('修改角色简介')

    await projectApp.restart()
    await page.goto(projectApp.url + new URL(projectUrl).search)
    await page.getByRole('button', { name: '查看项目变更历史' }).click()
    await expect(page.getByRole('region', { name: '项目变更历史' })).toContainText('创建项目')
    await page.getByRole('button', { name: '打开 沈潮生' }).click()
    await page.getByRole('button', { name: '查看角色变更历史' }).click()
    await expect(page.getByRole('region', { name: '角色变更历史' })).toContainText('修改角色简介')
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

// Given a project with a character
// When the user deletes and restores the character and project
// Then each record disappears from normal browsing without losing the saved data
test('deletes and restores projects and characters from the browser', async ({ page, projectApp }) => {
    await page.goto(projectApp.url)
    await createProjectThroughUi(page, '雾港编年')
    await page.getByRole('button', { name: '打开 雾港编年' }).click()
    await createCharacterThroughUi(page, { name: '沈潮生', introduction: '旧港口的领航员。' })

    page.once('dialog', (dialog) => dialog.accept())
    await page.getByRole('button', { name: '删除角色' }).click()
    await page.getByRole('button', { name: '查看角色变更历史' }).click()
    await expect(page.getByRole('region', { name: '角色变更历史' })).toContainText('删除角色')
    await page.getByRole('button', { name: '角色列表' }).click()
    await expect(page.getByRole('heading', { name: '已删除角色' })).toBeVisible()
    await expect(page.getByRole('button', { name: '恢复 沈潮生' })).toBeVisible()

    await page.getByRole('button', { name: '恢复 沈潮生' }).click()
    await expect(page.getByRole('button', { name: '打开 沈潮生' })).toBeVisible()
    await page.getByRole('button', { name: '打开 沈潮生' }).click()
    await page.getByRole('button', { name: '查看角色变更历史' }).click()
    await expect(page.getByRole('region', { name: '角色变更历史' })).toContainText('恢复角色')

    await page.getByRole('button', { name: '全部项目' }).click()
    await page.getByRole('button', { name: '打开 雾港编年' }).click()
    page.once('dialog', (dialog) => dialog.accept())
    await page.getByRole('button', { name: '删除项目' }).click()
    await page.getByRole('button', { name: '全部项目' }).click()

    await expect(page.getByRole('heading', { name: '已删除项目' })).toBeVisible()
    await expect(page.getByText('雾港编年')).toBeVisible()
    await expect(page.getByRole('button', { name: '打开 雾港编年' })).toBeVisible()

    await page.getByRole('button', { name: '打开 雾港编年' }).click()
    await expect(page.getByText('项目已删除')).toBeVisible()
    await page.getByRole('button', { name: '查看项目变更历史' }).click()
    await expect(page.getByRole('region', { name: '项目变更历史' })).toContainText('删除项目')
    await expect(page.getByRole('heading', { name: '归档角色' })).toBeVisible()
    await expect(page.getByRole('heading', { name: '沈潮生' })).toBeVisible()
    await expect(page.getByRole('button', { name: '＋ 新建角色' })).toHaveCount(0)
    await page.getByRole('button', { name: '恢复项目' }).click()
    await expect(page.getByRole('button', { name: '删除项目' })).toBeVisible()
    await page.getByRole('button', { name: '查看项目变更历史' }).click()
    await expect(page.getByRole('region', { name: '项目变更历史' })).toContainText('恢复项目')
    await expect(page.getByRole('button', { name: '打开 沈潮生' })).toBeVisible()

    await projectApp.restart()
    await page.goto(projectApp.url)
    await expect(page.getByRole('row', { name: /雾港编年/ })).toBeVisible()
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

// Given an existing project
// When the user creates a character with every fixed profile field
// Then the complete profile is visible and remains available after an app restart
test('creates and persists a complete character profile', async ({ page, projectApp }) => {
    await page.goto(projectApp.url)
    await createProjectThroughUi(page, '雾港编年')
    await page.getByRole('button', { name: '打开 雾港编年' }).click()
    const projectUrl = page.url()
    await page.getByRole('button', { name: '＋ 新建角色' }).click()
    await fillCharacterForm(page, {
        name: '沈潮生',
        aliases: '潮生\n船长',
        introduction: '在旧港口长大的领航员。',
        appearance: '常穿深色航海外套。',
        personality: '谨慎但固执。',
        backstory: '曾在风暴中失去船队。',
        motivation: '找到失散的妹妹。',
        abilities: '熟悉潮汐和旧航道。',
        notes: '不要让他轻易相信陌生人。'
    })
    await page.getByRole('button', { name: '创建角色' }).click()

    await expect(page.getByRole('heading', { name: '沈潮生' })).toBeVisible()
    await expect(page.getByText('在旧港口长大的领航员。')).toBeVisible()
    await expect(page.getByText('潮生、船长')).toBeVisible()

    await projectApp.restart()
    await page.goto(projectApp.url + new URL(projectUrl).search)
    await expect(page.getByRole('button', { name: '打开 沈潮生' })).toBeVisible()
    await page.getByRole('button', { name: '打开 沈潮生' }).click()
    await expect(page.getByRole('heading', { name: '沈潮生' })).toBeVisible()
    await expect(page.getByText('不要让他轻易相信陌生人。')).toBeVisible()
})

// Given a character form with only whitespace as its name
// When the user submits the form
// Then the draft stays local and the form reports the boundary error
test('keeps the character form open for a blank name', async ({ page, projectApp }) => {
    await page.goto(projectApp.url)
    await createProjectThroughUi(page, '雾港编年')
    await page.getByRole('button', { name: '打开 雾港编年' }).click()
    await page.getByRole('button', { name: '＋ 新建角色' }).click()
    await page.getByLabel('角色姓名').fill('   ')
    await page.getByRole('button', { name: '创建角色' }).click()

    await expect(page.getByRole('dialog', { name: '新建角色' })).toBeVisible()
    await expect(page.getByRole('dialog').getByRole('alert')).toContainText('请填写角色姓名')
})

// Given a project with a character
// When the user edits its profile or reuses its name
// Then the changes persist and duplicate names are rejected only within that project
test('edits a character and enforces project-local name uniqueness', async ({ page, projectApp }) => {
    await page.goto(projectApp.url)
    await createProjectThroughUi(page, '雾港编年')
    await page.getByRole('button', { name: '打开 雾港编年' }).click()
    await page.getByRole('button', { name: '＋ 新建角色' }).click()
    await fillCharacterForm(page, { name: '沈潮生' })
    await page.getByRole('button', { name: '创建角色' }).click()
    await page.getByRole('button', { name: /编辑角色：沈潮生/ }).click()
    await page.getByLabel('角色姓名').fill('陆照夜')
    await page.getByLabel('角色简介').fill('新的简介。')
    await page.getByRole('button', { name: '保存角色' }).click()

    await expect(page.getByRole('heading', { name: '陆照夜' })).toBeVisible()
    await expect(page.getByText('新的简介。')).toBeVisible()
    await page.getByRole('button', { name: '角色列表' }).click()
    await page.getByRole('button', { name: '＋ 新建角色' }).click()
    await fillCharacterForm(page, { name: '陆照夜' })
    await page.getByRole('button', { name: '创建角色' }).click()
    await expect(page.getByRole('alert')).toContainText('已存在')
})

// Given two projects
// When the user creates the same character name in each project
// Then each project keeps its own independent profile
test('allows the same character name in different projects', async ({ page, projectApp }) => {
    await page.goto(projectApp.url)
    await createProjectThroughUi(page, '雾港编年')
    await createProjectThroughUi(page, '星垂边境')

    await page.getByRole('button', { name: '打开 雾港编年' }).click()
    await page.getByRole('button', { name: '＋ 新建角色' }).click()
    await fillCharacterForm(page, { name: '沈潮生', introduction: '雾港版本。' })
    await page.getByRole('button', { name: '创建角色' }).click()
    await page.getByRole('button', { name: '角色列表' }).click()
    await page.getByRole('button', { name: '全部项目' }).click()

    await page.getByRole('button', { name: '打开 星垂边境' }).click()
    await page.getByRole('button', { name: '＋ 新建角色' }).click()
    await fillCharacterForm(page, { name: '沈潮生', introduction: '星垂版本。' })
    await page.getByRole('button', { name: '创建角色' }).click()

    await expect(page.getByRole('heading', { name: '沈潮生' })).toBeVisible()
    await expect(page.getByText('星垂版本。')).toBeVisible()
})

// Given a project with several characters
// When the user searches, combines tag filters, and renames a project tag
// Then tags stay project-scoped, use AND semantics, and persist with character assignments
test('maintains project tags and filters the character list', async ({ page, projectApp }) => {
    await page.goto(projectApp.url)
    await createProjectThroughUi(page, '雾港编年')
    await page.getByRole('button', { name: '打开 雾港编年' }).click()
    const projectUrl = page.url()

    await createCharacterThroughUi(page, {
        name: '沈潮生',
        aliases: '潮生',
        introduction: '旧港口的领航员。',
        tags: ['主角', '航海']
    })
    await page.getByRole('button', { name: '角色列表' }).click()
    await createCharacterThroughUi(page, {
        name: '林砚舟',
        introduction: '负责修复旧船的工匠。',
        tags: ['航海']
    })
    await page.getByRole('button', { name: '角色列表' }).click()
    await createCharacterThroughUi(page, {
        name: '白栖迟',
        introduction: '在城中经营书店。',
        tags: ['主角']
    })
    await page.getByRole('button', { name: '角色列表' }).click()

    const search = page.getByLabel('搜索角色')
    await search.fill('潮生')
    await expect(page.getByRole('button', { name: '打开 沈潮生' })).toBeVisible()
    await expect(page.getByRole('button', { name: '打开 林砚舟' })).toHaveCount(0)

    await search.fill('')
    await page.getByLabel('筛选标签：主角').check()
    await page.getByLabel('筛选标签：航海').check()
    await expect(page.getByRole('button', { name: '打开 沈潮生' })).toBeVisible()
    await expect(page.getByRole('button', { name: '打开 林砚舟' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: '打开 白栖迟' })).toHaveCount(0)

    await page.getByRole('button', { name: '清除筛选' }).click()
    await expect(page.getByRole('button', { name: '打开 沈潮生' })).toBeVisible()
    await expect(page.getByRole('button', { name: '打开 林砚舟' })).toBeVisible()
    await expect(page.getByRole('button', { name: '打开 白栖迟' })).toBeVisible()

    await page.getByLabel('筛选标签：主角').check()
    await page.getByRole('button', { name: '重命名标签：主角' }).click()
    await page.getByLabel('标签名称').fill('核心')
    await page.getByRole('button', { name: '保存标签' }).click()
    await expect(page.getByLabel('筛选标签：核心')).toBeVisible()

    await projectApp.restart()
    await page.goto(projectApp.url + new URL(projectUrl).search)
    await expect(page.getByLabel('筛选标签：核心')).toBeVisible()
    await page.getByRole('button', { name: '打开 沈潮生' }).click()
    await expect(page.getByText('核心')).toBeVisible()
})

// Given a character form with a tag creation request still in flight
// When the user tries to save the character
// Then character saving stays disabled until the tag has been persisted
test('waits for a pending tag mutation before allowing character save', async ({ page, projectApp }) => {
    await page.goto(projectApp.url)
    await createProjectThroughUi(page, '雾港编年')
    await page.getByRole('button', { name: '打开 雾港编年' }).click()

    let characterCreateCount = 0
    await page.route('**/api/projects/*/characters', async (route) => {
        if (route.request().method() === 'POST') characterCreateCount += 1
        await route.continue()
    })
    let releaseTagResponse!: () => void
    const tagResponse = new Promise<void>((resolve) => {
        releaseTagResponse = resolve
    })
    await page.route('**/api/projects/*/tags', async (route) => {
        if (route.request().method() !== 'POST') {
            await route.continue()
            return
        }

        const response = await route.fetch()
        await tagResponse
        await route.fulfill({ response })
    })

    await page.getByRole('button', { name: '＋ 新建角色' }).click()
    await page.getByLabel('角色姓名').fill('沈潮生')
    await page.getByLabel('新建标签').fill('领航员')
    const pendingTag = page.getByRole('button', { name: '新建标签' }).click()
    const saveCharacter = page.locator('form').getByRole('button', { name: /创建角色|标签保存中/ })

    await expect(saveCharacter).toBeDisabled()
    await page.getByLabel('角色姓名').press('Enter')
    expect(characterCreateCount).toBe(0)
    await expect(page.getByRole('heading', { name: '新建角色' })).toBeVisible()
    releaseTagResponse()
    await pendingTag
    await expect(page.getByRole('button', { name: '创建角色' })).toBeEnabled()
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

async function createCharacterThroughUi(
    page: Page,
    values: Partial<{
        name: string
        aliases: string
        introduction: string
        tags: string[]
    }>
): Promise<void> {
    await page.getByRole('button', { name: '＋ 新建角色' }).click()
    await page.getByLabel('角色姓名').fill(values.name ?? '')
    if (values.aliases !== undefined) await page.getByLabel('别名').fill(values.aliases)
    if (values.introduction !== undefined) await page.getByLabel('角色简介').fill(values.introduction)

    for (const tag of values.tags ?? []) {
        const tagCheckbox = page.getByLabel(`角色标签：${tag}`)
        if ((await tagCheckbox.count()) === 0) {
            await page.getByLabel('新建标签').fill(tag)
            await page.getByRole('button', { name: '新建标签' }).click()
        }
        await tagCheckbox.check()
    }
    await page.getByRole('button', { name: '创建角色' }).click()
}

async function fillCharacterForm(
    page: Page,
    values: Partial<{
        name: string
        aliases: string
        introduction: string
        appearance: string
        personality: string
        backstory: string
        motivation: string
        abilities: string
        notes: string
    }>
): Promise<void> {
    await page.getByLabel('角色姓名').fill(values.name ?? '')
    for (const field of ['别名', '角色简介', '外貌', '性格', '背景故事', '目标 / 动机', '能力', '备注']) {
        const key =
            field === '别名'
                ? 'aliases'
                : field === '角色简介'
                  ? 'introduction'
                  : field === '外貌'
                    ? 'appearance'
                    : field === '性格'
                      ? 'personality'
                      : field === '背景故事'
                        ? 'backstory'
                        : field === '目标 / 动机'
                          ? 'motivation'
                          : field === '能力'
                            ? 'abilities'
                            : 'notes'
        const value = values[key as keyof typeof values]
        if (value !== undefined) await page.getByLabel(field).fill(value)
    }
}
