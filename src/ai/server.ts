import fs from 'node:fs/promises'
import path from 'node:path'

import TextFile from '@/api/file/text'
import { builtInSkills } from '@/ai/skills'
import type { BossServerApi, Plugin } from '@/types'
import type { SessionPayload } from '@/tasks/session'

export const name = 'ai'

const STATIC_DOC = `### Syntax
- Use <$$ ...> for Boss props in JSX.
- Use $$.${'$'}({ ... }) to mark prop objects for compile/runtime.
- Classname tokens look like color:red or hover:color:red (mostly 1:1 with CSS props).

### Tokens
- Prefer token keys (color="primary") over $$.token.* when available.
- Token overrides can be passed via the tokens prop at runtime.
- Prefer token shorthands for shadows (boxShadow="md") when available.
- In classname-first, dynamic tokens should return $$.token.* from the function.

### Selectors
- Use pseudos for state (hover, focus, etc.).
- Use @at for breakpoints and media queries.
- Use child for nested selectors.
- Prefer shorthand keys (mobile:...) over at:mobile:...
- Prefer the device breakpoint for mobile + small screens when available.

### Values
- Prefer unitless numbers (padding:12) and use _ for space-separated values (padding:10_20).
- Avoid hardcoded default unit suffixes in class tokens (border:1_solid, not border:1px_solid).
- Prefer arrays for shorthands (padding={[0, 10]}).
- For custom shadows, use arrays (boxShadow={[1, 1, 0, '#fff']}).

### Globals
- Use $$.css() for global CSS and arbitrary selectors (body, [data-*], etc.).

### Bosswind
- When Bosswind is enabled, prefer shorthands (flex vs display:flex).

### Strategies
- inline-first: default for mixed static/dynamic props.
- classname-first: smaller inline styles; use function values for dynamics.
- runtime-only: client CSS injection only.
 - compile pruning: keep props static when you want runtime-free output.
 - runtime.globals: inline | file | none (reset/fontsource/token/$$.css output).
`

const EVENT_NAMES = [
    'onBoot',
    'onReady',
    'onParse',
    'onPropTree',
    'onProp',
    'onCompileProp',
    'onInit',
    'onBrowserObjectStart',
    'onSession',
    'onMetaData',
] as const

type SectionId = string

type SectionMap = Record<SectionId, string>

type AiSectionEntry = {
    section: SectionId
    content: string
    title?: string
    order?: number
}

type SkillMeta = {
    name: string
    description: string
    body: string
    compatibility?: string
    license?: string
    allowedTools?: string
    metadata?: Record<string, string>
    source?: string
}

type AiConfig = {
    llms?: {
        enabled?: boolean
        path?: string
    }
    skills?: {
        enabled?: boolean
        outputDir?: string
        includeBuiltins?: boolean
    }
}

const metaStore = new Map<string, AiSectionEntry[]>()
let metaStoreApi: BossServerApi | null = null
let llmsFile: TextFile | null = null
let llmsFilePath: string | null = null

const getAiConfig = (api: BossServerApi): AiConfig => {
    const config = (api.ai ?? api.userConfig?.ai ?? {}) as AiConfig
    return config
}

const getBaseDir = (api: BossServerApi, session?: SessionPayload | null) => {
    if (session?.baseDir) return session.baseDir
    if (typeof api.baseDir === 'string') return api.baseDir
    return process.cwd()
}

const formatLines = (lines: string[]) => {
    const filtered = lines.filter(Boolean)
    if (!filtered.length) return '- (none)'
    return filtered.map(line => `- ${line}`).join('\n')
}

const renderSection = (title: string, body: string) => {
    const trimmed = body.trim()
    if (!trimmed) return `## ${title}\n\n- (none)`
    return `## ${title}\n\n${trimmed}`
}

const renderSectionBlock = (id: SectionId, body: string) => {
    return `<!-- boss:ai:${id}:start -->\n${body.trim()}\n<!-- boss:ai:${id}:end -->`
}

