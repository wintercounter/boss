import fs from 'node:fs/promises'
import path from 'node:path'

import { confirm, log, multiselect, select, text } from '@clack/prompts'
import pluvo, { DEFAULT_COMMENT_STYLES } from 'pluvo'

import { createApi } from '@/api/server'
import { cancelIf } from '@/cli/utils'
import * as bosswindPlugin from '@/prop/bosswind/server'
import * as atPlugin from '@/prop/at/server'
import * as childPlugin from '@/prop/child/server'
import * as cssPlugin from '@/prop/css/server'
import * as pseudoPlugin from '@/prop/pseudo/server'
import * as classnamePlugin from '@/parser/classname/server'
import * as jsxPlugin from '@/parser/jsx/server'
import * as inlineFirstPlugin from '@/strategy/inline-first/server'
import * as classnameFirstPlugin from '@/strategy/classname-first/server'
import * as classnameOnlyPlugin from '@/strategy/classname-only/server'
import * as runtimePlugin from '@/strategy/runtime/server'
import * as tokenPlugin from '@/use/token/server'
import * as resetPlugin from '@/reset/server'
import * as fontsourcePlugin from '@/fontsource/server'
import * as devtoolsPlugin from '@/dev/plugin/server'
import * as aiPlugin from '@/ai/server'
import { detectFramework } from '@/detect-fw'
import { parseJson } from '@/shared/json'
import { configTemplate, jsconfigTemplate, packageTemplate, postcssTemplate } from '@/cli/templates/init'

import { PackageManagerType, RuntimeType, type ParsedArgs, type TaskFn, type Tasks } from '@/cli/types'

type PostcssMode = 'auto' | 'manual' | 'skip'

type InitFlags = {
    yes: boolean
    srcRoot?: string
    configDir?: string
    plugins?: string[]
    strategy?: string
    postcss?: PostcssMode
    globals?: boolean
    eslintPlugin?: boolean
    overwrite?: boolean
}

type PostcssDetection = {
    hasDependency: boolean
    hasConfigFile: boolean
    hasPackageConfig: boolean
    configFilePath?: string
}

type EslintConfigType = 'flat' | 'eslintrc' | 'eslintrc-js' | 'yaml' | 'package' | 'unknown'

type EslintDetection = {
    hasDependency: boolean
    hasConfig: boolean
    configFilePath?: string
    configType?: EslintConfigType
    configFormat?: 'esm' | 'cjs'
}

type PackageJson = {
    dependencies?: Record<string, string>
    devDependencies?: Record<string, string>
    postcss?: Record<string, unknown>
    eslintConfig?: Record<string, unknown>
    bo$$?: Record<string, unknown>
    type?: string
    [key: string]: unknown
}

type PluginOption = {
    id: string
    label: string
    importName: string
    importPath: string
    defaultEnabled: boolean
}

const EXTENSIONS = 'html,js,jsx,mjs,cjs,ts,tsx,mdx,md'
const INIT_COMMENT_STYLES = {
    line: DEFAULT_COMMENT_STYLES.line.filter(marker => !('value' in marker) || marker.value !== "'"),
    block: DEFAULT_COMMENT_STYLES.block,
}

const AVAILABLE_PLUGINS: PluginOption[] = [
    {
        id: 'fontsource',
        label: 'Fontsource fonts',
        importName: 'fontsource',
        importPath: 'boss-css/fontsource/server',
        defaultEnabled: true,
    },
    {
        id: 'reset',
        label: 'Reset CSS',
        importName: 'reset',
        importPath: 'boss-css/reset/server',
        defaultEnabled: true,
    },
    {
        id: 'bosswind',
        label: 'Bosswind (Tailwind-style aliases)',
        importName: 'bosswind',
        importPath: 'boss-css/prop/bosswind/server',
        defaultEnabled: false,
    },
    {
        id: 'token',
        label: 'Tokens',
        importName: 'token',
        importPath: 'boss-css/use/token/server',
        defaultEnabled: true,
    },
    {
        id: 'at',
        label: 'Media queries (@at)',
        importName: 'at',
        importPath: 'boss-css/prop/at/server',
        defaultEnabled: true,
    },
    {
        id: 'child',
        label: 'Child selectors',
        importName: 'child',
        importPath: 'boss-css/prop/child/server',
        defaultEnabled: true,
    },
    {
        id: 'css',
        label: 'CSS props',
        importName: 'css',
        importPath: 'boss-css/prop/css/server',
        defaultEnabled: true,
    },
    {
        id: 'pseudo',
        label: 'Pseudo selectors',
        importName: 'pseudo',
        importPath: 'boss-css/prop/pseudo/server',
        defaultEnabled: true,
    },
    {
        id: 'classname',
        label: 'Classname parser',
        importName: 'classname',
        importPath: 'boss-css/parser/classname/server',
        defaultEnabled: true,
    },
    {
        id: 'jsx',
        label: 'JSX parser',
        importName: 'jsx',
        importPath: 'boss-css/parser/jsx/server',
        defaultEnabled: true,
    },
    {
        id: 'devtools',
        label: 'Devtools (experimental)',
        importName: 'devtools',
        importPath: 'boss-css/dev/plugin/server',
        defaultEnabled: false,
    },
    {
        id: 'ai',
        label: 'AI helpers (LLMS + skills)',
        importName: 'ai',
        importPath: 'boss-css/ai/server',
        defaultEnabled: true,
    },
]

const AVAILABLE_STRATEGIES: PluginOption[] = [
    {
        id: 'inline-first',
        label: 'Inline-first strategy',
        importName: 'inlineFirst',
        importPath: 'boss-css/strategy/inline-first/server',
        defaultEnabled: true,
    },
    {
        id: 'classname-first',
        label: 'Classname-first strategy',
        importName: 'classnameFirst',
        importPath: 'boss-css/strategy/classname-first/server',
        defaultEnabled: false,
    },
    {
        id: 'classname-only',
        label: 'Classname-only strategy (no runtime)',
        importName: 'classnameOnly',
        importPath: 'boss-css/strategy/classname-only/server',
        defaultEnabled: false,
    },
    {
        id: 'runtime-only',
        label: 'Runtime-only strategy (client CSS only)',
        importName: 'runtime',
        importPath: 'boss-css/strategy/runtime/server',
        defaultEnabled: false,
    },
    {
        id: 'runtime-hybrid',
        label: 'Runtime hybrid strategy (server + client)',
        importName: 'runtime',
        importPath: 'boss-css/strategy/runtime/server',
        defaultEnabled: false,
    },
]

const PLUGIN_MODULES: Record<string, unknown> = {
    bosswind: bosswindPlugin,
    reset: resetPlugin,
    fontsource: fontsourcePlugin,
    token: tokenPlugin,
    at: atPlugin,
    child: childPlugin,
    css: cssPlugin,
    pseudo: pseudoPlugin,
    classname: classnamePlugin,
    jsx: jsxPlugin,
    'inline-first': inlineFirstPlugin,
    'classname-first': classnameFirstPlugin,
    'classname-only': classnameOnlyPlugin,
    'runtime-only': runtimePlugin,
    'runtime-hybrid': runtimePlugin,
    devtools: devtoolsPlugin,
    ai: aiPlugin,
}

const DEFAULT_PLUGIN_IDS = AVAILABLE_PLUGINS.filter(plugin => plugin.defaultEnabled).map(plugin => plugin.id)
const DEFAULT_STRATEGY_ID = AVAILABLE_STRATEGIES.find(strategy => strategy.defaultEnabled)?.id ?? 'inline-first'
const STRATEGY_IDS = new Set(AVAILABLE_STRATEGIES.map(strategy => strategy.id))
const STRATEGY_ALIASES = new Map([
    ['runtime', 'runtime-only'],
    ['hybrid', 'runtime-hybrid'],
    ['runtime-hybrid', 'runtime-hybrid'],
    ['runtime-only', 'runtime-only'],
])

const POSTCSS_CONFIG_FILES = [
    'postcss.config.js',
    'postcss.config.cjs',
    'postcss.config.mjs',
    '.postcssrc',
    '.postcssrc.json',
    '.postcssrc.js',
    '.postcssrc.cjs',
    '.postcssrc.mjs',
]

const ESLINT_CONFIG_FILES: Array<{ file: string; type: EslintConfigType }> = [
    { file: 'eslint.config.js', type: 'flat' },
    { file: 'eslint.config.cjs', type: 'flat' },
    { file: 'eslint.config.mjs', type: 'flat' },
    { file: '.eslintrc', type: 'eslintrc' },
    { file: '.eslintrc.json', type: 'eslintrc' },
    { file: '.eslintrc.js', type: 'eslintrc-js' },
    { file: '.eslintrc.cjs', type: 'eslintrc-js' },
    { file: '.eslintrc.mjs', type: 'eslintrc-js' },
    { file: '.eslintrc.yaml', type: 'yaml' },
    { file: '.eslintrc.yml', type: 'yaml' },
]

