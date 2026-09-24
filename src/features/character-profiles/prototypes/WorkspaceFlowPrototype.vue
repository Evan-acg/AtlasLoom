<script setup lang="ts">
    import { computed, onMounted, onUnmounted, ref } from 'vue'

    // One explicit drill-down: project index -> that project's character list -> one full character profile.
    // All sample records and edits remain in memory; this prototype never persists data.
    type Level = 'projects' | 'characters' | 'profile'
    interface Project {
        id: string
        name: string
        description: string
    }
    interface Character {
        id: string
        projectId: string
        name: string
        aliases: string[]
        introduction: string
        appearance: string
        personality: string
        backstory: string
        motivation: string
        abilities: string
        notes: string
        tags: string[]
    }

    const projects = ref<Project[]>([
        { id: 'mist-harbor', name: '雾港编年', description: '群岛城市的旧秩序与新航路' },
        { id: 'falling-stars', name: '星垂边境', description: '边境行星上的一次漫长远征' },
        { id: 'paper-kite', name: '纸鸢纪事', description: '一座小城里交错的几段人生' }
    ])
    const characters = ref<Character[]>([
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

    const level = ref<Level>('projects')
    const selectedProjectId = ref('')
    const selectedCharacterId = ref('')
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
        () => projects.value.find((project) => project.id === selectedProjectId.value) ?? null
    )
    const projectPreview = computed(() => currentProject.value ?? projects.value[0] ?? null)
    const projectCharacters = computed(() =>
        characters.value.filter((character) => character.projectId === selectedProjectId.value)
    )
    const currentCharacter = computed(
        () => characters.value.find((character) => character.id === selectedCharacterId.value) ?? null
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

    function syncFromUrl() {
        const params = new globalThis.URLSearchParams(globalThis.location.search)
        const requestedProject = projects.value.find((project) => project.id === params.get('project'))
        const requestedCharacter = characters.value.find(
            (character) => character.id === params.get('character') && character.projectId === requestedProject?.id
        )
        const requestedLevel = params.get('level')

        if (requestedLevel === 'profile' && requestedProject && requestedCharacter) {
            level.value = 'profile'
            selectedProjectId.value = requestedProject.id
            selectedCharacterId.value = requestedCharacter.id
        } else if ((requestedLevel === 'characters' || requestedLevel === 'profile') && requestedProject) {
            level.value = 'characters'
            selectedProjectId.value = requestedProject.id
            selectedCharacterId.value = ''
        } else {
            level.value = 'projects'
            selectedProjectId.value = ''
            selectedCharacterId.value = ''
        }
    }

    function writeUrl(
        nextLevel: Level,
        projectId = selectedProjectId.value,
        characterId = selectedCharacterId.value,
        replace = false
    ) {
        const params = new globalThis.URLSearchParams()
        params.set('prototype', 'workspace')
        params.set('level', nextLevel)
        if (nextLevel !== 'projects' && projectId) params.set('project', projectId)
        if (nextLevel === 'profile' && characterId) params.set('character', characterId)
        const url = `${globalThis.location.pathname}?${params.toString()}${globalThis.location.hash}`
        if (replace) globalThis.history.replaceState(null, '', url)
        else globalThis.history.pushState(null, '', url)
    }

    function openProject(project: Project) {
        selectedProjectId.value = project.id
        selectedCharacterId.value = ''
        searchQuery.value = ''
        selectedTags.value = []
        level.value = 'characters'
        writeUrl('characters', project.id, '')
    }

    function openCharacter(character: Character) {
        selectedCharacterId.value = character.id
        level.value = 'profile'
        writeUrl('profile', character.projectId, character.id)
    }

    function backToProjects() {
        level.value = 'projects'
        selectedProjectId.value = ''
        selectedCharacterId.value = ''
        searchQuery.value = ''
        selectedTags.value = []
        writeUrl('projects', '', '')
    }

    function backToCharacters() {
        level.value = 'characters'
        selectedCharacterId.value = ''
        writeUrl('characters', selectedProjectId.value, '')
    }

    function toggleTag(tag: string) {
        selectedTags.value = selectedTags.value.includes(tag)
            ? selectedTags.value.filter((selected) => selected !== tag)
            : [...selectedTags.value, tag]
    }

    function selectProjectPreview(projectId: string) {
        selectedProjectId.value = projectId
    }

    function startProjectCreation() {
        projectNameDraft.value = ''
        projectDescriptionDraft.value = ''
        formError.value = ''
        dialog.value = 'project'
    }

    function startCharacterEditing(character?: Character) {
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
        dialog.value = null
        openProject(project)
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
                dialog.value = null
                writeUrl('profile', selectedProjectId.value, character.id, true)
            }
        } else {
            const character: Character = {
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
            dialog.value = null
            openCharacter(character)
        }
    }

    function handlePopstate() {
        syncFromUrl()
    }

    onMounted(() => {
        syncFromUrl()
        if (!globalThis.location.search.includes('level=')) writeUrl('projects', '', '', true)
        globalThis.addEventListener('popstate', handlePopstate)
    })
    onUnmounted(() => globalThis.removeEventListener('popstate', handlePopstate))
</script>

<template>
    <main class="workspace-prototype min-h-screen bg-canvas-soft px-4 pb-12 text-ink sm:px-8">
        <header class="-mx-4 bg-secondary px-4 py-4 text-white sm:-mx-8 sm:px-8">
            <div class="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-3">
                <div class="flex items-center gap-4">
                    <div class="grid h-9 w-9 place-items-center rounded-lg bg-white/10 text-sm font-bold text-white">
                        A
                    </div>
                    <div>
                        <p class="text-sm font-semibold tracking-wide text-white">AtlasLoom</p>
                        <p class="mt-0.5 text-xs text-white/65">创作工作区</p>
                    </div>
                </div>
                <span class="text-xs text-white/65">本地资料 · 原型预览</span>
            </div>
        </header>

        <div class="mx-auto max-w-[1280px] py-7 sm:py-9">
            <nav
                aria-label="档案层级"
                class="mb-8 flex flex-wrap items-center gap-2 text-sm"
            >
                <button
                    class="min-h-10 rounded-lg px-3 font-medium"
                    :class="level === 'projects' ? 'bg-white text-primary' : 'text-ink-muted hover:bg-white'"
                    type="button"
                    @click="backToProjects"
                >
                    项目
                </button>
                <span
                    aria-hidden="true"
                    class="text-ink-faint"
                >
                    /
                </span>
                <button
                    v-if="level !== 'projects' && currentProject"
                    class="min-h-10 rounded-lg px-3 font-medium"
                    :class="level === 'characters' ? 'bg-white text-primary' : 'text-ink-muted hover:bg-white'"
                    type="button"
                    :disabled="level === 'characters'"
                    @click="backToCharacters"
                >
                    角色列表
                </button>
                <template v-if="level === 'profile' && currentCharacter">
                    <span
                        aria-hidden="true"
                        class="text-ink-faint"
                    >
                        /
                    </span>
                    <span class="px-3 py-2 font-medium text-ink">{{ currentCharacter.name }}</span>
                </template>
                <span
                    v-if="level === 'projects'"
                    class="px-3 py-2 font-medium text-ink-muted"
                >
                    全部项目
                </span>
            </nav>

            <section
                v-if="level === 'projects'"
                aria-labelledby="project-list-title"
            >
                <div class="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <p class="text-xs font-semibold tracking-wide text-primary">项目 · 第 1 层</p>
                        <h2
                            id="project-list-title"
                            class="mt-1 text-3xl font-semibold tracking-tight"
                        >
                            创作项目
                        </h2>
                    </div>
                    <button
                        class="min-h-10 rounded-md bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-active focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                        type="button"
                        @click="startProjectCreation"
                    >
                        ＋ 新建项目
                    </button>
                </div>

                <div class="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(280px,0.8fr)]">
                    <section
                        class="overflow-hidden rounded-lg border border-hairline bg-white"
                        aria-label="项目列表"
                    >
                        <div class="flex items-center justify-between border-b border-hairline px-4 py-3 sm:px-5">
                            <h3 class="text-sm font-semibold">全部项目</h3>
                            <span class="text-xs text-ink-muted">{{ projects.length }} 个项目</span>
                        </div>
                        <div
                            v-if="projects.length"
                            class="divide-y divide-hairline"
                        >
                            <div
                                v-for="project in projects"
                                :key="project.id"
                                class="flex items-center gap-3 px-3 py-3 sm:px-4"
                            >
                                <button
                                    class="flex min-h-16 min-w-0 flex-1 items-center gap-3 border-l-2 px-2 text-left focus-visible:outline-2 focus-visible:outline-primary"
                                    :class="
                                        project.id === projectPreview?.id
                                            ? 'border-l-primary bg-canvas-soft'
                                            : 'border-l-transparent hover:bg-canvas-soft/70'
                                    "
                                    type="button"
                                    :aria-pressed="project.id === projectPreview?.id"
                                    @click="selectProjectPreview(project.id)"
                                >
                                    <span
                                        class="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-canvas-soft text-sm font-semibold text-ink-secondary"
                                    >
                                        {{ project.name.slice(0, 1) }}
                                    </span>
                                    <span class="min-w-0 flex-1">
                                        <span class="block truncate text-base font-semibold">{{ project.name }}</span>
                                        <span class="mt-1 block truncate text-sm text-ink-muted">
                                            {{ project.description }}
                                        </span>
                                    </span>
                                    <span class="hidden shrink-0 text-xs text-ink-muted sm:block">
                                        {{
                                            characters.filter((character) => character.projectId === project.id).length
                                        }}
                                        位角色
                                    </span>
                                </button>
                                <button
                                    class="min-h-9 shrink-0 rounded-md px-3 text-sm font-semibold text-primary hover:bg-canvas-soft focus-visible:outline-2 focus-visible:outline-primary"
                                    type="button"
                                    :aria-label="`打开项目：${project.name}`"
                                    @click="openProject(project)"
                                >
                                    打开
                                    <span aria-hidden="true">→</span>
                                </button>
                            </div>
                        </div>
                        <div
                            v-else
                            class="px-5 py-10 text-center"
                        >
                            <p class="font-semibold">还没有创作项目</p>
                            <p class="mt-1 text-sm text-ink-muted">创建一个项目，再添加属于它的角色档案。</p>
                        </div>
                    </section>

                    <aside
                        v-if="projectPreview"
                        class="rounded-lg border border-hairline bg-white p-5 sm:p-6"
                        aria-label="选中项目摘要"
                    >
                        <p class="text-xs font-semibold tracking-wide text-ink-muted">当前选中项目</p>
                        <h3 class="mt-2 text-2xl font-semibold tracking-tight">{{ projectPreview.name }}</h3>
                        <p class="mt-2 text-sm leading-6 text-ink-secondary">{{ projectPreview.description }}</p>
                        <div class="mt-5 border-t border-hairline pt-4">
                            <p class="text-xs text-ink-muted">角色档案</p>
                            <p class="mt-1 text-xl font-semibold">
                                {{ characters.filter((character) => character.projectId === projectPreview.id).length }}
                                <span class="text-sm font-normal text-ink-muted">位角色</span>
                            </p>
                        </div>
                        <button
                            class="mt-5 min-h-10 w-full rounded-md bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-active focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                            type="button"
                            @click="openProject(projectPreview)"
                        >
                            打开项目
                        </button>
                    </aside>
                </div>
            </section>

            <section
                v-else-if="level === 'characters' && currentProject"
                aria-labelledby="character-list-title"
            >
                <div class="flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <p class="text-sm text-ink-muted">第 2 层 · {{ currentProject.name }}</p>
                        <h2
                            id="character-list-title"
                            class="mt-1 text-3xl font-semibold tracking-tight"
                        >
                            角色列表
                        </h2>
                        <p class="mt-2 text-sm text-ink-muted">{{ currentProject.description }}</p>
                    </div>
                    <button
                        class="min-h-11 rounded-lg bg-primary px-5 font-semibold text-white hover:bg-primary-active"
                        type="button"
                        @click="startCharacterEditing"
                    >
                        ＋ 新建角色
                    </button>
                </div>
                <div class="mt-6 rounded-xl border border-hairline bg-white p-4 sm:p-5">
                    <label
                        class="flex min-h-11 items-center gap-3 rounded-lg border border-hairline px-3 focus-within:border-primary"
                    >
                        <span
                            aria-hidden="true"
                            class="text-ink-muted"
                        >
                            ⌕
                        </span>
                        <span class="sr-only">搜索姓名、别名或简介</span>
                        <input
                            v-model="searchQuery"
                            class="w-full bg-transparent text-sm outline-none"
                            placeholder="搜索姓名、别名或简介"
                        />
                    </label>
                    <div
                        class="mt-3 flex flex-wrap gap-2"
                        aria-label="按标签筛选"
                    >
                        <button
                            v-for="tag in allTags"
                            :key="tag"
                            class="min-h-9 rounded-full border px-3 text-xs font-medium"
                            :class="
                                selectedTags.includes(tag)
                                    ? 'border-primary bg-primary text-white'
                                    : 'border-hairline bg-white text-ink-secondary hover:border-primary'
                            "
                            type="button"
                            :aria-pressed="selectedTags.includes(tag)"
                            @click="toggleTag(tag)"
                        >
                            {{ tag }}
                        </button>
                    </div>
                </div>
                <div
                    v-if="filteredCharacters.length"
                    class="mt-5 divide-y divide-hairline rounded-xl border border-hairline bg-white px-5"
                >
                    <button
                        v-for="character in filteredCharacters"
                        :key="character.id"
                        class="flex min-h-24 w-full items-center gap-4 py-4 text-left focus-visible:outline-2 focus-visible:outline-primary"
                        type="button"
                        @click="openCharacter(character)"
                    >
                        <span
                            class="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-canvas-soft text-lg font-semibold text-ink-secondary"
                        >
                            {{ character.name.slice(0, 1) }}
                        </span>
                        <span class="min-w-0 flex-1">
                            <span class="block text-lg font-semibold">{{ character.name }}</span>
                            <span class="mt-1 block truncate text-sm text-ink-muted">
                                {{ character.aliases.join(' · ') || character.introduction }}
                            </span>
                            <span class="mt-2 block truncate text-sm text-ink-secondary">
                                {{ character.introduction }}
                            </span>
                        </span>
                        <span class="hidden max-w-48 flex-wrap justify-end gap-1.5 sm:flex">
                            <span
                                v-for="tag in character.tags"
                                :key="tag"
                                class="rounded-full bg-canvas-soft px-2.5 py-1 text-xs text-ink-secondary"
                            >
                                {{ tag }}
                            </span>
                        </span>
                        <span
                            aria-hidden="true"
                            class="text-lg text-ink-faint"
                        >
                            ›
                        </span>
                    </button>
                </div>
                <div
                    v-else
                    class="mt-5 rounded-xl border border-hairline bg-white px-6 py-12 text-center"
                >
                    <p class="font-semibold">没有找到角色</p>
                    <p class="mt-2 text-sm text-ink-muted">调整搜索条件，或为这个项目创建一个新角色。</p>
                    <button
                        class="mt-5 min-h-11 rounded-lg border border-hairline px-4 font-semibold"
                        type="button"
                        @click="startCharacterEditing"
                    >
                        新建角色
                    </button>
                </div>
            </section>

            <article
                v-else-if="level === 'profile' && currentProject && currentCharacter"
                aria-labelledby="profile-title"
            >
                <div class="flex flex-wrap items-start justify-between gap-4 border-b border-hairline pb-6">
                    <div>
                        <p class="text-sm text-ink-muted">第 3 层 · {{ currentProject.name }} / 角色档案</p>
                        <h2
                            id="profile-title"
                            class="mt-2 text-4xl font-semibold tracking-tight"
                        >
                            {{ currentCharacter.name }}
                        </h2>
                        <p class="mt-2 text-sm text-ink-muted">
                            {{ currentCharacter.aliases.join(' · ') || '暂无别名' }}
                        </p>
                    </div>
                    <div class="flex gap-2">
                        <button
                            class="min-h-11 rounded-lg border border-hairline bg-white px-4 font-semibold hover:bg-canvas-soft"
                            type="button"
                            @click="backToCharacters"
                        >
                            返回角色列表
                        </button>
                        <button
                            class="min-h-11 rounded-lg bg-primary px-4 font-semibold text-white hover:bg-primary-active"
                            type="button"
                            @click="startCharacterEditing(currentCharacter)"
                        >
                            编辑档案
                        </button>
                    </div>
                </div>
                <p class="mt-7 max-w-3xl text-lg leading-8 text-ink-secondary">{{ currentCharacter.introduction }}</p>
                <div class="mt-8 grid gap-5 sm:grid-cols-2">
                    <section class="rounded-xl border border-hairline bg-white p-5">
                        <h3 class="text-sm font-semibold text-ink-muted">外貌</h3>
                        <p class="mt-3 leading-7">{{ currentCharacter.appearance }}</p>
                    </section>
                    <section class="rounded-xl border border-hairline bg-white p-5">
                        <h3 class="text-sm font-semibold text-ink-muted">性格</h3>
                        <p class="mt-3 leading-7">{{ currentCharacter.personality }}</p>
                    </section>
                    <section class="rounded-xl border border-hairline bg-white p-5">
                        <h3 class="text-sm font-semibold text-ink-muted">背景故事</h3>
                        <p class="mt-3 leading-7">{{ currentCharacter.backstory }}</p>
                    </section>
                    <section class="rounded-xl border border-hairline bg-white p-5">
                        <h3 class="text-sm font-semibold text-ink-muted">目标 / 动机</h3>
                        <p class="mt-3 leading-7">{{ currentCharacter.motivation }}</p>
                    </section>
                    <section class="rounded-xl border border-hairline bg-white p-5">
                        <h3 class="text-sm font-semibold text-ink-muted">能力</h3>
                        <p class="mt-3 leading-7">{{ currentCharacter.abilities }}</p>
                    </section>
                    <section class="rounded-xl border border-hairline bg-white p-5">
                        <h3 class="text-sm font-semibold text-ink-muted">备注</h3>
                        <p class="mt-3 leading-7">{{ currentCharacter.notes }}</p>
                    </section>
                </div>
                <section class="mt-5 rounded-xl border border-hairline bg-white p-5">
                    <h3 class="text-sm font-semibold text-ink-muted">标签</h3>
                    <div class="mt-3 flex flex-wrap gap-2">
                        <span
                            v-for="tag in currentCharacter.tags"
                            :key="tag"
                            class="rounded-full bg-canvas-soft px-3 py-1.5 text-xs text-ink-secondary"
                        >
                            {{ tag }}
                        </span>
                    </div>
                </section>
            </article>
        </div>

        <div
            v-if="dialog"
            class="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4"
            @click.self="dialog = null"
        >
            <form
                v-if="dialog === 'project'"
                class="w-full max-w-lg rounded-2xl border border-hairline bg-white p-6 shadow-xl sm:p-8"
                aria-labelledby="project-dialog-title"
                @submit.prevent="saveProject"
            >
                <h2
                    id="project-dialog-title"
                    class="text-2xl font-semibold"
                >
                    新建项目
                </h2>
                <label
                    class="mt-6 block text-sm font-medium"
                    for="project-name"
                >
                    项目名称
                </label>
                <input
                    id="project-name"
                    v-model="projectNameDraft"
                    autofocus
                    class="mt-2 min-h-11 w-full rounded-md border border-hairline px-3 focus:border-primary focus:outline-none"
                    placeholder="例如：雾港编年"
                />
                <label
                    class="mt-4 block text-sm font-medium"
                    for="project-description"
                >
                    简介
                </label>
                <textarea
                    id="project-description"
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
                        class="min-h-11 rounded-lg bg-primary px-4 font-semibold text-white"
                        type="submit"
                    >
                        创建项目
                    </button>
                </div>
            </form>
            <form
                v-else
                class="w-full max-w-lg rounded-2xl border border-hairline bg-white p-6 shadow-xl sm:p-8"
                aria-labelledby="character-dialog-title"
                @submit.prevent="saveCharacter"
            >
                <h2
                    id="character-dialog-title"
                    class="text-2xl font-semibold"
                >
                    {{ editingCharacterId ? '编辑角色档案' : `添加到${currentProject?.name}` }}
                </h2>
                <label
                    class="mt-6 block text-sm font-medium"
                    for="character-name"
                >
                    角色姓名
                </label>
                <input
                    id="character-name"
                    v-model="characterNameDraft"
                    autofocus
                    class="mt-2 min-h-11 w-full rounded-md border border-hairline px-3 focus:border-primary focus:outline-none"
                    placeholder="输入角色姓名"
                />
                <label
                    class="mt-4 block text-sm font-medium"
                    for="character-introduction"
                >
                    简介
                </label>
                <textarea
                    id="character-introduction"
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
                        class="min-h-11 rounded-lg bg-primary px-4 font-semibold text-white"
                        type="submit"
                    >
                        {{ editingCharacterId ? '保存修改' : '创建角色' }}
                    </button>
                </div>
            </form>
        </div>
    </main>
</template>

<style scoped>
    .workspace-prototype {
        --prototype-canvas: #f1f2f4;
        --prototype-surface: #ffffff;
        --prototype-primary: #0075de;
        --prototype-primary-active: #005bab;
        --prototype-ink: #000000;
        --prototype-ink-secondary: #31302e;
        --prototype-ink-muted: #615d59;
        --prototype-hairline: #e6e6e6;

        background-color: var(--prototype-canvas);
        color: var(--prototype-ink);
    }

    .workspace-prototype .bg-canvas-soft {
        background-color: var(--prototype-canvas);
    }

    .workspace-prototype .bg-white {
        background-color: var(--prototype-surface);
    }

    .workspace-prototype .bg-primary {
        background-color: var(--prototype-primary);
    }

    .workspace-prototype .bg-primary:hover {
        background-color: var(--prototype-primary-active);
    }

    .workspace-prototype .text-primary {
        color: var(--prototype-primary);
    }

    .workspace-prototype .text-white {
        color: #ffffff;
    }

    .workspace-prototype .text-ink-secondary {
        color: var(--prototype-ink-secondary);
    }

    .workspace-prototype .text-ink-muted {
        color: var(--prototype-ink-muted);
    }

    .workspace-prototype .border-hairline {
        border-color: var(--prototype-hairline);
    }
</style>