const updateSectionBlocks = (input: string, sections: SectionMap) => {
    let text = input
    const hasAnyMarkers = /<!-- boss:ai:/.test(text)

    if (!hasAnyMarkers) {
        text = text.trim()
        if (!text.length) {
            text = '# Boss CSS AI\n'
        } else {
            text += '\n\n'
        }
    }

    for (const [id, body] of Object.entries(sections) as Array<[SectionId, string]>) {
        const block = renderSectionBlock(id, body)
        const pattern = new RegExp(`<!-- boss:ai:${id}:start -->[\\s\\S]*?<!-- boss:ai:${id}:end -->`)
        if (pattern.test(text)) {
            text = text.replace(pattern, block)
        } else {
            text += `\n\n${block}`
        }
    }

    return text.trim() + '\n'
}

const readFileSafe = async (filePath: string) => {
    try {
        return await fs.readFile(filePath, 'utf8')
    } catch {
        return ''
    }
}

const writeFileIfChanged = async (filePath: string, content: string) => {
    const existing = await readFileSafe(filePath)
    if (existing === content) return
    await fs.mkdir(path.dirname(filePath), { recursive: true })
    await fs.writeFile(filePath, content, 'utf8')
}

const isValidSkillName = (value: string) =>
    /^[\p{Ll}\p{Nd}]+(?:-[\p{Ll}\p{Nd}]+)*$/u.test(value) && value.length <= 64

const yamlValue = (value: string) => JSON.stringify(value)

const unquoteYamlValue = (value: string) => {
    const trimmed = value.trim()
    if (
        (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
        (trimmed.startsWith("'") && trimmed.endsWith("'"))
    ) {
        return trimmed.slice(1, -1)
    }
    return trimmed
}

const renderSkill = (skill: SkillMeta) => {
    const lines = ['---', `name: ${skill.name}`, `description: ${yamlValue(skill.description)}`]
    if (skill.license) {
        lines.push(`license: ${yamlValue(skill.license)}`)
    }
    if (skill.compatibility) {
        lines.push(`compatibility: ${yamlValue(skill.compatibility)}`)
    }
    if (skill.allowedTools) {
        lines.push(`allowed-tools: ${yamlValue(skill.allowedTools)}`)
    }
    if (skill.metadata && Object.keys(skill.metadata).length) {
        lines.push('metadata:')
        for (const [key, value] of Object.entries(skill.metadata)) {
            lines.push(`  ${key}: ${yamlValue(value)}`)
        }
    }
    lines.push('---', skill.body.trim(), '')
    return lines.join('\n')
}

const resolvePackageVersion = async (baseDir: string) => {
    try {
        const pkgPath = path.join(baseDir, 'package.json')
        const raw = await fs.readFile(pkgPath, 'utf8')
        const parsed = JSON.parse(raw) as { version?: unknown }
        return typeof parsed.version === 'string' ? parsed.version : null
    } catch {
        return null
    }
}

const parseSkillSummary = (content: string) => {
    const match = content.match(/^---\n([\s\S]*?)\n---\n?/)
    if (!match) return null
    const lines = match[1].split('\n')
    let name = ''
    let description = ''
    for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith('#')) continue
        if (trimmed.startsWith('name:')) {
            name = unquoteYamlValue(trimmed.slice('name:'.length).trim())
        }
        if (trimmed.startsWith('description:')) {
            description = unquoteYamlValue(trimmed.slice('description:'.length).trim())
        }
    }
    if (!name || !description) return null
    return { name, description }
}

const fileExists = async (filePath: string) => {
    try {
        await fs.access(filePath)
        return true
    } catch {
        return false
    }
}