const init: TaskFn = async config => {
    return [
        {
            prompt: async () => {
                log.info('boss init will scaffold configuration for this project.')

                const cwd = process.cwd()
                const { data: packageJson, indent, newline } = await readPackageJson(cwd)
                if (!packageJson) {
                    log.error('No package.json found. Run boss init from a project root.')
                    return false
                }

                const flags = parseFlags(config.argv)
                const isNext = hasDependency(packageJson, 'next')
                const framework = await detectFramework({ cwd, packageJson })
                const isStencil = framework.id === 'stencil'
                const cssAutoLoad = !isStencil && !isNext

                const detectedSrcRoot = await detectSrcRoot(cwd, isNext)
                const srcRoot = await resolveTextValue({
                    label: 'Where is your source root?',
                    value: flags.srcRoot,
                    fallback: detectedSrcRoot,
                    yes: flags.yes,
                })

                const normalizedSrcRoot = normalizeRelativePath(srcRoot, cwd)
                const defaultConfigFolder = '.bo$$'
                const defaultConfigDir = normalizeRelativePath(
                    path.join(normalizedSrcRoot, defaultConfigFolder),
                    cwd,
                )
                const configDir = await resolveTextValue({
                    label: `Where should the ${defaultConfigFolder} folder live?`,
                    value: flags.configDir,
                    fallback: defaultConfigDir,
                    yes: flags.yes,
                })

                const normalizedConfigDir = normalizeRelativePath(configDir, cwd)
                const configFolder = formatConfigFolder(normalizedConfigDir)

                const selectedStrategyId = await resolveStrategySelection({
                    value: flags.strategy,
                    plugins: flags.plugins,
                    yes: flags.yes,
                })

                const selectedPluginIds = await resolvePluginSelection({
                    value: flags.plugins,
                    yes: flags.yes,
                    frameworkId: framework.id,
                    selectedStrategyId,
                })

                const postcssDetection = await detectPostcss(cwd, packageJson)
                const postcssMode = isStencil
                    ? 'skip'
                    : await resolvePostcssMode({
                          detection: postcssDetection,
                          yes: flags.yes,
                          value: flags.postcss,
                      })

                const globalsEnabled =
                    selectedStrategyId === 'classname-only'
                        ? false
                        : await resolveGlobalsEnabled({
                              value: flags.globals,
                              yes: flags.yes,
                          })

                const eslintDetection = await detectEslint(cwd, packageJson)
                const shouldConfigureEslint =
                    eslintDetection.hasDependency || eslintDetection.hasConfig || flags.eslintPlugin === true
                const useEslintPlugin = await resolveEslintPlugin({
                    value: flags.eslintPlugin,
                    yes: flags.yes,
                    enabled: shouldConfigureEslint,
                })

                const outputDir = path.resolve(cwd, normalizedConfigDir)

                const overwriteMode = await confirmOverwriteIfExists(outputDir, flags.yes, flags.overwrite)

                const contentGlobs = buildContentGlobs({
                    srcRoot: normalizedSrcRoot,
                    isNext,
                })

                const pluginState = buildPluginState({
                    selectedPluginIds,
                    selectedStrategyId,
                })

                const bossCssVersion = await resolveBossCssVersion()
                const packageUpdate = updatePackageJson(packageJson, {
                    configDir: normalizedConfigDir,
                    srcRoot: normalizedSrcRoot,
                    addBossCss: true,
                    bossCssVersion,
                    addPostcss: postcssMode === 'auto' && !postcssDetection.hasDependency,
                    includePostcssPlugin:
                        postcssMode === 'auto' &&
                        (postcssDetection.hasPackageConfig || !postcssDetection.hasConfigFile),
                    addEslintPlugin: useEslintPlugin === true,
                })

                let packageData = packageUpdate.data
                let eslintUpdated = false
                let packageJsonChanged = packageUpdate.changed
                if (shouldConfigureEslint && (globalsEnabled || useEslintPlugin !== undefined)) {
                    const eslintUpdate = await configureEslint({
                        detection: eslintDetection,
                        globalsEnabled,
                        useEslintPlugin: useEslintPlugin === true,
                        allowReactGlobalsRule: shouldAllowReactGlobalsRule(packageData),
                        packageJson: packageData,
                    })
                    eslintUpdated = eslintUpdate.updated
                    if (eslintUpdate.packageJsonChanged) {
                        packageData = eslintUpdate.packageJson
                        packageJsonChanged = true
                    }
                }

                if (packageJsonChanged) {
                    await writePackageJson(cwd, packageData, indent, newline)
                }

                await writeInitFiles({
                    outputDir,
                    configFolder,
                    contentGlobs,
                    pluginState,
                    selectedStrategyId,
                    isNext,
                    postcssMode,
                    postcssDetection,
                    includeAutoprefixer: hasDependency(packageJson, 'autoprefixer'),
                    packageJson: packageData,
                    dirDependencies: true,
                    usePostcssOptions: false,
                    srcRoot: normalizedSrcRoot,
                    configDir: normalizedConfigDir,
                    globalsEnabled,
                    cssAutoLoad,
                    overwriteConfigDir: overwriteMode === 'overwrite',
                })

                await generateRuntime({
                    outputDir,
                    configFolder,
                    pluginState,
                    contentGlobs,
                    globalsEnabled,
                    cssAutoLoad,
                    selectedStrategyId,
                    overwriteConfigDir: overwriteMode === 'overwrite',
                })

                if (isStencil) {
                    await ensureStencilSetup({
                        cwd,
                        srcRoot: normalizedSrcRoot,
                        configDir: normalizedConfigDir,
                        packageJson: packageData,
                    })
                }

                const packageManager = await detectPackageManager(cwd, config.runtimeType)
                const installCommand = packageUpdate.bossCssAdded
                    ? formatInstallCommand(packageManager)
                    : null

                logInitSummary({
                    configDir: normalizedConfigDir,
                    isNext,
                    postcssMode,
                    postcssDetection,
                    configFolder,
                    srcRoot: normalizedSrcRoot,
                    globalsEnabled,
                    eslintUpdated,
                    useEslintPlugin: useEslintPlugin === true,
                    frameworkId: framework.id,
                    selectedStrategyId,
                    cssAutoLoad,
                    installCommand,
                })

                return true
            },
        },
    ] as Tasks
}

const resolveTextValue = async ({
    label,
    value,
    fallback,
    yes,
}: {
    label: string
    value?: string
    fallback: string
    yes: boolean
}) => {
    if (value) return value
    if (yes) return fallback
    const response = await text({
        message: label,
        initialValue: fallback,
        validate: input => (input?.trim() ? undefined : 'Value is required'),
    })
    cancelIf(response)
    return response as string
}

const resolveStrategySelection = async ({
    value,
    plugins,
    yes,
}: {
    value?: string
    plugins?: string[]
    yes: boolean
}): Promise<string> => {
    const normalizedValue = value ? normalizeStrategyId(value) : undefined
    if (normalizedValue) {
        if (STRATEGY_IDS.has(normalizedValue)) return normalizedValue
        log.warn(`Unknown strategy "${value}". Falling back to the default strategy.`)
    }

    const pluginStrategies = (plugins ?? [])
        .map(normalizeStrategyId)
        .filter(id => STRATEGY_IDS.has(id))
    if (pluginStrategies.length > 1) {
        log.warn(`Multiple strategies provided (${pluginStrategies.join(', ')}). Using "${pluginStrategies[0]}".`)
        return pluginStrategies[0]
    }
    if (pluginStrategies.length === 1) {
        return pluginStrategies[0]
    }

    if (yes) return DEFAULT_STRATEGY_ID

    const selection = await select({
        message: 'Select output strategy.',
        options: AVAILABLE_STRATEGIES.map(strategy => ({
            value: strategy.id,
            label: strategy.label,
        })),
        initialValue: DEFAULT_STRATEGY_ID,
    })
    cancelIf(selection)
    return selection as string
}

const resolvePluginSelection = async ({
    value,
    yes,
    frameworkId,
    selectedStrategyId,
}: {
    value?: string[]
    yes: boolean
    frameworkId?: string
    selectedStrategyId: string
}): Promise<string[]> => {
    const isClassnameOnly = selectedStrategyId === 'classname-only'
    const disallowedPlugins = isClassnameOnly ? new Set(['jsx', 'devtools']) : null
    const defaults = isClassnameOnly
        ? DEFAULT_PLUGIN_IDS.filter(id => !(disallowedPlugins && disallowedPlugins.has(id)))
        : DEFAULT_PLUGIN_IDS

    if (value?.length) {
        const normalized = value.map(normalizePluginId)
        const filtered = normalized.filter(id => !STRATEGY_IDS.has(id))
        if (filtered.length !== normalized.length) {
            log.info('Strategies are selected separately. Use --strategy to choose the output strategy.')
        }
        const selected = filtered.filter(id => AVAILABLE_PLUGINS.some(plugin => plugin.id === id))
        const allowed = disallowedPlugins ? selected.filter(id => !disallowedPlugins.has(id)) : selected
        if (selected.length && disallowedPlugins && allowed.length !== selected.length) {
            log.warn('Classname-only strategy ignores jsx and devtools plugins.')
        }
        if (!allowed.length) {
            log.warn('No matching plugins found for the provided flags. Falling back to defaults.')
            return defaults
        }
        return allowed
    }
    if (yes) return defaults
    const pluginOptions = disallowedPlugins
        ? AVAILABLE_PLUGINS.filter(plugin => !disallowedPlugins.has(plugin.id))
        : AVAILABLE_PLUGINS
    const selection = await multiselect({
        message: 'Select Boss CSS plugins and features.',
        options: pluginOptions.map(plugin => ({
            value: plugin.id,
            label: plugin.label,
        })),
        initialValues: defaults,
    })
    cancelIf(selection)
    return selection as string[]
}

const buildPluginState = ({
    selectedPluginIds,
    selectedStrategyId,
}: {
    selectedPluginIds: string[]
    selectedStrategyId: string
}) => {
    const isClassnameOnly = selectedStrategyId === 'classname-only'
    const disallowedPlugins = isClassnameOnly ? new Set(['jsx', 'devtools']) : null
    const pluginState = AVAILABLE_PLUGINS.map(plugin => ({
        ...plugin,
        enabled: selectedPluginIds.includes(plugin.id) && !(disallowedPlugins && disallowedPlugins.has(plugin.id)),
    }))

    const selectedStrategy =
        AVAILABLE_STRATEGIES.find(strategy => strategy.id === selectedStrategyId) ??
        AVAILABLE_STRATEGIES[0]
    const strategyState = { ...selectedStrategy, enabled: true }

    const devtoolsIndex = pluginState.findIndex(plugin => plugin.id === 'devtools')
    if (devtoolsIndex === -1) {
        return [...pluginState, strategyState]
    }
    return [...pluginState.slice(0, devtoolsIndex), strategyState, ...pluginState.slice(devtoolsIndex)]
}

const normalizePluginId = (id: string) => {
    return id
        .trim()
        .replace(/_/g, '-')
        .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
        .toLowerCase()
}

const normalizeStrategyId = (id: string) => {
    const normalized = normalizePluginId(id)
    return STRATEGY_ALIASES.get(normalized) ?? normalized
}

const resolvePostcssMode = async ({
    detection,
    yes,
    value,
}: {
    detection: PostcssDetection
    yes: boolean
    value?: PostcssMode
}): Promise<PostcssMode> => {
    if (value) return value
    if (detection.hasDependency || detection.hasConfigFile || detection.hasPackageConfig) return 'auto'
    if (yes) return 'auto'
    const shouldInstall = await confirm({
        message: 'PostCSS was not detected. Install and configure it automatically?',
        initialValue: true,
    })
    cancelIf(shouldInstall)
    return shouldInstall ? 'auto' : 'manual'
}

const resolveGlobalsEnabled = async ({
    value,
    yes,
}: {
    value?: boolean
    yes: boolean
}): Promise<boolean> => {
    if (value !== undefined) return value
    if (yes) return true
    const enableGlobals = await confirm({
        message: 'Enable global $$ (no import needed)?',
        initialValue: true,
    })
    cancelIf(enableGlobals)
    return enableGlobals as boolean
}

const resolveEslintPlugin = async ({
    value,
    yes,
    enabled,
}: {
    value?: boolean
    yes: boolean
    enabled: boolean
}): Promise<boolean | undefined> => {
    if (!enabled && value === undefined) return undefined
    if (value !== undefined) return value
    if (yes) return true
    const usePlugin = await confirm({
        message: 'Use the Boss ESLint plugin for Boss-specific linting?',
        initialValue: true,
    })
    cancelIf(usePlugin)
    return usePlugin as boolean
}

