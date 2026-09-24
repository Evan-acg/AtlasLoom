<script setup lang="ts">
    import { computed, onMounted, onUnmounted, ref } from 'vue'
    import WorkspaceVariantDashboard from '../components/WorkspaceVariantDashboard.vue'
    import WorkspaceVariantDirectory from '../components/WorkspaceVariantDirectory.vue'
    import WorkspaceVariantStudio from '../components/WorkspaceVariantStudio.vue'
    import type { WorkspaceCharacter, WorkspaceProject } from '../types'

    // Three structurally different project/character workspaces on `/`, switchable via `?variant=a|b|c`.
    // This prototype uses in-memory sample data and does not persist edits.
    const variant = ref<'a' | 'b' | 'c'>('a')
    const projects = ref<WorkspaceProject[]>([
        { id: 'mist-harbor', name: '雾港编年', description: '群岛城市的旧秩序与新航路' },
        { id: 'falling-stars', name: '星垂边境', description: '边境行星上的一次漫长远征' },
        { id: 'paper-kite', name: '纸鸢纪事', description: '一座小城里交错的几段人生' }
    ])
    const characters = ref<WorkspaceCharacter[]>([
        {
            id: 'lin-zhixia',
            projectId: 'mist-harbor',
            name: '林知夏',
            aliases: ['小夏'],
            introduction: '追查沉船账册的年轻档案员。',
            appearance: '短发，常穿旧海军外套。',
            personality: '好奇、谨慎，遇到谜题时很执拗。',
            backstory: '在旧灯塔附近长大。',
            motivation: '查清父亲失踪前留下的航线。',
            abilities: '辨认旧航图，熟悉港口暗语。',
            notes: '不喜欢别人替她做决定。',
            tags: ['主角', '调查']
        },
        {
            id: 'shen-yan',
            projectId: 'mist-harbor',
            name: '沈砚',
            aliases: ['砚哥'],
            introduction: '负责维护港口观测站的前水手。',
            appearance: '深色卷发，左手戴铜制护腕。',
            personality: '寡言、可靠，习惯先观察再行动。',
            backstory: '曾随商船走过北方群岛。',
            motivation: '守住观测站，不让旧事故重演。',
            abilities: '导航、修理机械钟。',
            notes: '对暴风雨的声音很敏感。',
            tags: ['配角', '观测站']
        },
        {
            id: 'yu-mian',
            projectId: 'mist-harbor',
            name: '余眠',
            aliases: ['眠老板'],
            introduction: '经营潮汐街的旧书店，收藏许多失传的航海日志。',
            appearance: '银灰长发，衣袋里总有纸签。',
            personality: '健谈、机敏，喜欢用问题回答问题。',
            backstory: '年轻时曾在海上剧团巡演。',
            motivation: '找回一本被拆散的航海日志。',
            abilities: '记忆人名、整理文献。',
            notes: '知道不少港口传闻。',
            tags: ['关键线索']
        },
        {
            id: 'an-qiao',
            projectId: 'falling-stars',
            name: '安乔',
            aliases: ['乔'],
            introduction: '负责勘探队补给与路线规划的工程师。',
            appearance: '短寸发，工具腰带磨损明显。',
            personality: '直接、乐观，擅长让团队保持节奏。',
            backstory: '来自轨道空间站。',
            motivation: '找到一条能长期往返的安全航线。',
            abilities: '维修、资源调度。',
            notes: '随身带着旧站点的地图。',
            tags: ['主角', '工程']
        },
        {
            id: 'qiu-lan',
            projectId: 'falling-stars',
            name: '邱岚',
            aliases: ['岚队'],
            introduction: '远征队的地质学家，负责判断落脚点。',
            appearance: '总戴着透明护目镜。',
            personality: '沉着、好胜，对数据非常敏锐。',
            backstory: '曾参与一次失败的极地任务。',
            motivation: '证明新星球并非无法居住。',
            abilities: '地质采样、野外急救。',
            notes: '需要更多时间才会信任新队员。',
            tags: ['队友', '研究']
        },
        {
            id: 'luo-xun',
            projectId: 'falling-stars',
            name: '罗寻',
            aliases: ['导航员'],
            introduction: '年轻的导航员，负责记录远征中的异常信号。',
            appearance: '黑色短发，手腕有一圈淡色印记。',
            personality: '安静、敏感，善于发现细节。',
            backstory: '在货运船队长大。',
            motivation: '找到信号来源并联系发送者。',
            abilities: '星图测绘、无线电监听。',
            notes: '记得每一段收到的摩斯电码。',
            tags: ['信号', '研究']
        },
        {
            id: 'zhou-qinghe',
            projectId: 'paper-kite',
            name: '周清禾',
            aliases: ['禾禾'],
            introduction: '刚搬回故乡的植物学教师。',
            appearance: '棕色长辫，常背帆布袋。',
            personality: '温和、坚定，面对学生时很有耐心。',
            backstory: '离开小城十年后因祖母来信返乡。',
            motivation: '修复老屋旁荒废的社区花园。',
            abilities: '园艺、绘制植物手稿。',
            notes: '不太会拒绝邻居的请求。',
            tags: ['主角', '返乡']
        },
        {
            id: 'he-yu',
            projectId: 'paper-kite',
            name: '何雨',
            aliases: ['小雨'],
            introduction: '社区广播站的主持人，熟悉城里每条街巷。',
            appearance: '圆框眼镜，随身带着录音笔。',
            personality: '热情、健谈，偶尔有些冒失。',
            backstory: '从小在城南长大，认识许多老住户。',
            motivation: '做一档记录街坊故事的节目。',
            abilities: '采访、声音剪辑、快速记路。',
            notes: '总在寻找新的节目主题。',
            tags: ['邻居', '记录者']
        }
    ])
    const selectedProjectId = ref('mist-harbor')
    const selectedCharacterId = ref('lin-zhixia')
    const searchQuery = ref('')
    const selectedTags = ref<string[]>([])
    const dialog = ref<'project' | 'character' | null>(null)
    const editingCharacterId = ref<string | null>(null)
    const projectNameDraft = ref('')
    const projectDescriptionDraft = ref('')
    const characterNameDraft = ref('')
    const characterIntroductionDraft = ref('')
    const formError = ref('')

    const currentProject = computed(
        () => projects.value.find((project) => project.id === selectedProjectId.value) ?? projects.value[0]!
    )
    const projectCharacters = computed(() =>
        characters.value.filter((character) => character.projectId === selectedProjectId.value)
    )
    const allTags = computed(() => [...new Set(projectCharacters.value.flatMap((character) => character.tags))])
    const filteredCharacters = computed(() => {
        const query = searchQuery.value.trim().toLocaleLowerCase()
        return projectCharacters.value.filter((character) => {
            const matchesQuery =
                !query ||
                [character.name, ...character.aliases, character.introduction].some((value) =>
                    value.toLocaleLowerCase().includes(query)
                )
            const matchesTags = selectedTags.value.every((tag) => character.tags.includes(tag))
            return matchesQuery && matchesTags
        })
    })
    const selectedCharacter = computed(
        () => characters.value.find((character) => character.id === selectedCharacterId.value) ?? null
    )

    function syncVariantFromUrl() {
        const requested = new globalThis.URLSearchParams(globalThis.location.search).get('variant')
        variant.value = requested === 'b' || requested === 'c' ? requested : 'a'
    }

    function setVariant(next: 'a' | 'b' | 'c') {
        variant.value = next
        const params = new globalThis.URLSearchParams(globalThis.location.search)
        params.set('variant', next)
        globalThis.history.replaceState(
            null,
            '',
            `${globalThis.location.pathname}?${params.toString()}${globalThis.location.hash}`
        )
    }

    function cycleVariant(direction: -1 | 1) {
        const variants = ['a', 'b', 'c'] as const
        const nextIndex = (variants.indexOf(variant.value) + direction + variants.length) % variants.length
        setVariant(variants[nextIndex]!)
    }

    function handleVariantKeydown(event: globalThis.KeyboardEvent) {
        const target = event.target
        if (
            target instanceof globalThis.HTMLElement &&
            target.closest('input, textarea, select, [contenteditable="true"]')
        )
            return
        if (event.key === 'ArrowLeft') cycleVariant(-1)
        if (event.key === 'ArrowRight') cycleVariant(1)
    }

    function selectProject(projectId: string) {
        selectedProjectId.value = projectId
        selectedTags.value = []
        selectedCharacterId.value = characters.value.find((character) => character.projectId === projectId)?.id ?? ''
    }

    function toggleTag(tag: string) {
        selectedTags.value = selectedTags.value.includes(tag)
            ? selectedTags.value.filter((selected) => selected !== tag)
            : [...selectedTags.value, tag]
    }

    function startProjectCreation() {
        projectNameDraft.value = ''
        projectDescriptionDraft.value = ''
        formError.value = ''
        dialog.value = 'project'
    }

    function startCharacterEditing(character?: WorkspaceCharacter) {
        editingCharacterId.value = character?.id ?? null
        characterNameDraft.value = character?.name ?? ''
        characterIntroductionDraft.value = character?.introduction ?? ''
        formError.value = ''
        dialog.value = 'character'
    }

    function saveProject() {
        const name = projectNameDraft.value.trim()
        if (!name) {
            formError.value = '请填写项目名称。'
            return
        }
        if (projects.value.some((project) => project.name === name)) {
            formError.value = '项目名称已存在，请换一个名称。'
            return
        }
        const project = { id: `project-${Date.now()}`, name, description: projectDescriptionDraft.value.trim() }
        projects.value.push(project)
        selectProject(project.id)
        dialog.value = null
    }

    function saveCharacter() {
        const name = characterNameDraft.value.trim()
        if (!name) {
            formError.value = '请填写角色姓名。'
            return
        }
        if (
            projectCharacters.value.some(
                (character) => character.name === name && character.id !== editingCharacterId.value
            )
        ) {
            formError.value = '这个项目中已有同名角色。'
            return
        }
        if (editingCharacterId.value) {
            const character = characters.value.find((item) => item.id === editingCharacterId.value)
            if (character) {
                character.name = name
                character.introduction = characterIntroductionDraft.value.trim()
                selectedCharacterId.value = character.id
            }
        } else {
            const character: WorkspaceCharacter = {
                id: `character-${Date.now()}`,
                projectId: selectedProjectId.value,
                name,
                aliases: [],
                introduction: characterIntroductionDraft.value.trim(),
                appearance: '待补充',
                personality: '待补充',
                backstory: '待补充',
                motivation: '待补充',
                abilities: '待补充',
                notes: '待补充',
                tags: []
            }
            characters.value.push(character)
            selectedCharacterId.value = character.id
        }
        dialog.value = null
    }

    onMounted(() => {
        syncVariantFromUrl()
        globalThis.addEventListener('popstate', syncVariantFromUrl)
        globalThis.addEventListener('keydown', handleVariantKeydown)
    })
    onUnmounted(() => {
        globalThis.removeEventListener('popstate', syncVariantFromUrl)
        globalThis.removeEventListener('keydown', handleVariantKeydown)
    })