const loadCustomSkills = async (
    outputPath: string,
    baseDir: string,
    existingNames: Set<string>,
    log: BossServerApi['log'],
) => {
    const entries = await fs.readdir(outputPath, { withFileTypes: true })
    const results: Array<{ name: string; description: string; path: string; source: string }> = []
    for (const entry of entries) {
        if (!entry.isDirectory()) continue
        const skillFile = path.join(outputPath, entry.name, 'SKILL.md')
        if (!(await fileExists(skillFile))) continue
        const content = await readFileSafe(skillFile)
        const summary = parseSkillSummary(content)
        if (!summary) {
            log.child('ai').log(`Skipping custom skill without valid frontmatter: ${skillFile}`)
            continue
        }
        if (!isValidSkillName(summary.name)) {
            log.child('ai').log(`Invalid skill name "${summary.name}" in ${skillFile}`)
            continue
        }
        if (existingNames.has(summary.name)) {
            continue
        }
        results.push({
            name: summary.name,
            description: summary.description,
            path: path.relative(baseDir, skillFile),
            source: 'custom',
        })
    }
    results.sort((a, b) => a.name.localeCompare(b.name))
    return results
}

const buildSections = (api: BossServerApi, session?: SessionPayload | null) => {
    const config = getAiConfig(api)
    const baseDir = getBaseDir(api, session)
    const defaultLlmsPath = path.join(api.folder ?? api.configDir ?? '.bo$$', 'LLMS.md')
    const llmsPath = config.llms?.path ?? defaultLlmsPath
    const llmsFullPath = path.isAbsolute(llmsPath) ? llmsPath : path.join(baseDir, llmsPath)

    const pluginNames = api.plugins.map(plugin => plugin.name ?? 'unknown')
    const pluginLines = api.plugins.map(plugin => {
        const hooks = EVENT_NAMES.filter(eventName => Boolean((plugin as Record<string, unknown>)[eventName]))
        return `${plugin.name ?? 'unknown'} (${hooks.join(', ') || 'no hooks'})`
    })

    const summaryBody = formatLines([
        `Generated: ${new Date().toISOString()}`,
        `Base dir: ${baseDir}`,
        `Config path: ${session?.configPath ?? '(unknown)'}`,
        `LLMS path: ${llmsFullPath}`,
        `Runtime strategy: ${api.strategy ?? '(default)'}`,
        `Plugins: ${pluginNames.join(', ')}`,
    ])

    const configBody = formatLines([
        `content: ${Array.isArray(api.content) ? api.content.join(', ') : api.content ?? '(none)'}`,
        `selectorPrefix: ${api.selectorPrefix ?? '(none)'}`,
        `selectorScope: ${api.selectorScope ?? '(none)'}`,
        `unit: ${api.unit ?? 'px'}`,
        `runtime.only: ${api.runtime?.only === true ? 'true' : 'false'}`,
        `runtime.strategy: ${api.runtime?.strategy ?? '(default)'}`,
    ])

    const outputsBody = formatLines([
        `runtime: ${path.join(api.folder ?? api.configDir ?? '.bo$$', 'index.js')}`,
        `types: ${path.join(api.folder ?? api.configDir ?? '.bo$$', 'index.d.ts')}`,
        api.file.native?.hasContent ? `native runtime: ${path.join(api.folder ?? api.configDir ?? '.bo$$', 'native.js')}` : '',
        api.file.native?.hasContent ? `native types: ${path.join(api.folder ?? api.configDir ?? '.bo$$', 'native.d.ts')}` : '',
        `styles: ${api.stylesheetPath ?? path.join(api.configDir ?? '.bo$$', 'styles.css')}`,
    ])

    const customPropLines: string[] = []
    const seenDescriptors = new Set<unknown>()
    for (const descriptor of api.dictionary.values()) {
        if (!descriptor || descriptor.isCSSProp !== false) continue
        if (seenDescriptors.has(descriptor)) continue
        seenDescriptors.add(descriptor)
        const alias = descriptor.aliases?.[0] ?? descriptor.property
        if (!alias) continue
        const description = descriptor.description ?? descriptor.usage ?? ''
        customPropLines.push(description ? `${alias} — ${description}` : alias)
    }

    const customPropsBody = formatLines(customPropLines.sort((a, b) => a.localeCompare(b)))

    const frameworkName =
        typeof api.framework === 'string'
            ? api.framework
            : typeof api.framework === 'object'
              ? api.framework.name ?? 'unknown'
              : 'unknown'

    const frameworkBody = formatLines([
        `framework: ${frameworkName}`,
        typeof api.framework === 'object' && api.framework?.className ? `className: ${api.framework.className}` : '',
        typeof api.framework === 'object' && api.framework?.fileType ? `fileType: ${api.framework.fileType}` : '',
    ])

    const compileBody = formatLines([
        `compile.enabled: ${api.compile ? 'true' : 'false'}`,
        api.compile?.spread ? `compile.spread: true` : '',
        api.compile?.stats ? `compile.stats: ${api.compile.stats}` : '',
    ])

    const sections: SectionMap = {
        static: renderSection('Boss CSS usage', STATIC_DOC),
        summary: renderSection('Summary', summaryBody),
        config: renderSection('Config', configBody),
        plugins: renderSection('Plugins', formatLines(pluginLines)),
        outputs: renderSection('Outputs', outputsBody),
        framework: renderSection('Framework', frameworkBody),
        props: renderSection('Custom props', customPropsBody),
        compile: renderSection('Compile', compileBody),
    }

    const defaultTitles: Record<string, string> = {
        tokens: 'Tokens',
        props: 'Props',
        prepared: 'Prepared components',
        pseudos: 'Pseudos',
        at: 'At (breakpoints and media)',
        bosswind: 'Bosswind',
        boundaries: 'CSS boundaries',
        'dev-server': 'Dev server',
    }

    const metaOrder = ['tokens', 'props', 'prepared', 'pseudos', 'at', 'bosswind', 'boundaries', 'dev-server']
    const orderedSections = [
        ...metaOrder.filter(section => metaStore.has(section)),
        ...Array.from(metaStore.keys()).filter(section => !metaOrder.includes(section)).sort((a, b) => a.localeCompare(b)),
    ]

    for (const section of orderedSections) {
        const entries = metaStore.get(section)
        if (!entries || entries.length === 0) continue
        const sorted = [...entries].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        const title = sorted.find(entry => entry.title)?.title ?? defaultTitles[section] ?? section
        const content = sorted.map(entry => entry.content.trim()).filter(Boolean).join('\n\n')
        if (!content) continue
        sections[section] = renderSection(title, content)
    }

    return { sections, llmsFullPath }
}