const parseFlags = (argv: ParsedArgs): InitFlags => {
    const yes = argv.y === true || argv.yes === true
    const srcRoot = getStringArg(argv, ['srcRoot', 'src-root'])
    const configDir = getStringArg(argv, ['configDir', 'config-dir', 'bossDir', 'boss-dir'])
    const plugins = parseListArg(getArg(argv, ['plugins', 'plugin']))
    const strategy = getStringArg(argv, ['strategy'])
    const postcss = normalizePostcssMode(getArg(argv, ['postcss'])) ?? undefined
    const globals = normalizeBooleanArg(getArg(argv, ['globals']))
    const eslintPlugin = normalizeBooleanArg(getArg(argv, ['eslintPlugin', 'eslint-plugin']))
    const overwrite = normalizeBooleanArg(getArg(argv, ['overwrite']))
    return {
        yes,
        srcRoot,
        configDir,
        plugins,
        strategy,
        postcss,
        globals,
        eslintPlugin,
        overwrite,
    }
}

const getArg = (argv: ParsedArgs, keys: string[]) => {
    for (const key of keys) {
        if (Object.prototype.hasOwnProperty.call(argv, key)) {
            return argv[key]
        }
    }
    return undefined
}

const getStringArg = (argv: ParsedArgs, keys: string[]) => {
    const value = getArg(argv, keys)
    if (typeof value === 'string' && value.trim()) return value.trim()
    return undefined
}

const normalizeBooleanArg = (value: unknown): boolean | undefined => {
    if (typeof value === 'boolean') return value
    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase()
        if (normalized === 'true' || normalized === '1' || normalized === 'yes') return true
        if (normalized === 'false' || normalized === '0' || normalized === 'no') return false
    }
    return undefined
}

const parseListArg = (value: unknown): string[] | undefined => {
    if (!value) return undefined
    const values = Array.isArray(value) ? value : [value]
    const parsed = values
        .flatMap(item => (typeof item === 'string' ? item.split(',') : []))
        .map(item => item.trim())
        .filter(Boolean)
    return parsed.length ? parsed : undefined
}

const normalizePostcssMode = (value: unknown): PostcssMode | undefined => {
    if (value === true) return 'auto'
    if (value === false) return 'skip'
    if (typeof value === 'string') {
        const normalized = value.toLowerCase().trim()
        if (normalized === 'auto' || normalized === 'manual' || normalized === 'skip') {
            return normalized
        }
    }
    return undefined
}

const detectSrcRoot = async (cwd: string, isNext: boolean) => {
    if (isNext) {
        if (await exists(path.join(cwd, 'src'))) {
            return 'src'
        }
        return '.'
    }

    const candidates = ['src', 'app', 'pages', 'lib', 'components']
    for (const candidate of candidates) {
        if (await exists(path.join(cwd, candidate))) {
            return candidate
        }
    }
    return 'src'
}

const normalizeRelativePath = (input: string, cwd: string) => {
    const trimmed = input.trim()
    if (!trimmed) return '.'
    const resolved = path.isAbsolute(trimmed) ? path.relative(cwd, trimmed) : trimmed
    const normalized = resolved.replace(/\\/g, '/').replace(/\/+$/g, '')
    return normalized || '.'
}

const normalizeImportPath = (input: string) => {
    const normalized = input.replace(/\\/g, '/')
    if (!normalized || normalized === '.') return '.'
    if (normalized.startsWith('./') || normalized.startsWith('../')) return normalized
    if (normalized.startsWith('.')) return `./${normalized}`
    return `./${normalized}`
}

const formatConfigFolder = (configDir: string) => {
    if (configDir === '.') return './.bo$$'
    if (configDir.startsWith('./') || configDir.startsWith('../')) return configDir
    if (configDir.startsWith('/')) return configDir
    return `./${configDir}`
}

const buildContentGlobs = ({ srcRoot, isNext }: { srcRoot: string; isNext: boolean }) => {
    if (isNext) {
        return [`{src,pages,app,lib,components}/**/*.{${EXTENSIONS}}`]
    }
    if (srcRoot === '.' || srcRoot === '') {
        return [`{src,app,lib,components}/**/*.{${EXTENSIONS}}`]
    }
    return [`${srcRoot}/**/*.{${EXTENSIONS}}`]
}

const detectPostcss = async (cwd: string, packageJson: PackageJson): Promise<PostcssDetection> => {
    let configFilePath: string | undefined
    for (const file of POSTCSS_CONFIG_FILES) {
        const fullPath = path.join(cwd, file)
        if (await exists(fullPath)) {
            configFilePath = fullPath
            break
        }
    }
    return {
        hasDependency: hasDependency(packageJson, 'postcss'),
        hasConfigFile: Boolean(configFilePath),
        hasPackageConfig: Boolean(packageJson.postcss),
        configFilePath,
    }
}

const detectEslint = async (cwd: string, packageJson: PackageJson): Promise<EslintDetection> => {
    const hasEslintDependency = hasDependency(packageJson, 'eslint')
    for (const config of ESLINT_CONFIG_FILES) {
        const fullPath = path.join(cwd, config.file)
        if (await exists(fullPath)) {
            let configFormat: EslintDetection['configFormat']
            if (config.type === 'flat' || config.type === 'eslintrc-js') {
                const content = await fs.readFile(fullPath, 'utf-8')
                configFormat = inferEslintConfigFormat(content, fullPath)
            }
            return {
                hasDependency: hasEslintDependency,
                hasConfig: true,
                configFilePath: fullPath,
                configType: config.type,
                configFormat,
            }
        }
    }

    if (packageJson.eslintConfig && typeof packageJson.eslintConfig === 'object') {
        return {
            hasDependency: hasEslintDependency,
            hasConfig: true,
            configType: 'package',
        }
    }

    return {
        hasDependency: hasEslintDependency,
        hasConfig: false,
    }
}

