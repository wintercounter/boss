import fs from 'node:fs/promises'
import path from 'node:path'

import { transform as transformCss } from 'lightningcss'

import { createApi } from '@/api/server'
import { resolveBoundaryOutputs } from '@/shared/boundaries'
import { resolveContentPaths } from '@/shared/file'
import { getClassNameProp } from '@/shared/framework'
import type { CompileConfig, UserConfig } from '@/shared/types'
import { emitSession, resolveSessionPayload } from '@/tasks/session'

import {
    collectBossClassTokensInSource,
    collectBossClassTokensInText,
    rewriteClassNameTokensInSource,
    rewriteClassNameTokensInText,
} from '@/compile/classname'
import { createClassNameMapper, type ClassNameMapper, type ClassNameStrategy } from '@/compile/classname-strategy'
import type { PreparedDefinition } from '@/compile/jsx'
import { scanPrepared } from '@/compile/prepared'
import { transformSource } from '@/compile/transform'

type CompileRunOptions = {
    config: UserConfig
    prod: boolean
}

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

type CompileResult = {
    statsMode: CompileStatsMode
    stats: CompileStats
}

const supportedExtensions = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'])

export async function compileProject(options: CompileRunOptions): Promise<CompileResult> {
    const { config, prod } = options
    const compileConfig: CompileConfig = { stats: 'quick', ...(config.compile ?? {}) }
    const content = config.content
    const baseDir = process.cwd()

    if (!content) {
        throw new Error('compile: config.content is required')
    }

    const root = baseDir
    const tempOutDir = compileConfig.tempOutDir
    if (!prod && !tempOutDir) {
        throw new Error('compile.tempOutDir is required when not running in prod mode.')
    }

    const outputRoot = prod ? root : path.resolve(root, tempOutDir!)
    const inputPaths = (await resolveContentPaths(content)).sort()
    const sourceCache = new Map<string, string>()
    const preparedByFile = new Map<string, Map<string, { definition: PreparedDefinition; inlineable: boolean }>>()
    const preparedRegistry = new Map<string, { definition: PreparedDefinition; inlineable: boolean }>()
    const preparedUsages: { name: string; hasSpread: boolean; file: string }[] = []
    const api = await createApi(config, true)
    api.baseDir = baseDir
    const classNameStrategy = (compileConfig as { classNameStrategy?: ClassNameStrategy }).classNameStrategy ?? false
    const classNameMapper: ClassNameMapper | null = classNameStrategy
        ? createClassNameMapper({ strategy: classNameStrategy, prefix: api.selectorPrefix ?? '' })
        : null
    if (classNameMapper) {
        const baseContextToClassName = api.contextToClassName
        api.contextToClassName = (name, value, contexts, escape = true, _prefix = '') => {
            const raw = baseContextToClassName(name, value, contexts, false, '')
            const mapped = classNameMapper.getOrCreate(raw)
            if (!escape) return mapped
            return api.camelCaseToDash(api.escapeClassName(mapped))
        }
        const baseClassTokenToSelector = api.classTokenToSelector
        api.classTokenToSelector = token => baseClassTokenToSelector(classNameMapper.getOrCreate(token))
    }
    const sessionStart = await resolveSessionPayload(baseDir, config, 'compile', 'start')
    await emitSession(api, sessionStart)
    await emitSession(api, { ...sessionStart, phase: 'run' })

    const statsMode: CompileStatsMode = compileConfig.stats ?? 'quick'
    const start = process.hrtime.bigint()
    const fileResults: Array<{
        file: string
        processed: boolean
        copied: boolean
        needsRuntime: boolean
        needsValueHelper: boolean
        replacedElements: number
    }> = []

    for (const inputPath of inputPaths) {
        const stat = await fs.stat(inputPath).catch(() => null)
        if (!stat?.isFile()) continue

        const ext = path.extname(inputPath)

        const source = await fs.readFile(inputPath, 'utf8')
        sourceCache.set(inputPath, source)
        if (classNameMapper) {
            const tokens = supportedExtensions.has(ext)
                ? collectBossClassTokensInSource(source, { filename: inputPath, api })
                : collectBossClassTokensInText(source, { api })
            tokens.forEach(token => classNameMapper.getOrCreate(token))
        }

        if (!supportedExtensions.has(ext)) continue

        const isTs = ext === '.ts' || ext === '.tsx'
        const isJsx = ext === '.jsx' || ext === '.tsx' || ext === '.js' || ext === '.mjs' || ext === '.cjs'
        const scan = scanPrepared(source, { isTs, isJsx })

        if (scan.definitions.length) {
            const local = new Map<string, { definition: PreparedDefinition; inlineable: boolean }>()
            for (const definition of scan.definitions) {
                local.set(definition.name, {
                    definition: definition.definition,
                    inlineable: definition.inlineable,
                })
                preparedRegistry.set(definition.name, {
                    definition: definition.definition,
                    inlineable: definition.inlineable,
                })
            }
            preparedByFile.set(inputPath, local)
        }

        if (scan.usages.length) {
            for (const usage of scan.usages) {
                preparedUsages.push({ ...usage, file: inputPath })
            }
        }
    }

    const preparedGlobal = new Map<string, PreparedDefinition>()
    for (const [name, entry] of preparedRegistry.entries()) {
        if (entry.inlineable) {
            preparedGlobal.set(name, entry.definition)
        }
    }

    const preparedRuntime = new Set<string>()
    for (const usage of preparedUsages) {
        if (!compileConfig.spread && usage.hasSpread) {
            preparedRuntime.add(usage.name)
            continue
        }

        const local = preparedByFile.get(usage.file)?.get(usage.name)
        if (local) continue

        const global = preparedRegistry.get(usage.name)
        if (global?.inlineable) continue

        preparedRuntime.add(usage.name)
    }

    const processFile = async (inputPath: string) => {
        const stat = await fs.stat(inputPath).catch(() => null)
        if (!stat?.isFile()) return

        const ext = path.extname(inputPath)
        const relativePath = path.relative(root, inputPath)
        const outputPath = prod ? inputPath : path.join(outputRoot, relativePath)

        await fs.mkdir(path.dirname(outputPath), { recursive: true })

        const source = sourceCache.get(inputPath) ?? (await fs.readFile(inputPath, 'utf8'))

        if (!supportedExtensions.has(ext)) {
            const parseContent = rewriteClassNameTokensInText(source, {
                mapToken: classNameMapper ? () => undefined : undefined,
            })
            await api.trigger(
                'onParse',
                { content: parseContent, path: inputPath },
                plugin => plugin.name === 'classname',
            )

            if (!prod) {
                if (classNameMapper) {
                    const rewritten = rewriteClassNameTokensInText(source, {
                        mapToken: token => classNameMapper.get(token),
                    })
                    await fs.writeFile(outputPath, rewritten, 'utf8')
                } else {
                    await fs.copyFile(inputPath, outputPath)
                }
            }
            fileResults.push({
                file: inputPath,
                processed: false,
                copied: !prod,
                needsRuntime: false,
                needsValueHelper: false,
                replacedElements: 0,
            })
            return
        }

        const classNameSource = rewriteClassNameTokensInSource(source, {
            filename: inputPath,
            classNameProp: getClassNameProp(api.framework),
            mapToken: classNameMapper ? () => undefined : undefined,
        })
        await api.trigger(
            'onParse',
            { content: classNameSource, path: inputPath },
            plugin => plugin.name === 'classname',
        )

        const transformed = await transformSource(source, {
            api,
            compile: compileConfig,
            filename: inputPath,
            preparedGlobal,
            preparedLocal: new Map(
                Array.from(preparedByFile.get(inputPath)?.entries() ?? []).map(([key, value]) => [
                    key,
                    value.definition,
                ]),
            ),
            preparedRuntime,
            classNameMapper,
        })

        fileResults.push({
            file: inputPath,
            processed: true,
            copied: false,
            needsRuntime: transformed.needsRuntime,
            needsValueHelper: transformed.needsValueHelper,
            replacedElements: transformed.replacedElements,
        })

        await fs.writeFile(outputPath, transformed.code, 'utf8')
    }

    const isSequentialStrategy = classNameStrategy === 'shortest' || classNameStrategy === 'unicode'
    if (isSequentialStrategy) {
        for (const inputPath of inputPaths) {
            await processFile(inputPath)
        }
    } else {
        await Promise.all(inputPaths.map(processFile))
    }

    let cssBytes = 0
    let cssWritten = false
    let stylesheetPath: string | null = null
    const runtimeOnly = config.runtime?.only === true
    const runtimeGlobals = runtimeOnly ? (config.runtime?.globals ?? 'inline') : 'file'
    const shouldWriteCss = !prod && (!runtimeOnly || runtimeGlobals === 'file')
    if (shouldWriteCss && api.css.text.trim()) {
        const resolvedStylesheetPath =
            config.stylesheetPath ?? path.join(root, config.configDir ?? '.bo$$', 'styles.css')
        const boundaryResult = await resolveBoundaryOutputs(api, {
            rootDir: root,
            stylesheetPath: resolvedStylesheetPath,
            boundaries: config.css?.boundaries,
        })

        const outputs = boundaryResult.outputs.map(output => {
            const relative = path.relative(root, output.path)
            const resolvedPath = path.join(outputRoot, relative)
            return { path: resolvedPath, text: output.text }
        })

        const globalOutputPath = path.resolve(path.join(outputRoot, path.relative(root, resolvedStylesheetPath)))

        const outputSizes = new Map<string, number>()
        for (const output of outputs) {
            const minified = transformCss({
                code: Buffer.from(output.text),
                filename: output.path,
                minify: true,
            })
            await fs.mkdir(path.dirname(output.path), { recursive: true })
            await fs.writeFile(output.path, minified.code.toString(), 'utf8')
            outputSizes.set(path.resolve(output.path), minified.code.length)
        }

        const globalOutput = outputs.find(output => path.resolve(output.path) === globalOutputPath)
        cssBytes = globalOutput ? outputSizes.get(path.resolve(globalOutput.path)) ?? 0 : 0
        cssWritten = true
        stylesheetPath = globalOutput?.path ?? globalOutputPath
    }

    const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000
    const runtimeFiles = fileResults.filter(result => result.needsRuntime).map(result => result.file)
    const valueHelperFiles = fileResults.filter(result => result.needsValueHelper).map(result => result.file)
    const filesProcessed = fileResults.filter(result => result.processed).length
    const filesCopied = fileResults.filter(result => result.copied).length
    const filesTotal = fileResults.length
    const filesSkipped = filesTotal - filesProcessed - filesCopied
    const elementsReplaced = fileResults.reduce((total, result) => total + result.replacedElements, 0)

    const result: CompileResult = {
        statsMode,
        stats: {
            outputMode: prod ? 'prod' : 'temp',
            outputDir: outputRoot,
            runtimeFree: runtimeFiles.length === 0,
            runtimeFiles: runtimeFiles.map(file => path.relative(root, file)),
            valueHelperFiles: valueHelperFiles.map(file => path.relative(root, file)),
            filesProcessed,
            filesCopied,
            filesSkipped,
            filesTotal,
            elementsReplaced,
            durationMs,
            cssBytes,
            cssWritten,
            stylesheetPath,
        },
    }

    const sessionStop = await resolveSessionPayload(baseDir, config, 'compile', 'stop')
    await emitSession(api, sessionStop)

    return result
}