const getLlmsFile = (api: BossServerApi, filePath: string) => {
    if (!llmsFile || llmsFilePath !== filePath) {
        llmsFile = new TextFile(api, { path: filePath })
        llmsFilePath = filePath
    }
    return llmsFile
}

const writeLlms = async (api: BossServerApi, session?: SessionPayload | null) => {
    const config = getAiConfig(api)
    if (config.llms?.enabled === false) return
    const { sections, llmsFullPath } = buildSections(api, session)
    const existing = await readFileSafe(llmsFullPath)
    const updated = updateSectionBlocks(existing, sections)

    const baseDir = getBaseDir(api, session)
    const folder = api.folder ?? '.bo$$'
    const folderPath = path.isAbsolute(folder) ? folder : path.join(baseDir, folder)
    const relativePath = path.relative(folderPath, llmsFullPath)
    const isInsideFolder = relativePath && !relativePath.startsWith('..') && !path.isAbsolute(relativePath)

    if (isInsideFolder) {
        const file = getLlmsFile(api, relativePath)
        file.set('body', 'llms', updated)
        await file.write()
        return
    }

    await writeFileIfChanged(llmsFullPath, updated)
}


const writeSkills = async (api: BossServerApi, session?: SessionPayload | null) => {
    const config = getAiConfig(api)
    if (config.skills?.enabled === false) return
    const baseDir = getBaseDir(api, session)
    const outputDir = config.skills?.outputDir ?? path.join(api.folder ?? api.configDir ?? '.bo$$', 'skills')
    const outputPath = path.isAbsolute(outputDir) ? outputDir : path.join(baseDir, outputDir)
    const includeBuiltins = config.skills?.includeBuiltins !== false

    await fs.mkdir(outputPath, { recursive: true })

    const skills: SkillMeta[] = []
    const packageVersion = await resolvePackageVersion(baseDir)
    if (includeBuiltins) {
        skills.push(
            ...builtInSkills.map(skill => ({
                name: skill.name,
                description: skill.description,
                body: skill.body,
                compatibility: skill.compatibility,
                license: skill.license,
                metadata: packageVersion
                    ? { ...(skill.metadata ?? {}), version: packageVersion }
                    : skill.metadata,
                allowedTools: skill.allowedTools,
                source: 'builtin',
            })),
        )
    }

    const indexEntries: Array<{ name: string; description: string; path: string; source?: string }> = []
    const builtinNames = new Set(skills.map(skill => skill.name))

    for (const skill of skills) {
        if (!isValidSkillName(skill.name)) {
            api.log.child('ai').log(`Invalid skill name "${skill.name}"`)
            continue
        }
        const skillDir = path.join(outputPath, skill.name)
        const filePath = path.join(skillDir, 'SKILL.md')
        await fs.mkdir(skillDir, { recursive: true })
        const output = renderSkill(skill)
        await writeFileIfChanged(filePath, output)
        indexEntries.push({
            name: skill.name,
            description: skill.description,
            path: path.relative(baseDir, filePath),
            source: skill.source,
        })
    }

    const customEntries = await loadCustomSkills(outputPath, baseDir, builtinNames, api.log)
    indexEntries.push(...customEntries)

    const indexPath = path.join(outputPath, 'index.json')
    await writeFileIfChanged(indexPath, JSON.stringify(indexEntries, null, 2) + '\n')
}

