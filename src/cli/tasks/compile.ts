import { log } from '@clack/prompts'

import { runCompile } from '@/tasks/compile'

import type { TaskFn, Tasks } from '@/cli/types'

type CompileStatsMode = false | 'quick' | 'detailed'
type CompileStats = {
    outputMode: 'prod' | 'temp'
    outputDir: string
    runtimeFree: boolean
    runtimeFiles: string[]
    valueHelperFiles: string[]
    filesProcessed: number
    filesCopied: number
    filesSkipped: number
    filesTotal: number
    elementsReplaced: number
    durationMs: number
    cssBytes: number
    cssWritten: boolean
    stylesheetPath: string | null
}

const compile: TaskFn = async config => {
    return [
        {
            prompt: async () => {
                const { argv, userConfig } = config
                const isProd = argv.prod === true || process.env.NODE_ENV === 'production'
                const compileConfig: (typeof userConfig.compile) & Record<string, unknown> = {
                    ...(userConfig.compile ?? {}),
                }
                const reservedKeys = new Set(['_', '--', 'prod'])

                for (const [key, value] of Object.entries(argv)) {
                    if (reservedKeys.has(key)) continue
                    compileConfig[key] = coerceArgValue(value)
                }

                if ((compileConfig.stats as unknown) === true) {
                    compileConfig.stats = 'quick'
                }

                log.info(`boss compile ${isProd ? '(inline)' : '(temp)'} starting...`)

                const result = await runCompile({
                    config: {
                        ...userConfig,
                        compile: compileConfig,
                    },
                    prod: isProd,
                })

                log.message(`boss compile ${isProd ? 'inline' : 'temp'} output ready.`)

                if (result.statsMode) {
                    log.message(formatStats(result.statsMode, result.stats))
                }
                return true
            },
        },
    ] as Tasks
}

const formatStats = (mode: CompileStatsMode, stats: CompileStats) => {
    const duration = formatDuration(stats.durationMs)
    const outputMode = stats.outputMode === 'prod' ? 'inline' : 'temp'
    const runtimeFiles = stats.runtimeFiles.length
    const valueHelperFiles = stats.valueHelperFiles.length
    const lines = [
        `boss compile stats (${mode})`,
        `Mode: ${outputMode}`,
        `Runtime free: ${stats.runtimeFree ? 'yes' : 'no'}`,
    ]

    if (mode === 'quick') {
        lines.push(
            `Runtime files: ${runtimeFiles}`,
            `Files processed: ${stats.filesProcessed}`,
            `Elements replaced: ${stats.elementsReplaced}`,
            `Time: ${duration}`,
        )
        return lines.join('\n')
    }

    lines.push(
        ...formatList('Runtime files', stats.runtimeFiles),
        `Files processed: ${stats.filesProcessed}`,
        `Files copied: ${stats.filesCopied}`,
        `Files skipped: ${stats.filesSkipped}`,
        `Files total: ${stats.filesTotal}`,
        `Elements replaced: ${stats.elementsReplaced}`,
        ...formatList('Value helper files', stats.valueHelperFiles),
        `CSS output: ${stats.cssWritten ? `${stats.stylesheetPath} (${stats.cssBytes} bytes)` : 'none'}`,
        `Output dir: ${stats.outputDir}`,
        `Time: ${duration}`,
    )

    return lines.join('\n')
}

const formatDuration = (ms: number) => {
    if (ms < 1000) {
        return `${ms.toFixed(1)}ms`
    }
    if (ms < 60_000) {
        return `${(ms / 1000).toFixed(2)}s`
    }
    return `${(ms / 60_000).toFixed(2)}m`
}

const formatList = (label: string, items: string[]) => {
    if (!items.length) {
        return [`${label}: none`]
    }
    return [`${label} (${items.length}):`, ...items.map(item => `- ${item}`)]
}

const coerceArgValue = (value: unknown) => {
    if (value === 'true') return true
    if (value === 'false') return false
    return value
}

export default compile
