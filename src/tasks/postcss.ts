import path from 'node:path'
import postcss from 'postcss'

import { createApi } from '@/api/server'
import { loadConfig } from '@/api/config'
import { resolveBoundaryOutputs } from '@/shared/boundaries'
import { resolveContentPaths } from '@/shared/file'
import { cache, setCache } from '@/transform/cache'
import processFile from '@/transform/processFile'
import { emitSession, resolveSessionPayload } from '@/tasks/session'

const configPromises = new Map<string, ReturnType<typeof loadConfig> | Promise<any>>()
const apiCache = new Map<string, Promise<{ api: any }>>()
const knownFiles = new Map<string, Set<string>>()
const runQueues = new Map<string, Promise<void>>()
const sessionStarted = new Set<string>()

export type BossPostcssOptions = {
    baseDir?: string
    dirDependencies?: boolean
}

const formatBoundaryLines = (boundaryFiles: string[], baseDir: string) => {
    if (!boundaryFiles.length) return '- (none)'
    return boundaryFiles
        .map(file => {
            const relative = path.relative(baseDir, file).replace(/\\/g, '/')
            return `- ${relative || file}`
        })
        .join('\n')
}

const isTruthyEnv = (value?: string) => Boolean(value) && value !== '0' && value !== 'false'
const isTurbopackEnv = () =>
    [
        process.env.TURBOPACK,
        process.env.__NEXT_TURBOPACK,
        process.env.__NEXT_TURBOPACK__,
        process.env.NEXT_TURBOPACK,
    ].some(isTruthyEnv)

const resolveConfig = (baseDir?: string) => {
    const key = baseDir ?? '__default__'
    if (!configPromises.has(key)) {
        configPromises.set(key, loadConfig(baseDir))
    }
    return configPromises.get(key) as Promise<Awaited<ReturnType<typeof loadConfig>>>
}

const resolveApi = async (baseDir?: string) => {
    const key = baseDir ?? '__default__'
    if (!apiCache.has(key)) {
        apiCache.set(
            key,
            (async () => {
                const config = await resolveConfig(baseDir)
                const api = await createApi(config, true)
                api.baseDir = baseDir ?? process.cwd()
                return { api }
            })(),
        )
    }
    return apiCache.get(key) as Promise<{ api: any }>
}

export const runPostcss = async (root: postcss.Root, result: postcss.Result, options: BossPostcssOptions = {}) => {
    const dirDependencies = options.dirDependencies ?? !isTurbopackEnv()
    const baseDir = options.baseDir
    const { messages } = result
    const config = await resolveConfig(baseDir)
    const { api } = await resolveApi(baseDir)
    const { content, stylesheetPath } = api

    const queueKey = baseDir ?? '__default__'
    const previous = runQueues.get(queueKey) ?? Promise.resolve()
    const run = previous
        .catch(() => {})
        .then(async () => {
            const inputFile = root.source?.input?.file
            const fromFile = result.opts?.from
            const filePath =
                typeof inputFile === 'string'
                    ? inputFile
                    : typeof fromFile === 'string'
                      ? fromFile
                      : undefined
            const resolvedFile = filePath ? path.resolve(filePath) : null
            const resolvedStylesheet = path.resolve(stylesheetPath)
            if (resolvedFile && resolvedFile !== resolvedStylesheet && !resolvedFile.endsWith('.boss.css')) {
                return
            }

            if (!sessionStarted.has(queueKey)) {
                sessionStarted.add(queueKey)
                const sessionStart = await resolveSessionPayload(baseDir ?? process.cwd(), config, 'postcss', 'start')
                await emitSession(api, sessionStart)
            }
            const sessionRun = await resolveSessionPayload(baseDir ?? process.cwd(), config, 'postcss', 'run')
            await emitSession(api, sessionRun)

            const paths = await resolveContentPaths(content)
            const resolvedPaths = paths.map(entry => path.resolve(entry))
            const previousFiles = knownFiles.get(queueKey) ?? new Set<string>()
            const nextFiles = new Set(resolvedPaths)

            for (const file of previousFiles) {
                if (!nextFiles.has(file)) {
                    api.css?.removeSource?.(file)
                    cache.delete(file)
                }
            }

            knownFiles.set(queueKey, nextFiles)

            const promises: Array<ReturnType<typeof processFile>> = []
            resolvedPaths.forEach(file => {
                if (!cache.has(file)) {
                    messages.push({ type: 'dependency', file })
                }

                if (dirDependencies) {
                    const dir = path.dirname(file)
                    if (!cache.has(dir)) {
                        messages.push({ type: 'dir-dependency', dir })
                        setCache(dir, { isFile: false })
                    }
                }

                promises.push(processFile(file))
            })

            const processedFiles = await Promise.allSettled(promises)

            const onParseTasks: Array<{ filePath: string; promise: ReturnType<typeof api.trigger> }> = []
            for (const settled of processedFiles) {
                if (settled.status !== 'fulfilled') continue
                const processed = settled.value
                const value = processed?.value
                if (!value || !processed?.changed) continue
                const changedPath = value.path ? path.resolve(value.path) : null
                if (changedPath) {
                    api.css?.removeSource?.(changedPath)
                }
                const sourcePath = changedPath ?? value.path ?? '(unknown file)'
                onParseTasks.push({
                    filePath: sourcePath,
                    promise: api.trigger('onParse', value),
                })
            }
            const onParseResults = await Promise.allSettled(onParseTasks.map(task => task.promise))
            onParseResults.forEach((parseResult, index) => {
                if (parseResult.status !== 'rejected') return
                const task = onParseTasks[index]
                const relativePath = path.relative(baseDir ?? process.cwd(), task.filePath)
                const sourceLabel = relativePath && !relativePath.startsWith('..') ? relativePath : task.filePath
                const reason =
                    parseResult.reason instanceof Error
                        ? parseResult.reason.message
                        : String(parseResult.reason ?? 'Unknown parsing error')

                result.warn(`[boss-css] Failed parsing ${sourceLabel}: ${reason}`, {
                    plugin: 'boss-postcss-plugin',
                })
            })

            const boundaryResult = await resolveBoundaryOutputs(api, {
                rootDir: baseDir ?? process.cwd(),
                stylesheetPath,
                boundaries: config.css?.boundaries,
            })
            await api.trigger('onMetaData', {
                kind: 'ai',
                replace: true,
                data: {
                    section: 'boundaries',
                    title: 'CSS boundaries',
                    content: formatBoundaryLines(boundaryResult.boundaryFiles, baseDir ?? process.cwd()),
                },
            })

            const outputs = new Map(
                boundaryResult.outputs.map(output => [path.resolve(output.path), output.text]),
            )
            const outputText = outputs.get(resolvedFile ?? resolvedStylesheet)

            if (outputText !== undefined) {
                result.root = postcss.parse(outputText, result.opts)
            }

            if (api.strategy !== 'classname-only') {
                await api.file.js.write()
                if (api.file.native?.hasContent) {
                    await api.file.native.write()
                }
            }
        })

    runQueues.set(queueKey, run)
    await run
}