export const onBoot: Plugin<'onBoot'> = async api => {
    if (metaStoreApi !== api) {
        metaStore.clear()
        metaStoreApi = api ?? null
    }
    llmsFile = null
    llmsFilePath = null
}

export const onMetaData: Plugin<'onMetaData'> = async (_api, payload) => {
    if (!payload || payload.kind !== 'ai') return
    if (_api && metaStoreApi !== _api) {
        metaStore.clear()
        metaStoreApi = _api
    }
    const type = typeof payload.type === 'string' ? payload.type : ''
    const data = payload.data as Partial<AiSectionEntry> | string | undefined
    const shouldReplace =
        payload.replace === true ||
        (data && typeof data === 'object' && (data as { replace?: unknown }).replace === true)
    let entry: AiSectionEntry | null = null

    if (type === 'skill') {
        const content =
            typeof data === 'string'
                ? data
                : data && typeof (data as { content?: unknown }).content === 'string'
                  ? String((data as { content?: string }).content)
                  : data && typeof (data as { body?: unknown }).body === 'string'
                    ? String((data as { body?: string }).body)
                    : ''
        if (content) {
            const title =
                data && typeof (data as { title?: unknown }).title === 'string'
                    ? String((data as { title?: string }).title)
                    : typeof payload.label === 'string'
                      ? payload.label
                      : 'Skills'
            entry = {
                section: 'skills',
                title,
                content,
                order: typeof (data as { order?: unknown })?.order === 'number' ? Number((data as { order?: number }).order) : undefined,
            }
        }
    } else if (data && typeof data === 'object') {
        const section = (data as { section?: unknown }).section
        const content = (data as { content?: unknown }).content
        if (typeof section === 'string' && typeof content === 'string') {
            entry = {
                section,
                content,
                title: typeof (data as { title?: unknown }).title === 'string' ? String((data as { title?: string }).title) : undefined,
                order: typeof (data as { order?: unknown }).order === 'number' ? Number((data as { order?: number }).order) : undefined,
            }
        }
    }

    if (!entry) return
    if (!/^[a-zA-Z0-9._-]+$/.test(entry.section)) return
    if (shouldReplace) {
        metaStore.set(entry.section, [entry])
        return
    }
    const list = metaStore.get(entry.section) ?? []
    list.push(entry)
    metaStore.set(entry.section, list)
}

export const onSession: Plugin<'onSession'> = async (api, session) => {
    if (!session) return
    if (session.phase !== 'run' && session.phase !== 'stop') return
    await writeLlms(api, session)
    await writeSkills(api, session)
}