</script>

<template>
    <main class="min-h-screen bg-canvas-soft px-4 pb-24 text-ink sm:px-8">
        <header
            class="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-4 border-b border-hairline py-5"
        >
            <div>
                <p class="text-xs font-semibold tracking-wide text-primary">AtlasLoom · 创作工作区</p>
                <h1 class="mt-1 text-xl font-semibold">项目与角色档案</h1>
            </div>
            <p class="rounded-full border border-hairline bg-white px-3 py-2 text-xs text-ink-muted">
                交互原型 · 内存样例数据 · 不会保存
            </p>
        </header>

        <div class="mx-auto max-w-[1200px] pt-7">
            <p class="mb-4 text-sm leading-6 text-ink-secondary">
                比较三种项目浏览与角色档案工作方式。使用底部切换条或键盘方向键切换布局；项目、搜索和档案编辑状态仅保存在本页内存中。
            </p>
            <WorkspaceVariantDashboard
                v-if="variant === 'a'"
                :projects="projects"
                :selected-project-id="selectedProjectId"
                :current-project="currentProject"
                :characters="projectCharacters"
                :filtered-characters="filteredCharacters"
                :selected-character="selectedCharacter"
                :search-query="searchQuery"
                :selected-tags="selectedTags"
                :all-tags="allTags"
                @select-project="selectProject"
                @select-character="selectedCharacterId = $event"
                @update-search-query="searchQuery = $event"
                @toggle-tag="toggleTag"
                @new-project="startProjectCreation"
                @new-character="startCharacterEditing()"
                @edit-character="startCharacterEditing($event)"
            />
            <WorkspaceVariantStudio
                v-else-if="variant === 'b'"
                :projects="projects"
                :selected-project-id="selectedProjectId"
                :current-project="currentProject"
                :characters="projectCharacters"
                :filtered-characters="filteredCharacters"
                :selected-character="selectedCharacter"
                :search-query="searchQuery"
                :selected-tags="selectedTags"
                :all-tags="allTags"
                @select-project="selectProject"
                @select-character="selectedCharacterId = $event"
                @update-search-query="searchQuery = $event"
                @toggle-tag="toggleTag"
                @new-project="startProjectCreation"
                @new-character="startCharacterEditing()"
                @edit-character="startCharacterEditing($event)"
            />
            <WorkspaceVariantDirectory
                v-else
                :projects="projects"
                :selected-project-id="selectedProjectId"
                :current-project="currentProject"
                :characters="projectCharacters"
                :filtered-characters="filteredCharacters"
                :selected-character="selectedCharacter"
                :search-query="searchQuery"
                :selected-tags="selectedTags"
                :all-tags="allTags"
                @select-project="selectProject"
                @select-character="selectedCharacterId = $event"
                @update-search-query="searchQuery = $event"
                @toggle-tag="toggleTag"
                @new-project="startProjectCreation"
                @new-character="startCharacterEditing()"
                @edit-character="startCharacterEditing($event)"
            />
        </div>

        <nav
            aria-label="原型布局切换"
            class="fixed bottom-5 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-full bg-ink px-3 py-2 text-white shadow-xl"
        >
            <button
                class="min-h-11 min-w-11 rounded-full text-lg hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                type="button"
                aria-label="上一个布局"
                @click="cycleVariant(-1)"
            >
                ←
            </button>
            <span class="min-w-42 text-center text-sm font-medium">
                {{ variant.toUpperCase() }} ·
                {{ variant === 'a' ? '项目看板' : variant === 'b' ? '创作工作台' : '角色目录' }}
            </span>
            <button
                class="min-h-11 min-w-11 rounded-full text-lg hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                type="button"
                aria-label="下一个布局"
                @click="cycleVariant(1)"
            >
                →
            </button>
        </nav>

        <div
            v-if="dialog"
            class="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4"
            @click.self="dialog = null"
        >
            <form
                v-if="dialog === 'project'"
                aria-labelledby="project-dialog-title"
                class="w-full max-w-lg rounded-2xl border border-hairline bg-white p-6 shadow-xl sm:p-8"
                @submit.prevent="saveProject"
            >
                <div class="flex items-start justify-between gap-4">
                    <div>
                        <p class="text-sm font-medium text-primary">新建项目</p>
                        <h2
                            id="project-dialog-title"
                            class="mt-1 text-2xl font-semibold"
                        >
                            开始一个创作空间
                        </h2>
                    </div>
                    <button
                        class="min-h-11 min-w-11 rounded-lg text-ink-muted hover:bg-canvas-soft"
                        type="button"
                        aria-label="关闭"
                        @click="dialog = null"
                    >
                        ×
                    </button>
                </div>
                <label
                    class="mt-6 block text-sm font-medium"
                    for="prototype-project-name"
                >
                    项目名称
                </label>
                <input
                    id="prototype-project-name"
                    v-model="projectNameDraft"
                    autofocus
                    class="mt-2 min-h-11 w-full rounded-md border border-hairline px-3 focus:border-primary focus:outline-none"
                    placeholder="例如：雾港编年"
                />
                <label
                    class="mt-4 block text-sm font-medium"
                    for="prototype-project-description"
                >
                    简介
                </label>
                <textarea
                    id="prototype-project-description"
                    v-model="projectDescriptionDraft"
                    class="mt-2 min-h-24 w-full rounded-md border border-hairline p-3 focus:border-primary focus:outline-none"
                    placeholder="用一两句话描述这个项目"
                />
                <p
                    v-if="formError"
                    aria-live="polite"
                    class="mt-3 text-sm text-red-700"
                >
                    {{ formError }}
                </p>
                <div class="mt-6 flex justify-end gap-3">
                    <button
                        class="min-h-11 rounded-lg border border-hairline px-4 font-medium"
                        type="button"
                        @click="dialog = null"
                    >
                        取消
                    </button>
                    <button
                        class="min-h-11 rounded-lg bg-primary px-4 font-semibold text-white hover:bg-primary-active"
                        type="submit"
                    >
                        创建项目
                    </button>
                </div>
            </form>
            <form
                v-else
                aria-labelledby="character-dialog-title"
                class="w-full max-w-lg rounded-2xl border border-hairline bg-white p-6 shadow-xl sm:p-8"
                @submit.prevent="saveCharacter"
            >
                <div class="flex items-start justify-between gap-4">
                    <div>
                        <p class="text-sm font-medium text-primary">
                            {{ editingCharacterId ? '编辑档案' : '新建角色' }}
                        </p>
                        <h2
                            id="character-dialog-title"
                            class="mt-1 text-2xl font-semibold"
                        >
                            {{ editingCharacterId ? '更新角色信息' : `添加到${currentProject.name}` }}
                        </h2>
                    </div>
                    <button
                        class="min-h-11 min-w-11 rounded-lg text-ink-muted hover:bg-canvas-soft"
                        type="button"
                        aria-label="关闭"
                        @click="dialog = null"
                    >
                        ×
                    </button>
                </div>
                <label
                    class="mt-6 block text-sm font-medium"
                    for="prototype-character-name"
                >
                    角色姓名
                </label>
                <input
                    id="prototype-character-name"
                    v-model="characterNameDraft"
                    autofocus
                    class="mt-2 min-h-11 w-full rounded-md border border-hairline px-3 focus:border-primary focus:outline-none"
                    placeholder="输入角色姓名"
                />
                <label
                    class="mt-4 block text-sm font-medium"
                    for="prototype-character-introduction"
                >
                    简介
                </label>
                <textarea
                    id="prototype-character-introduction"
                    v-model="characterIntroductionDraft"
                    class="mt-2 min-h-28 w-full rounded-md border border-hairline p-3 focus:border-primary focus:outline-none"
                    placeholder="这个角色是谁？"
                />
                <p
                    v-if="formError"
                    aria-live="polite"
                    class="mt-3 text-sm text-red-700"
                >
                    {{ formError }}
                </p>
                <div class="mt-6 flex justify-end gap-3">
                    <button
                        class="min-h-11 rounded-lg border border-hairline px-4 font-medium"
                        type="button"
                        @click="dialog = null"
                    >
                        取消
                    </button>
                    <button
                        class="min-h-11 rounded-lg bg-primary px-4 font-semibold text-white hover:bg-primary-active"
                        type="submit"
                    >
                        {{ editingCharacterId ? '保存修改' : '创建角色' }}
                    </button>
                </div>
            </form>
        </div>
    </main>
</template>