const inferEslintConfigFormat = (content: string, filePath: string): EslintDetection['configFormat'] => {
    if (filePath.endsWith('.cjs')) return 'cjs'
    if (filePath.endsWith('.mjs')) return 'esm'
    if (/\bmodule\.exports\b/.test(content) || /\brequire\(/.test(content)) return 'cjs'
    if (/\bexport\s+default\b/.test(content) || /\bimport\s+/.test(content)) return 'esm'
    return 'esm'
}

const updatePackageJson = (
    packageJson: PackageJson,
    options: {
        configDir: string
        srcRoot: string
        addBossCss: boolean
        bossCssVersion: string
        addPostcss: boolean
        includePostcssPlugin: boolean
        addEslintPlugin: boolean
        postcssPluginOptions?: Record<string, unknown>
    },
) => {
    let changed = false
    let bossCssAdded = false
    const nextPackageJson = { ...packageJson }
    if (shouldStoreConfigDir(options.configDir, options.srcRoot)) {
        const boConfig = { ...(nextPackageJson.bo$$ ?? {}) }
        if (boConfig.configDir !== options.configDir) {
            boConfig.configDir = options.configDir
            nextPackageJson.bo$$ = boConfig
            changed = true
        }
    }

    if (options.addBossCss && !hasDependency(nextPackageJson, 'boss-css')) {
        const { updated, next } = ensureDependency(
            nextPackageJson,
            'boss-css',
            options.bossCssVersion || 'latest',
            'dependencies',
        )
        if (updated) {
            changed = true
            bossCssAdded = true
            Object.assign(nextPackageJson, next)
        }
    }

    if (options.addPostcss && !hasDependency(nextPackageJson, 'postcss')) {
        const { updated, next } = ensureDependency(nextPackageJson, 'postcss', '^8', 'devDependencies')
        if (updated) {
            changed = true
            Object.assign(nextPackageJson, next)
        }
    }

    if (options.includePostcssPlugin) {
        const { updated, next, needsManual } = ensurePackagePostcssPlugin(
            nextPackageJson,
            options.postcssPluginOptions,
        )
        if (needsManual) {
            log.message('PostCSS config in package.json uses an array; add boss-css/postcss via plugins object map.')
        }
        if (updated) {
            changed = true
            Object.assign(nextPackageJson, next)
        }
    }

    return { changed, data: nextPackageJson, bossCssAdded }
}

const shouldStoreConfigDir = (configDir: string, srcRoot: string) => {
    if (configDir === '.bo$$') return false
    const normalizedSrc = srcRoot === '.' ? '' : srcRoot.replace(/\/+$/g, '')
    const srcConfigDir = normalizedSrc ? `${normalizedSrc}/.bo$$` : '.bo$$'
    return configDir !== srcConfigDir
}

const ensureDependency = (
    packageJson: PackageJson,
    name: string,
    version: string,
    field: 'dependencies' | 'devDependencies',
) => {
    const next = { ...packageJson }
    const bucket = { ...(next[field] ?? {}) }
    if (bucket[name]) {
        return { updated: false, next }
    }
    bucket[name] = version
    next[field] = bucket
    return { updated: true, next }
}

const ensurePackagePostcssPlugin = (packageJson: PackageJson, pluginOptions?: Record<string, unknown>) => {
    const next = { ...packageJson }
    if (!next.postcss || typeof next.postcss !== 'object') {
        return { updated: false, next }
    }
    const postcssConfig = { ...(next.postcss as Record<string, unknown>) }
    const plugins = postcssConfig.plugins

    if (Array.isArray(plugins)) {
        return { updated: false, next, needsManual: true }
    }

    if (plugins && typeof plugins === 'object') {
        if (!Object.prototype.hasOwnProperty.call(plugins, 'boss-css/postcss')) {
            postcssConfig.plugins = {
                'boss-css/postcss': pluginOptions ?? {},
                ...(plugins as Record<string, unknown>),
            }
            next.postcss = postcssConfig
            return { updated: true, next }
        }
        if (pluginOptions) {
            postcssConfig.plugins = {
                ...(plugins as Record<string, unknown>),
                'boss-css/postcss': pluginOptions,
            }
            next.postcss = postcssConfig
            return { updated: true, next }
        }
        return { updated: false, next }
    }

    if (!plugins) {
        postcssConfig.plugins = { 'boss-css/postcss': pluginOptions ?? {} }
        next.postcss = postcssConfig
        return { updated: true, next }
    }

    return { updated: false, next }
}

const configureEslint = async ({
    detection,
    globalsEnabled,
    useEslintPlugin,
    allowReactGlobalsRule,
    packageJson,
}: {
    detection: EslintDetection
    globalsEnabled: boolean
    useEslintPlugin: boolean
    allowReactGlobalsRule: boolean
    packageJson: PackageJson
}) => {
    if (!detection.hasConfig) {
        if (!globalsEnabled && !useEslintPlugin) {
            return { updated: false, packageJsonChanged: false, packageJson }
        }
        const configFile = selectEslintConfigFile(packageJson)
        const configText = createEslintConfigText({ globalsEnabled, useEslintPlugin, allowReactGlobalsRule })
        if (configText) {
            await writeFile(path.join(process.cwd(), configFile), configText)
            return { updated: true, packageJsonChanged: false, packageJson }
        }
        return { updated: false, packageJsonChanged: false, packageJson }
    }

    if (detection.configType === 'package') {
        if (!packageJson.eslintConfig || typeof packageJson.eslintConfig !== 'object') {
            log.warn('package.json eslintConfig is not an object. Skipping ESLint updates.')
            return { updated: false, packageJsonChanged: false, packageJson }
        }
        const update = updateEslintConfigObject(packageJson.eslintConfig as Record<string, unknown>, {
            globalsEnabled,
            useEslintPlugin,
            allowReactGlobalsRule,
        })
        if (update.changed) {
            return {
                updated: true,
                packageJsonChanged: true,
                packageJson: {
                    ...packageJson,
                    eslintConfig: update.config,
                },
            }
        }
        return { updated: false, packageJsonChanged: false, packageJson }
    }

    if (!detection.configFilePath) {
        return { updated: false, packageJsonChanged: false, packageJson }
    }

    if (detection.configType === 'flat') {
        const content = await fs.readFile(detection.configFilePath, 'utf-8')
        const update = updateFlatEslintConfigContent(content, {
            globalsEnabled,
            useEslintPlugin,
            allowReactGlobalsRule,
            configFormat: detection.configFormat ?? 'esm',
        })
        if (!update.handled) {
            log.warn('Unable to update ESLint config automatically. Add $$ globals manually.')
            return { updated: false, packageJsonChanged: false, packageJson }
        }
        if (update.updated) {
            await fs.writeFile(detection.configFilePath, update.content)
        }
        return { updated: update.updated, packageJsonChanged: false, packageJson }
    }

    if (detection.configType === 'eslintrc') {
        const content = await fs.readFile(detection.configFilePath, 'utf-8')
        try {
            const parsed = parseJson<Record<string, unknown>>(content, {
                filePath: detection.configFilePath,
                allowTrailingCommas: true,
            })
            const update = updateEslintConfigObject(parsed, {
                globalsEnabled,
                useEslintPlugin,
                allowReactGlobalsRule,
            })
            if (update.changed) {
                await fs.writeFile(detection.configFilePath, JSON.stringify(update.config, null, 2) + '\n')
            }
            return { updated: update.changed, packageJsonChanged: false, packageJson }
        } catch (error) {
            log.warn('Unable to parse ESLint config JSON. Add $$ globals manually.')
            return { updated: false, packageJsonChanged: false, packageJson }
        }
    }

    if (detection.configType === 'eslintrc-js') {
        const content = await fs.readFile(detection.configFilePath, 'utf-8')
        const update = updateEslintObjectConfigContent(content, {
            globalsEnabled,
            useEslintPlugin,
            allowReactGlobalsRule,
        })
        if (!update.handled) {
            log.warn('Unable to update ESLint config automatically. Add $$ globals manually.')
            return { updated: false, packageJsonChanged: false, packageJson }
        }
        if (update.updated) {
            await fs.writeFile(detection.configFilePath, update.content)
        }
        return { updated: update.updated, packageJsonChanged: false, packageJson }
    }

    log.warn('ESLint config format not supported for automatic updates.')
    return { updated: false, packageJsonChanged: false, packageJson }
}

const selectEslintConfigFile = (packageJson: PackageJson) => {
    return packageJson.type === 'module' ? 'eslint.config.js' : 'eslint.config.mjs'
}

const createEslintConfigText = ({
    globalsEnabled,
    useEslintPlugin,
    allowReactGlobalsRule,
}: {
    globalsEnabled: boolean
    useEslintPlugin: boolean
    allowReactGlobalsRule: boolean
}) => {
    const lines = buildEslintManagedArrayEntries({
        includePluginConfig: useEslintPlugin,
        includeGlobals: globalsEnabled && !useEslintPlugin,
        includeAllowGlobalsRule: globalsEnabled && allowReactGlobalsRule,
    })
    if (!lines.length) return ''
    if (useEslintPlugin) {
        const block = buildManagedBlock(lines, '    ')
        return `import bossCss from 'boss-css/eslint-plugin'

export default [
${block}
]
`
    }
    const block = buildManagedBlock(lines, '    ')
    return `export default [
${block}
]
`
}

const updateEslintConfigObject = (
    config: Record<string, unknown>,
    {
        globalsEnabled,
        useEslintPlugin,
        allowReactGlobalsRule,
    }: {
        globalsEnabled: boolean
        useEslintPlugin: boolean
        allowReactGlobalsRule: boolean
    },
) => {
    let changed = false
    const next = { ...config }

    if (globalsEnabled) {
        const globals = { ...(next.globals as Record<string, unknown> | undefined) }
        if (globals.$$ !== 'readonly') {
            globals.$$ = 'readonly'
            next.globals = globals
            changed = true
        }
        if (allowReactGlobalsRule) {
            const rules = { ...(next.rules as Record<string, unknown> | undefined) }
            const allowGlobals = ensureAllowGlobalsRule(rules)
            if (allowGlobals.changed) {
                next.rules = allowGlobals.rules
                changed = true
            }
        }
    }

    if (useEslintPlugin) {
        const plugins = normalizeToArray(next.plugins)
        if (!plugins.includes('boss-css')) {
            plugins.unshift('boss-css')
            next.plugins = plugins
            changed = true
        }
        const extendsList = normalizeToArray(next.extends)
        if (!extendsList.includes('plugin:boss-css/recommended')) {
            extendsList.unshift('plugin:boss-css/recommended')
            next.extends = extendsList
            changed = true
        }
    }

    return { changed, config: next }
}

const normalizeToArray = (value: unknown): string[] => {
    if (!value) return []
    if (Array.isArray(value)) return value.filter(item => typeof item === 'string') as string[]
    if (typeof value === 'string') return [value]
    return []
}

const updateFlatEslintConfigContent = (
    content: string,
    {
        globalsEnabled,
        useEslintPlugin,
        allowReactGlobalsRule,
        configFormat,
    }: {
        globalsEnabled: boolean
        useEslintPlugin: boolean
        allowReactGlobalsRule: boolean
        configFormat: 'esm' | 'cjs'
    },
) => {
    let next = content
    let updated = false
    const legacyImportUpdate = replaceLegacyBossEslintImport(next)
    if (legacyImportUpdate !== next) {
        next = legacyImportUpdate
        updated = true
    }

    if (useEslintPlugin && !hasBossEslintImport(next)) {
        next = ensureEslintPluginImport(next, configFormat)
        updated = true
    }

    const hasBlock = hasManagedBlock(next)
    const needsGlobals = globalsEnabled && !hasEslintGlobal(next) && !useEslintPlugin
    const needsAllowGlobalsRule = globalsEnabled && allowReactGlobalsRule && !hasEslintAllowGlobalsRule(next)
    const needsPluginConfig = useEslintPlugin && !hasBossEslintConfig(next)
    const managedLines = buildEslintManagedArrayEntries({
        includePluginConfig: useEslintPlugin && (needsPluginConfig || hasBlock),
        includeGlobals: globalsEnabled && !useEslintPlugin && (needsGlobals || hasBlock),
        includeAllowGlobalsRule: globalsEnabled && allowReactGlobalsRule && (needsAllowGlobalsRule || hasBlock),
    })

    if (managedLines.length && (needsGlobals || needsAllowGlobalsRule || needsPluginConfig || hasBlock)) {
        const bounds = findExportArrayBounds(next)
        if (!bounds) {
            return { updated: false, content, handled: false }
        }
        const insert = upsertManagedBlockIntoArray(next, bounds, managedLines)
        next = insert.content
        updated = updated || insert.updated
    }

    return { updated, content: next, handled: true }
}

const updateEslintObjectConfigContent = (
    content: string,
    {
        globalsEnabled,
        useEslintPlugin,
        allowReactGlobalsRule,
    }: {
        globalsEnabled: boolean
        useEslintPlugin: boolean
        allowReactGlobalsRule: boolean
    },
) => {
    const objectStart = findExportObjectStart(content)
    if (objectStart === null) {
        return { updated: false, content, handled: false }
    }

    let next = content
    let updated = false

    if (useEslintPlugin) {
        const pluginEntry = `'boss-css'`
        const extendEntry = `'plugin:boss-css/recommended'`
        const pluginsUpdate = ensureArrayEntry(next, 'plugins', pluginEntry)
        next = pluginsUpdate.content
        updated = updated || pluginsUpdate.updated
        const extendsUpdate = ensureArrayEntry(next, 'extends', extendEntry)
        next = extendsUpdate.content
        updated = updated || extendsUpdate.updated
    }

    const hasBlock = hasManagedBlock(next)
    const needsGlobals = globalsEnabled && !hasEslintGlobal(next)
    const needsAllowGlobalsRule = globalsEnabled && allowReactGlobalsRule && !hasEslintAllowGlobalsRule(next)
    const managedLines = buildEslintManagedObjectLines({
        includeGlobals: globalsEnabled && (needsGlobals || hasBlock),
        includeAllowGlobalsRule: globalsEnabled && allowReactGlobalsRule && (needsAllowGlobalsRule || hasBlock),
    })

    if (managedLines.length && (needsGlobals || needsAllowGlobalsRule || hasBlock)) {
        const insert = upsertManagedBlockInObject(next, managedLines)
        next = insert.content
        updated = updated || insert.updated
    }

    return { updated, content: next, handled: true }
}

const hasBossEslintConfig = (content: string) => /bossCss\.configs\./.test(content)

const hasBossEslintImport = (content: string) =>
    /boss-css\/eslint-plugin/.test(content) || /@boss-css\/eslint-plugin-boss-css/.test(content)

const replaceLegacyBossEslintImport = (content: string) =>
    content.replace(/@boss-css\/eslint-plugin-boss-css/g, 'boss-css/eslint-plugin')

const hasEslintGlobal = (content: string) => /['"]\$\$['"]\s*:/.test(content)
const hasEslintAllowGlobalsRule = (content: string) =>
    /react\/jsx-no-undef/.test(content) && /allowGlobals\s*:\s*true/.test(content)
const hasManagedBlock = (content: string) => /\/\/\s*bo\$\$:begin/.test(content) && /\/\/\s*bo\$\$:end/.test(content)

const ensureEslintPluginImport = (content: string, configFormat: 'esm' | 'cjs') => {
    const importLine =
        configFormat === 'esm'
            ? "import bossCss from 'boss-css/eslint-plugin'"
            : "const bossCss = require('boss-css/eslint-plugin')"
    return insertImports(content, [importLine])
}

const findExportArrayBounds = (content: string) => {
    const exportMatch = content.match(/export\s+default\s*\[/)
    const moduleMatch = content.match(/module\.exports\s*=\s*\[/)
    const match = exportMatch ?? moduleMatch
    if (match) {
        if (match.index == null) return null
        const startIndex = match.index + match[0].length - 1
        const endIndex = findMatchingIndex(content, startIndex, '[', ']')
        if (endIndex === -1) return null
        return { startIndex, endIndex }
    }

    const defineExportMatch = content.match(/export\s+default\s+defineConfig\s*\(/)
    if (defineExportMatch) {
        if (defineExportMatch.index == null) return null
        const callStart = defineExportMatch.index + defineExportMatch[0].length - 1
        return findDefineConfigArrayBounds(content, callStart)
    }

    const identifier = findExportIdentifier(content)
    if (!identifier) return null
    return (
        findArrayBoundsByIdentifier(content, identifier) ?? findDefineConfigArrayBoundsByIdentifier(content, identifier)
    )
}

const findExportObjectStart = (content: string) => {
    const exportMatch = content.match(/export\s+default\s*\{/)
    const moduleMatch = content.match(/module\.exports\s*=\s*\{/)
    const match = exportMatch ?? moduleMatch
    if (match) {
        if (match.index == null) return null
        return match.index + match[0].length - 1
    }

    const identifier = findExportIdentifier(content)
    if (!identifier) return null
    return findObjectStartByIdentifier(content, identifier)
}

const findExportIdentifier = (content: string) => {
    const exportMatch = content.match(/export\s+default\s+([A-Za-z_$][\w$]*)/)
    if (exportMatch) return exportMatch[1]
    const moduleMatch = content.match(/module\.exports\s*=\s*([A-Za-z_$][\w$]*)/)
    if (moduleMatch) return moduleMatch[1]
    return null
}

const findArrayBoundsByIdentifier = (content: string, identifier: string) => {
    const escaped = escapeRegExp(identifier)
    const match = content.match(new RegExp(`\\b(?:const|let|var)\\s+${escaped}\\s*=\\s*\\[`))
    if (!match) return null
    if (match.index == null) return null
    const startIndex = match.index + match[0].length - 1
    const endIndex = findMatchingIndex(content, startIndex, '[', ']')
    if (endIndex === -1) return null
    return { startIndex, endIndex }
}

const findDefineConfigArrayBoundsByIdentifier = (content: string, identifier: string) => {
    const escaped = escapeRegExp(identifier)
    const match = content.match(new RegExp(`\\b(?:const|let|var)\\s+${escaped}\\s*=\\s*defineConfig\\s*\\(`))
    if (!match) return null
    if (match.index == null) return null
    const callStart = match.index + match[0].length - 1
    return findDefineConfigArrayBounds(content, callStart)
}

const findDefineConfigArrayBounds = (content: string, callStart: number) => {
    const callEnd = findMatchingIndex(content, callStart, '(', ')')
    if (callEnd === -1) return null
    const arrayStart = content.indexOf('[', callStart)
    if (arrayStart === -1 || arrayStart > callEnd) return null
    const arrayEnd = findMatchingIndex(content, arrayStart, '[', ']')
    if (arrayEnd === -1 || arrayEnd > callEnd) return null
    return { startIndex: arrayStart, endIndex: arrayEnd }
}

const findObjectStartByIdentifier = (content: string, identifier: string) => {
    const escaped = escapeRegExp(identifier)
    const match = content.match(new RegExp(`\\b(?:const|let|var)\\s+${escaped}\\s*=\\s*\\{`))
    if (!match) return null
    if (match.index == null) return null
    return match.index + match[0].length - 1
}

const insertIntoArrayLiteral = (
    content: string,
    bounds: { startIndex: number; endIndex: number },
    entry: string,
) => {
    if (content.slice(bounds.startIndex, bounds.endIndex).includes(entry)) {
        return { updated: false, content }
    }
    const indent = getIndentFromIndex(content, bounds.startIndex)
    const entryIndent = `${indent}  `
    const entryLines = entry.split('\n').map(line => (line ? `${entryIndent}${line}` : line))
    const insertion = `\n${entryLines.join('\n')},`
    return {
        updated: true,
        content: `${content.slice(0, bounds.endIndex)}${insertion}${content.slice(bounds.endIndex)}`,
    }
}

const buildEslintManagedArrayEntries = ({
    includePluginConfig,
    includeGlobals,
    includeAllowGlobalsRule,
}: {
    includePluginConfig: boolean
    includeGlobals: boolean
    includeAllowGlobalsRule: boolean
}) => {
    const lines: string[] = []
    if (includePluginConfig) {
        lines.push('bossCss.configs.recommended,')
    }
    if (includeGlobals || includeAllowGlobalsRule) {
        lines.push('{')
        if (includeGlobals) {
            lines.push(
                '  languageOptions: {',
                '    globals: {',
                "      $$: 'readonly',",
                '    },',
                '  },',
            )
        }
        if (includeAllowGlobalsRule) {
            lines.push(
                '  rules: {',
                "    'react/jsx-no-undef': ['error', { allowGlobals: true }],",
                '  },',
            )
        }
        lines.push('},')
    }
    return lines
}

const buildEslintManagedObjectLines = ({
    includeGlobals,
    includeAllowGlobalsRule,
}: {
    includeGlobals: boolean
    includeAllowGlobalsRule: boolean
}) => {
    const lines: string[] = []
    if (includeGlobals) {
        lines.push("globals: {", "  '$$': 'readonly',", '},')
    }
    if (includeAllowGlobalsRule) {
        lines.push("rules: {", "  'react/jsx-no-undef': ['error', { allowGlobals: true }],", '},')
    }
    return lines
}

const upsertManagedBlockIntoArray = (
    content: string,
    bounds: { startIndex: number; endIndex: number },
    lines: string[],
) => {
    const replaced = replaceManagedBlock(content, lines)
    if (replaced.found) {
        return { updated: replaced.updated, content: replaced.content }
    }
    const indent = getIndentFromIndex(content, bounds.startIndex)
    const entryIndent = `${indent}  `
    const block = buildManagedBlock(lines, entryIndent)
    const separator = needsArrayComma(content, bounds) ? ',' : ''
    const insertion = `${separator}\n${block}\n`
    return {
        updated: true,
        content: `${content.slice(0, bounds.endIndex)}${insertion}${content.slice(bounds.endIndex)}`,
    }
}

const upsertManagedBlockInObject = (content: string, lines: string[]) => {
    const replaced = replaceManagedBlock(content, lines)
    if (replaced.found) {
        return { updated: replaced.updated, content: replaced.content }
    }
    const objectStart = findExportObjectStart(content)
    if (objectStart === null) return { updated: false, content }
    const indent = getIndentFromIndex(content, objectStart)
    const entryIndent = `${indent}  `
    const block = buildManagedBlock(lines, entryIndent)
    const insertion = `\n${block}\n`
    return {
        updated: true,
        content: `${content.slice(0, objectStart + 1)}${insertion}${content.slice(objectStart + 1)}`,
    }
}

const buildManagedBlock = (lines: string[], indent = '') => {
    const start = `${indent}// bo$$:begin`
    const end = `${indent}// bo$$:end`
    const body = lines.map(line => (line ? `${indent}${line}` : line))
    return [start, ...body, end].join('\n')
}

const replaceManagedBlock = (content: string, lines: string[]) => {
    const regex = /(^[ \t]*)\/\/\s*bo\$\$?:begin[\s\S]*?^[ \t]*\/\/\s*bo\$\$?:end/m
    const match = regex.exec(content)
    if (!match) return { updated: false, content, found: false }
    const indent = match[1] ?? ''
    const block = buildManagedBlock(lines, indent)
    if (match.index == null) return { updated: false, content, found: false }
    const before = content.slice(0, match.index)
    const after = content.slice(match.index + match[0].length)
    const cleanedAfter = after.replace(new RegExp(regex.source, 'gm'), '')
    const next = `${before}${block}${cleanedAfter}`
    return { updated: next !== content, content: ensureManagedBlockNewline(next), found: true }
}

const ensureManagedBlockNewline = (content: string) => {
    return content.replace(/(\/\/\s*bo\$\$:end)(?=[^\n])/g, '$1\n')
}

const needsArrayComma = (content: string, bounds: { startIndex: number; endIndex: number }) => {
    let index = bounds.endIndex - 1
    while (index > bounds.startIndex && /\s/.test(content[index])) {
        index -= 1
    }
    const lastChar = content[index]
    if (!lastChar) return false
    return lastChar !== '[' && lastChar !== ','
}

const ensureArrayEntry = (content: string, key: string, entry: string) => {
    const arrayMatch = content.match(new RegExp(`${key}\\s*:\\s*\\[`))
    const stringMatch = !arrayMatch ? content.match(new RegExp(`${key}\\s*:\\s*(['"][^'"]+['"])`)) : null
    if (stringMatch) {
        const entryValue = entry.replace(/^['"]|['"]$/g, '')
        const existingValue = stringMatch[1].replace(/^['"]|['"]$/g, '')
        if (existingValue === entryValue) {
            return { updated: false, content }
        }
        const replacement = `${key}: [${stringMatch[1]}, ${entry}]`
        return {
            updated: true,
            content: content.replace(stringMatch[0], replacement),
        }
    }
    if (!arrayMatch) {
        const objectStart = findExportObjectStart(content)
        if (objectStart === null) return { updated: false, content }
        const indent = getIndentFromIndex(content, objectStart)
        const entryIndent = `${indent}  `
        const insertion = `\n${entryIndent}${key}: [${entry}],`
        return {
            updated: true,
            content: `${content.slice(0, objectStart + 1)}${insertion}${content.slice(objectStart + 1)}`,
        }
    }

    if (arrayMatch.index == null) return { updated: false, content }
    const startIndex = arrayMatch.index + arrayMatch[0].length - 1
    const endIndex = findMatchingIndex(content, startIndex, '[', ']')
    if (endIndex === -1) return { updated: false, content }
    const entryValue = entry.replace(/^['"]|['"]$/g, '')
    const entryRegex = new RegExp(`['"]${escapeRegExp(entryValue)}['"]`)
    if (entryRegex.test(content.slice(startIndex, endIndex))) return { updated: false, content }

    const indent = getIndentFromIndex(content, startIndex)
    const entryIndent = `${indent}  `
    const insertion = `\n${entryIndent}${entry},`
    return {
        updated: true,
        content: `${content.slice(0, endIndex)}${insertion}${content.slice(endIndex)}`,
    }
}

const ensureObjectEntry = (content: string, key: string, entry: string) => {
    const objectMatch = content.match(new RegExp(`${key}\\s*:\\s*\\{`))
    if (!objectMatch) {
        const objectStart = findExportObjectStart(content)
        if (objectStart === null) return { updated: false, content }
        const indent = getIndentFromIndex(content, objectStart)
        const entryIndent = `${indent}  `
        const insertion = `\n${entryIndent}${key}: {\n${entryIndent}  ${entry},\n${entryIndent}},`
        return {
            updated: true,
            content: `${content.slice(0, objectStart + 1)}${insertion}${content.slice(objectStart + 1)}`,
        }
    }

    if (objectMatch.index == null) return { updated: false, content }
    const startIndex = objectMatch.index + objectMatch[0].length - 1
    const endIndex = findMatchingIndex(content, startIndex, '{', '}')
    if (endIndex === -1) return { updated: false, content }
    if (content.slice(startIndex, endIndex).includes(entry)) return { updated: false, content }

    const indent = getIndentFromIndex(content, startIndex)
    const entryIndent = `${indent}  `
    const insertion = `\n${entryIndent}${entry},`
    return {
        updated: true,
        content: `${content.slice(0, endIndex)}${insertion}${content.slice(endIndex)}`,
    }
}

const ensureRuleEntry = (content: string, key: string, entry: string) => {
    const rulesMatch = content.match(/rules\s*:\s*\{/)
    if (!rulesMatch) {
        return ensureObjectEntry(content, 'rules', `${key}: ${entry}`)
    }
    if (rulesMatch.index == null) return { updated: false, content }
    const startIndex = rulesMatch.index + rulesMatch[0].length - 1
    const endIndex = findMatchingIndex(content, startIndex, '{', '}')
    if (endIndex === -1) return { updated: false, content }
    const ruleValue = key.replace(/^['"]|['"]$/g, '')
    const ruleRegex = new RegExp(`['"]${escapeRegExp(ruleValue)}['"]`)
    if (ruleRegex.test(content.slice(startIndex, endIndex))) return { updated: false, content }
    const indent = getIndentFromIndex(content, startIndex)
    const entryIndent = `${indent}  `
    const insertion = `\n${entryIndent}${key}: ${entry},`
    return {
        updated: true,
        content: `${content.slice(0, endIndex)}${insertion}${content.slice(endIndex)}`,
    }
}

const ensureAllowGlobalsRule = (rules: Record<string, unknown>) => {
    const existing = rules['react/jsx-no-undef']
    if (Array.isArray(existing)) {
        const options = typeof existing[1] === 'object' && existing[1] ? { ...(existing[1] as object) } : {}
        if ((options as { allowGlobals?: boolean }).allowGlobals === true) {
            return { changed: false, rules }
        }
        return {
            changed: true,
            rules: {
                ...rules,
                'react/jsx-no-undef': [existing[0] ?? 'error', { ...options, allowGlobals: true }, ...existing.slice(2)],
            },
        }
    }
    if (existing !== undefined) {
        return {
            changed: true,
            rules: {
                ...rules,
                'react/jsx-no-undef': [existing, { allowGlobals: true }],
            },
        }
    }
    return {
        changed: true,
        rules: {
            ...rules,
            'react/jsx-no-undef': ['error', { allowGlobals: true }],
        },
    }
}

const shouldAllowReactGlobalsRule = (packageJson: PackageJson) => {
    return (
        hasDependency(packageJson, 'eslint-plugin-react') ||
        hasDependency(packageJson, 'eslint-config-next') ||
        hasDependency(packageJson, 'next')
    )
}
const findMatchingIndex = (content: string, startIndex: number, openChar: string, closeChar: string) => {
    let depth = 0
    for (let index = startIndex; index < content.length; index += 1) {
        const char = content[index]
        if (char === openChar) {
            depth += 1
        } else if (char === closeChar) {
            depth -= 1
            if (depth === 0) return index
        }
    }
    return -1
}

const writeInitFiles = async ({
    outputDir,
    configFolder,
    contentGlobs,
    pluginState,
    selectedStrategyId,
    isNext,
    postcssMode,
    postcssDetection,
    includeAutoprefixer,
    packageJson,
    dirDependencies,
    usePostcssOptions,
    srcRoot,
    configDir,
    globalsEnabled,
    cssAutoLoad,
    overwriteConfigDir,
}: {
    outputDir: string
    configFolder: string
    contentGlobs: string[]
    pluginState: Array<PluginOption & { enabled: boolean }>
    selectedStrategyId: string
    isNext: boolean
    postcssMode: PostcssMode
    postcssDetection: PostcssDetection
    includeAutoprefixer: boolean
    packageJson: PackageJson
    dirDependencies: boolean
    usePostcssOptions: boolean
    srcRoot: string
    configDir: string
    globalsEnabled: boolean
    cssAutoLoad: boolean
    overwriteConfigDir: boolean
}) => {
    await fs.mkdir(outputDir, { recursive: true })

    const isRuntimeStrategy =
        selectedStrategyId === 'runtime-only' || selectedStrategyId === 'runtime-hybrid'
    const configText = pluvo(
        configTemplate,
        {
            plugins: pluginState,
            folder: configFolder,
            content: contentGlobs,
            jsxEnabled: pluginState.some(plugin => plugin.id === 'jsx' && plugin.enabled),
            globalsEnabled,
            runtimeEnabled: isRuntimeStrategy,
            runtimeStrategy: 'inline-first',
            runtimeOnly: selectedStrategyId === 'runtime-only',
            cssAutoLoad,
        },
        { commentStyles: INIT_COMMENT_STYLES },
    )

    await writeFile(path.join(outputDir, 'config.js'), configText, overwriteConfigDir)
    await writeFile(path.join(outputDir, 'jsconfig.json'), jsconfigTemplate, overwriteConfigDir)
    await writeFile(path.join(outputDir, 'package.json'), packageTemplate, overwriteConfigDir)
    await ensureFile(path.join(outputDir, 'styles.css'))

    if (postcssMode === 'auto') {
        if (!postcssDetection.hasConfigFile && !postcssDetection.hasPackageConfig) {
            const postcssText = pluvo(
                postcssTemplate,
                {
                    includeAutoprefixer,
                    dirDependencies,
                    useOptions: usePostcssOptions,
                },
                { commentStyles: INIT_COMMENT_STYLES },
            )
            await writeFile(path.join(process.cwd(), 'postcss.config.js'), postcssText)
        } else if (postcssDetection.hasConfigFile && postcssDetection.configFilePath) {
            const update = await updatePostcssConfigFile(postcssDetection.configFilePath, {
                dirDependencies,
                useOptions: usePostcssOptions,
            })
            if (!update.updated && !update.hasBoss) {
                await warnIfPostcssPluginMissing(postcssDetection.configFilePath)
            }
        } else if (packageJson.postcss && typeof packageJson.postcss === 'object') {
            // package.json was updated via ensurePackagePostcssPlugin
        }
    }

    if (isNext && selectedStrategyId !== 'classname-only') {
        await ensureNextInstrumentationFiles({
            srcRoot,
            configDir,
            packageJson,
        })
    }
}

const ensureNextInstrumentationFiles = async ({
    srcRoot,
    configDir,
    packageJson,
}: {
    srcRoot: string
    configDir: string
    packageJson: PackageJson
}) => {
    const cwd = process.cwd()
    const existingExt = await detectInstrumentationExtension(cwd, srcRoot)
    const useTypeScript =
        existingExt === '.ts' ||
        (await exists(path.join(cwd, 'tsconfig.json'))) ||
        hasDependency(packageJson, 'typescript')
    const ext = existingExt ?? (useTypeScript ? '.ts' : '.js')
    const instrumentationDir = path.resolve(cwd, srcRoot === '.' ? '' : srcRoot)
    const configDirAbs = path.resolve(cwd, configDir)
    const importRoot = normalizeImportPath(path.relative(instrumentationDir, configDirAbs))

    await ensureInstrumentationFile({
        filePath: path.join(instrumentationDir, `instrumentation${ext}`),
        importPaths: [importRoot],
        template: importPath => `import '${importPath}'\n`,
    })

    await ensureInstrumentationFile({
        filePath: path.join(instrumentationDir, `instrumentation-client${ext}`),
        importPaths: [importRoot],
        template: importPath => `import '${importPath}'\n`,
    })
}

const STENCIL_CONFIG_FILES = [
    'stencil.config.ts',
    'stencil.config.js',
    'stencil.config.mjs',
    'stencil.config.cjs',
]

const ensureStencilSetup = async ({
    cwd,
    srcRoot,
    configDir,
    packageJson,
}: {
    cwd: string
    srcRoot: string
    configDir: string
    packageJson: PackageJson
}) => {
    const stencilConfigPath = await detectStencilConfigPath(cwd)
    if (!stencilConfigPath) {
        log.warn('Stencil config not found. Add globalScript/globalStyle manually.')
        return
    }

    const globalScriptPath = await resolveStencilGlobalScriptPath(cwd, srcRoot, packageJson)
    const globalScriptRelative = normalizeRelativePath(path.relative(cwd, globalScriptPath), cwd)
    const globalStyleRelative = path.join(configDir, 'styles.css').replace(/\\/g, '/')

    const configUpdated = await ensureStencilConfigFields({
        filePath: stencilConfigPath,
        fields: [
            { key: 'globalScript', line: `globalScript: '${globalScriptRelative}',` },
            { key: 'globalStyle', line: `globalStyle: '${globalStyleRelative}',` },
        ],
    })

    await ensureStencilGlobalScriptFile({
        filePath: globalScriptPath,
        configDirAbs: path.resolve(cwd, configDir),
    })

    if (configUpdated) {
        log.message('Stencil config updated with Boss CSS globals.')
    }
}

const detectStencilConfigPath = async (cwd: string) => {
    for (const file of STENCIL_CONFIG_FILES) {
        const fullPath = path.join(cwd, file)
        if (await exists(fullPath)) {
            return fullPath
        }
    }
    return null
}

const resolveStencilGlobalScriptPath = async (cwd: string, srcRoot: string, packageJson: PackageJson) => {
    const baseDir = path.resolve(cwd, srcRoot, 'global')
    const tsPath = path.join(baseDir, 'app.ts')
    const jsPath = path.join(baseDir, 'app.js')
    if (await exists(tsPath)) return tsPath
    if (await exists(jsPath)) return jsPath

    const useTypeScript = (await exists(path.join(cwd, 'tsconfig.json'))) || hasDependency(packageJson, 'typescript')
    return path.join(baseDir, `app.${useTypeScript ? 'ts' : 'js'}`)
}

const ensureStencilGlobalScriptFile = async ({
    filePath,
    configDirAbs,
}: {
    filePath: string
    configDirAbs: string
}) => {
    const importPath = normalizeImportPath(path.relative(path.dirname(filePath), configDirAbs))
    if (!(await exists(filePath))) {
        await writeFile(filePath, `import '${importPath}'\n\nexport default function () {}\n`)
        return
    }

    const current = await fs.readFile(filePath, 'utf-8')
    const updated = ensureSideEffectImports(current, [importPath])
    if (updated !== current) {
        await fs.writeFile(filePath, updated)
    }
}

const ensureStencilConfigFields = async ({
    filePath,
    fields,
}: {
    filePath: string
    fields: Array<{ key: string; line: string }>
}) => {
    const current = await fs.readFile(filePath, 'utf-8')
    const missing = fields.filter(field => !new RegExp(`^\\s*${field.key}\\s*:`, 'm').test(current))
    if (!missing.length) return false

    const lines = current.split('\n')
    const namespaceIndex = lines.findIndex(line => /^\s*namespace\s*:/.test(line))
    let insertIndex = namespaceIndex
    if (insertIndex === -1) {
        insertIndex = findStencilConfigInsertIndex(lines)
    }

    if (insertIndex === -1) {
        log.warn('Unable to update stencil.config. Add globalScript/globalStyle manually.')
        return false
    }

    const indent =
        lines[namespaceIndex]?.match(/^\s+/)?.[0] ??
        current.match(/^[ \t]+(?=[A-Za-z_])/m)?.[0] ??
        '  '

    const insertLines = missing.map(field => `${indent}${field.line}`)
    lines.splice(insertIndex + 1, 0, ...insertLines)
    await fs.writeFile(filePath, lines.join('\n'))
    return true
}

const findStencilConfigInsertIndex = (lines: string[]) => {
    const configLineIndex = lines.findIndex(line =>
        /export\s+const\s+config\b/.test(line) || /\bconst\s+config\b/.test(line),
    )
    if (configLineIndex === -1) return -1

    if (lines[configLineIndex].includes('{')) return configLineIndex

    for (let index = configLineIndex + 1; index < lines.length; index += 1) {
        if (lines[index].includes('{')) return index
    }
    return configLineIndex
}

const detectInstrumentationExtension = async (cwd: string, srcRoot: string) => {
    const baseDir = path.resolve(cwd, srcRoot === '.' ? '' : srcRoot)
    const candidates = ['.ts', '.js']
    for (const ext of candidates) {
        const serverPath = path.join(baseDir, `instrumentation${ext}`)
        const clientPath = path.join(baseDir, `instrumentation-client${ext}`)
        if ((await exists(serverPath)) || (await exists(clientPath))) {
            return ext
        }
    }
    return undefined
}

const ensureInstrumentationFile = async ({
    filePath,
    importPaths,
    template,
}: {
    filePath: string
    importPaths: string[]
    template: (importPath: string) => string
}) => {
    if (!(await exists(filePath))) {
        const block = buildManagedBlock([`import '${importPaths[0]}'`])
        await writeFile(filePath, block)
        return
    }

    const current = await fs.readFile(filePath, 'utf-8')
    const normalized = normalizeInstrumentationImports(current)
    const replaced = replaceManagedBlock(normalized, [`import '${importPaths[0]}'`])
    if (replaced.found) {
        if (replaced.updated) {
            await writeFile(filePath, replaced.content)
        }
        return
    }
    const cleaned = stripUnmanagedBossImports(normalized)
    const next = insertManagedBlock(cleaned, [`import '${importPaths[0]}'`])
    if (next !== current) {
        await writeFile(filePath, next)
    }
}

const ensureSideEffectImports = (content: string, importPaths: string[]) => {
    const missing = importPaths.filter(importPath => !hasImportPath(content, importPath))
    if (!missing.length) return content

    const importLines = missing.map(importPath => `import '${importPath}'`)
    return insertImports(content, importLines)
}

const normalizeInstrumentationImports = (content: string) => {
    const replacement = "import './.bo$$'"
    const lines = content.split('\n')
    const seen = new Set<string>()
    const normalizedLines = lines
        .map(line => {
            const match = line.match(/^\s*import\s+(['"])([^'"]+)\1\s*;?\s*$/)
            if (!match) return line
            let importPath = match[2]
            if (importPath === '.bo$$' || importPath === './.bo$$' || importPath === '.bo$$/styles.css') {
                importPath = './.bo$$'
            } else if (importPath === '.bo$' || importPath === './.bo$') {
                importPath = './.bo$$'
            }
            if (importPath === './.bo$$') {
                if (seen.has(importPath)) return ''
                seen.add(importPath)
                return replacement
            }
            return line
        })
        .filter(line => line !== '')
    return normalizedLines.join('\n')
}

const stripUnmanagedBossImports = (content: string) => {
    return content
        .split('\n')
        .filter(line => !line.match(/^\s*import\s+['"](\.\/)?\.bo\$\$(\/styles\.css)?['"]\s*;?\s*$/))
        .join('\n')
}

const insertManagedBlock = (content: string, lines: string[]) => {
    const blockLines = buildManagedBlock(lines).split('\n')
    const output = content.split('\n')
    const insertIndex = getImportInsertIndex(output)
    const needsBlankLine = insertIndex < output.length && output[insertIndex].trim() !== ''
    const insertLines = needsBlankLine ? [...blockLines, ''] : blockLines
    output.splice(insertIndex, 0, ...insertLines)
    return ensureManagedBlockNewline(output.join('\n'))
}

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const hasImportPath = (content: string, importPath: string) => {
    const escaped = escapeRegExp(importPath)
    return new RegExp(`['"]${escaped}['"]`).test(content)
}

const insertImports = (content: string, importLines: string[]) => {
    const lines = content.split('\n')
    const insertIndex = getImportInsertIndex(lines)
    const needsBlankLine = insertIndex < lines.length && lines[insertIndex].trim() !== ''
    const insertLines = needsBlankLine ? [...importLines, ''] : importLines
    lines.splice(insertIndex, 0, ...insertLines)
    return lines.join('\n')
}

const getImportInsertIndex = (lines: string[]) => {
    let index = 0
    while (index < lines.length) {
        const trimmed = lines[index].trim()
        if (!trimmed) {
            index += 1
            continue
        }
        if (
            trimmed.startsWith('//') ||
            trimmed.startsWith('/*') ||
            trimmed.startsWith('*') ||
            trimmed.startsWith('*/') ||
            /^['"]use (client|strict)['"];?$/.test(trimmed)
        ) {
            index += 1
            continue
        }
        break
    }
    return index
}

const generateRuntime = async ({
    outputDir,
    configFolder,
    pluginState,
    contentGlobs,
    globalsEnabled,
    cssAutoLoad,
    selectedStrategyId,
    overwriteConfigDir,
}: {
    outputDir: string
    configFolder: string
    pluginState: Array<PluginOption & { enabled: boolean }>
    contentGlobs: string[]
    globalsEnabled: boolean
    cssAutoLoad: boolean
    selectedStrategyId: string
    overwriteConfigDir: boolean
}) => {
    if (selectedStrategyId === 'classname-only') return
    const enabledPlugins = pluginState.filter(plugin => plugin.enabled)
    const hasJsxPlugin = enabledPlugins.some(plugin => plugin.id === 'jsx')
    const modules = enabledPlugins.map(plugin => PLUGIN_MODULES[plugin.id]).filter(Boolean)

    if (hasJsxPlugin) {
        jsxPlugin?.settings?.set?.('emitRuntime', true)
    }
    if (enabledPlugins.some(plugin => plugin.id === 'inline-first')) {
        inlineFirstPlugin?.settings?.set?.('emitRuntime', true)
    }
    if (enabledPlugins.some(plugin => plugin.id === 'classname-first')) {
        classnameFirstPlugin?.settings?.set?.('emitRuntime', true)
    }

    const api = await createApi(
        {
            folder: configFolder,
            plugins: modules,
            content: contentGlobs,
            jsx: hasJsxPlugin ? { globals: globalsEnabled } : undefined,
            css: cssAutoLoad ? undefined : { autoLoad: false },
        },
        true,
    )

    const jsText = api.file.js.text
    if (jsText) {
        await writeFile(path.join(outputDir, api.file.js.options.path), jsText, overwriteConfigDir)
        const dtsText = api.file.js.dts.text
        if (dtsText) {
            await writeFile(path.join(outputDir, api.file.js.dts.options.path), dtsText, overwriteConfigDir)
        }
    }

    if (api.file.native?.hasContent) {
        const nativeText = api.file.native.text
        if (nativeText) {
            await writeFile(path.join(outputDir, api.file.native.options.path), nativeText, overwriteConfigDir)
            const nativeDtsText = api.file.native.dts.text
            if (nativeDtsText) {
                await writeFile(
                    path.join(outputDir, api.file.native.dts.options.path),
                    nativeDtsText,
                    overwriteConfigDir,
                )
            }
        }
    }

}

const warnIfPostcssPluginMissing = async (configFilePath: string) => {
    const config = await fs.readFile(configFilePath, 'utf-8')
    if (config.includes('boss-css/postcss')) return
    log.warn(
        `PostCSS config detected at ${path.relative(process.cwd(), configFilePath)} but boss-css/postcss is missing.`,
    )
    log.message('Add boss-css/postcss to your PostCSS plugins to enable Boss CSS.')
}

const updatePostcssConfigFile = async (
    configFilePath: string,
    options: {
        dirDependencies: boolean
        useOptions: boolean
    },
) => {
    const content = await fs.readFile(configFilePath, 'utf-8')
    const update = updatePostcssConfigContent(content, configFilePath, options)
    if (update.updated) {
        await fs.writeFile(configFilePath, update.content)
    }
    return update
}

const updatePostcssConfigContent = (
    content: string,
    configFilePath: string,
    options: {
        dirDependencies: boolean
        useOptions: boolean
    },
) => {
    const hasBoss = content.includes('boss-css/postcss')
    const hasBossCall = /\bboss\s*\(/.test(content)
    const isEsm =
        configFilePath.endsWith('.mjs') || /\bexport\s+default\b/.test(content) || /\bimport\b/.test(content)

    const arrayMatch = content.match(/plugins\s*:\s*\[/)
    const objectMatch = content.match(/plugins\s*:\s*\{/)
    const useOptions = options.useOptions

    const bossCall = useOptions ? `boss({ dirDependencies: ${options.dirDependencies ? 'true' : 'false'} })` : 'boss()'
    const bossObject = useOptions ? `{ dirDependencies: ${options.dirDependencies ? 'true' : 'false'} }` : '{}'
    const managedEntry = bossCall

    if (arrayMatch) {
        let nextContent = content
        const managedLines = [`${managedEntry},`]
        const replaced = replaceManagedBlock(nextContent, managedLines)
        if (replaced.found) {
            nextContent = ensureBossImport(replaced.content, isEsm)
            return { updated: nextContent !== content, content: nextContent, hasBoss: true }
        }

        const replacedArray = replaceBossPluginInArray(nextContent, arrayMatch, bossCall)
        if (replacedArray.updated) {
            nextContent = ensureBossImport(replacedArray.content, isEsm)
            return { updated: nextContent !== content, content: nextContent, hasBoss: true }
        }

        if (!hasBoss && !hasBossCall) {
            if (arrayMatch.index == null) return { updated: false, content, hasBoss: hasBoss || hasBossCall }
            const insertAt = arrayMatch.index + arrayMatch[0].length
            const indent = getIndentFromIndex(content, arrayMatch.index)
            const entryIndent = `${indent}  `
            const block = buildManagedBlock(managedLines, entryIndent)
            nextContent = `${content.slice(0, insertAt)}\n${block}${content.slice(insertAt)}`
            nextContent = ensureBossImport(nextContent, isEsm)
            return { updated: nextContent !== content, content: nextContent, hasBoss: true }
        }

        if (hasBossCall) {
            nextContent = ensureBossImport(nextContent, isEsm)
            return { updated: nextContent !== content, content: nextContent, hasBoss: true }
        }

        return { updated: false, content, hasBoss: hasBoss || hasBossCall }
    }

    if (objectMatch) {
        let nextContent = content
        const entry = useOptions ? bossObject : '{}'
        const managedLines = [`'boss-css/postcss': ${entry},`]
        const replaced = replaceManagedBlock(nextContent, managedLines)
        if (replaced.found) {
            return { updated: replaced.content !== content, content: replaced.content, hasBoss: true }
        }
        const objectEntryRegex = /['"]boss-css\/postcss['"]\s*:\s*[^,}]+/
        if (hasBoss) {
            if (useOptions && objectEntryRegex.test(nextContent)) {
                nextContent = nextContent.replace(objectEntryRegex, `'boss-css/postcss': ${entry}`)
            }
            return { updated: nextContent !== content, content: nextContent, hasBoss: true }
        }

        if (objectMatch.index == null) return { updated: false, content, hasBoss }
        const insertAt = objectMatch.index + objectMatch[0].length
        const indent = getIndentFromIndex(content, objectMatch.index)
        const entryIndent = `${indent}  `
        const block = buildManagedBlock(managedLines, entryIndent)
        nextContent = `${content.slice(0, insertAt)}\n${block}${content.slice(insertAt)}`

        return { updated: nextContent !== content, content: nextContent, hasBoss: true }
    }

    return { updated: false, content, hasBoss: hasBoss || hasBossCall }
}

const replaceBossPluginInArray = (content: string, arrayMatch: RegExpMatchArray, bossCall: string) => {
    if (arrayMatch.index === undefined) return { updated: false, content }
    const arrayIndex = arrayMatch.index + arrayMatch[0].lastIndexOf('[')
    const arrayEnd = findMatchingIndex(content, arrayIndex, '[', ']')
    if (arrayEnd === -1) return { updated: false, content }
    const arrayBody = content.slice(arrayIndex + 1, arrayEnd)
    const replacedBody = arrayBody.replace(/['"]boss-css\/postcss['"]/, bossCall)
    if (replacedBody === arrayBody) return { updated: false, content }
    const next = `${content.slice(0, arrayIndex + 1)}${replacedBody}${content.slice(arrayEnd)}`
    return { updated: next !== content, content: next }
}

const ensureBossImport = (content: string, isEsm: boolean) => {
    if (content.includes('boss-css/postcss')) {
        const hasBossImport = isEsm
            ? /import\s+boss\s+from\s+['"]boss-css\/postcss['"]/.test(content)
            : /const\s+boss\s*=\s*require\(['"]boss-css\/postcss['"]\)/.test(content)
        if (hasBossImport) return content
    }

    if (isEsm) {
        if (content.includes('import boss from')) return content
        return `import boss from 'boss-css/postcss'\n${content}`
    }
    if (content.includes('const boss = require')) return content
    return `const boss = require('boss-css/postcss')\n${content}`
}

const getIndentFromIndex = (content: string, index: number) => {
    const lineStart = content.lastIndexOf('\n', index)
    const line = content.slice(lineStart + 1)
    const match = line.match(/^\s+/)
    return match ? match[0] : ''
}

const confirmOverwriteIfExists = async (dirPath: string, yes: boolean, overwrite?: boolean) => {
    if (!(await exists(dirPath))) return 'overwrite' as const
    if (overwrite === false) return 'merge' as const
    if (overwrite === true) return 'overwrite' as const
    if (yes) return 'overwrite' as const
    const shouldOverwrite = await confirm({
        message: `Existing ${path.basename(dirPath)} folder detected. Overwrite its contents? (No keeps existing files)`,
        initialValue: false,
    })
    cancelIf(shouldOverwrite)
    return shouldOverwrite ? ('overwrite' as const) : ('merge' as const)
}

const readPackageJson = async (
    cwd: string,
): Promise<{ data: PackageJson | null; indent: string; newline: string }> => {
    const filePath = path.join(cwd, 'package.json')
    if (!(await exists(filePath))) return { data: null, indent: '  ', newline: '\n' }
    const raw = await fs.readFile(filePath, 'utf-8')
    const data = parseJson(raw, { filePath, allowTrailingCommas: true }) as PackageJson
    return { data, indent: detectIndent(raw), newline: raw.endsWith('\n') ? '\n' : '' }
}

const writePackageJson = async (cwd: string, data: PackageJson, indent: string, newline: string) => {
    const filePath = path.join(cwd, 'package.json')
    const output = JSON.stringify(data, null, indent) + (newline || '\n')
    await fs.writeFile(filePath, output)
}

const writeFile = async (filePath: string, content: string, overwrite = true) => {
    await fs.mkdir(path.dirname(filePath), { recursive: true })
    if (!overwrite) {
        try {
            await fs.access(filePath)
            return
        } catch {
            // file does not exist, proceed
        }
    }
    await fs.writeFile(filePath, content.trimEnd() + '\n')
}

const ensureFile = async (filePath: string) => {
    if (await exists(filePath)) return
    await fs.writeFile(filePath, '')
}

const detectIndent = (raw: string) => {
    const match = raw.match(/^[\t ]+(?=")/m)
    return match ? match[0] : '  '
}

const hasDependency = (packageJson: PackageJson, name: string) => {
    return Boolean(packageJson.dependencies?.[name] || packageJson.devDependencies?.[name])
}

const resolveBossCssVersion = async () => {
    const root = path.resolve(__dirname, '..', '..', '..')
    const filePath = path.join(root, 'package.json')
    try {
        const raw = await fs.readFile(filePath, 'utf8')
        const data = parseJson(raw, { filePath, allowTrailingCommas: true }) as { version?: unknown }
        if (typeof data?.version === 'string' && data.version.trim()) {
            return data.version.trim()
        }
    } catch {
        // fall back to latest
    }
    return 'latest'
}

const detectPackageManager = async (cwd: string, runtimeType: RuntimeType): Promise<PackageManagerType> => {
    const agent = process.env.npm_config_user_agent
    if (agent) {
        const name = agent.split('/')[0]
        if (name === PackageManagerType.PNPM) return PackageManagerType.PNPM
        if (name === PackageManagerType.YARN) return PackageManagerType.YARN
        if (name === PackageManagerType.BUN) return PackageManagerType.BUN
        if (name === PackageManagerType.NPM) return PackageManagerType.NPM
    }

    if (runtimeType === RuntimeType.DENO) return PackageManagerType.NPM

    const candidates: Array<[string, PackageManagerType]> = [
        ['pnpm-lock.yaml', PackageManagerType.PNPM],
        ['yarn.lock', PackageManagerType.YARN],
        ['bun.lockb', PackageManagerType.BUN],
        ['package-lock.json', PackageManagerType.NPM],
    ]

    for (const [file, manager] of candidates) {
        if (await exists(path.join(cwd, file))) return manager
    }

    return PackageManagerType.NPM
}

const formatInstallCommand = (manager: PackageManagerType) => {
    switch (manager) {
        case PackageManagerType.PNPM:
            return 'pnpm install'
        case PackageManagerType.YARN:
            return 'yarn install'
        case PackageManagerType.BUN:
            return 'bun install'
        case PackageManagerType.NPM:
        default:
            return 'npm install'
    }
}

const exists = async (filePath: string) => {
    try {
        await fs.access(filePath)
        return true
    } catch {
        return false
    }
}

const logInitSummary = ({
    configDir,
    isNext,
    postcssMode,
    postcssDetection,
    configFolder,
    srcRoot,
    globalsEnabled,
    eslintUpdated,
    useEslintPlugin,
    frameworkId,
    selectedStrategyId,
    cssAutoLoad,
    installCommand,
}: {
    configDir: string
    isNext: boolean
    postcssMode: PostcssMode
    postcssDetection: PostcssDetection
    configFolder: string
    srcRoot: string
    globalsEnabled: boolean
    eslintUpdated: boolean
    useEslintPlugin: boolean
    frameworkId?: string
    selectedStrategyId: string
    cssAutoLoad: boolean
    installCommand: string | null
}) => {
    log.info('boss init complete.')
    log.message(`Generated Boss CSS config in ${configDir}`)
    if (selectedStrategyId === 'classname-only') {
        log.message('Classname-only does not auto-load styles. Import styles.css manually.')
    }

    if (postcssMode === 'manual' && !postcssDetection.hasDependency) {
        log.message('Manual PostCSS setup needed:')
        log.message('1) Install PostCSS (npm install -D postcss).')
        log.message("2) Add postcss.config.js with { plugins: { 'boss-css/postcss': {} } }.")
    }

    if (installCommand) {
        log.message(`Install dependencies before running the app: ${installCommand}`)
    }

    if (isNext) {
        log.message('Next.js note:')
        if (selectedStrategyId === 'classname-only') {
            log.message('- Classname-only mode skips instrumentation.')
            log.message("- Import Boss styles manually in your root layout (e.g. `import '../.bo$$/styles.css'`).")
        } else {
            log.message('- Updated instrumentation files with Boss CSS imports.')
            log.message('Boss PostCSS auto-disables dirDependencies when a Turbopack env flag is set.')
            if (!cssAutoLoad) {
                log.message('- css.autoLoad is false.')
                log.message("- Import Boss styles manually in your root layout (e.g. `import '../.bo$$/styles.css'`).")
            }
        }
    } else {
        const importRoot = normalizeImportPath(path.relative(srcRoot, configDir))
        const importStyles = normalizeImportPath(path.join(importRoot, 'styles.css'))
        if (selectedStrategyId === 'classname-only') {
            log.message('Add the generated stylesheet to your app entrypoint (e.g. src/main.tsx):')
            log.message(`import '${importStyles}'`)
        } else if (!cssAutoLoad) {
            log.message('Add these to your app entrypoint (e.g. src/main.tsx):')
            log.message(`import '${importRoot}'`)
            log.message(`import '${importStyles}'`)
        } else {
            log.message('Add this to your app entrypoint (e.g. src/main.tsx):')
            log.message(`import '${importRoot}'`)
        }
    }

    if (frameworkId === 'stencil') {
        log.message('Stencil note:')
        log.message('- PostCSS setup is skipped; run `npx boss-css watch` for CSS generation.')
    }

    if (globalsEnabled) {
        log.message('Global $$ enabled for JSX usage.')
    }
    if (eslintUpdated) {
        log.message(useEslintPlugin ? 'ESLint updated with Boss CSS plugin.' : 'ESLint updated with $$ globals.')
    }
}

export default init
