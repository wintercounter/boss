import fs from 'node:fs/promises'
import path from 'node:path'

import { createApi } from '@/api/server'
import { resolveContentPaths } from '@/shared/file'
import { resolveBoundaryOutputs } from '@/shared/boundaries'
import type { UserConfig } from '@/shared/types'
import { emitSession, resolveSessionPayload } from '@/tasks/session'

export type BuildResult = {
    filesParsed: number
    cssPath: string | null
    cssBytes: number
    durationMs: number
    boundaryPaths?: string[]
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

export type ResolvedBuildConfig = {
    config: UserConfig
    folderPath: string
    stylesheetPath: string
    runtimeOnly: boolean
    runtimeGlobals: 'inline' | 'file' | 'none'
}

export const resolveBuildConfig = (userConfig: UserConfig, baseDir: string = process.cwd()): ResolvedBuildConfig => {
    const configDir = userConfig.configDir ?? '.bo$$'
    const folder = userConfig.folder ?? configDir
    const stylesheetPath = userConfig.stylesheetPath ?? path.join(baseDir, configDir, 'styles.css')

    const runtimeOnly = userConfig.runtime?.only === true
    const runtimeGlobals = runtimeOnly ? (userConfig.runtime?.globals ?? 'inline') : 'file'

    return {
        config: {
            ...userConfig,
            folder,
            stylesheetPath,
            configDir,
        },
        folderPath: path.resolve(baseDir, folder),
        stylesheetPath: path.isAbsolute(stylesheetPath) ? stylesheetPath : path.resolve(baseDir, stylesheetPath),
        runtimeOnly,
        runtimeGlobals,
    }
}

export const runBuild = async (userConfig: UserConfig, options: { baseDir?: string } = {}): Promise<BuildResult> => {
    const baseDir = options.baseDir ?? process.cwd()
    const start = process.hrtime.bigint()
    const { config, folderPath, stylesheetPath, runtimeOnly, runtimeGlobals } = resolveBuildConfig(userConfig, baseDir)

    if (!config.content) {
        throw new Error('boss build requires config.content in .bo$$/config.js or package.json.')
    }

    const api = await createApi(config, true)
    api.baseDir = baseDir
    const sessionStart = await resolveSessionPayload(baseDir, config, 'build', 'start')
    await emitSession(api, sessionStart)
    await emitSession(api, { ...sessionStart, phase: 'run' })

    const inputPaths = await resolveContentPaths(config.content)
    const parsedFiles: string[] = []

    await Promise.all(
        inputPaths.map(async inputPath => {
            const stat = await fs.stat(inputPath).catch(() => null)
            if (!stat?.isFile()) return

            const content = await fs.readFile(inputPath, 'utf8')
            parsedFiles.push(inputPath)
            await api.trigger('onParse', { content, path: inputPath })
        }),
    )

    await fs.mkdir(folderPath, { recursive: true })
    if (api.strategy !== 'classname-only') {
        await api.file.js.write()
        if (api.file.native?.hasContent) {
            await api.file.native.write()
        }
    }

    let cssPath: string | null = null
    let cssBytes = 0
    let boundaryPaths: string[] = []
    if (!runtimeOnly) {
        const boundaryResult = await resolveBoundaryOutputs(api, {
            rootDir: baseDir,
            stylesheetPath,
            boundaries: config.css?.boundaries,
        })
        boundaryPaths = boundaryResult.boundaryFiles
        await api.trigger('onMetaData', {
            kind: 'ai',
            replace: true,
            data: {
                section: 'boundaries',
                title: 'CSS boundaries',
                content: formatBoundaryLines(boundaryResult.boundaryFiles, baseDir),
            },
        })
        for (const output of boundaryResult.outputs) {
            await fs.mkdir(path.dirname(output.path), { recursive: true })
            await fs.writeFile(output.path, output.text, 'utf8')
        }
        const globalOutput = boundaryResult.outputs.find(output => output.path === stylesheetPath)
        cssPath = stylesheetPath
        cssBytes = Buffer.byteLength(globalOutput?.text ?? '')
    } else if (runtimeGlobals === 'file') {
        await api.trigger('onMetaData', {
            kind: 'ai',
            replace: true,
            data: {
                section: 'boundaries',
                title: 'CSS boundaries',
                content: formatBoundaryLines([], baseDir),
            },
        })
        const text = api.css?.text ?? ''
        await fs.mkdir(path.dirname(stylesheetPath), { recursive: true })
        await fs.writeFile(stylesheetPath, text, 'utf8')
        cssPath = stylesheetPath
        cssBytes = Buffer.byteLength(text)
    } else {
        await api.trigger('onMetaData', {
            kind: 'ai',
            replace: true,
            data: {
                section: 'boundaries',
                title: 'CSS boundaries',
                content: formatBoundaryLines([], baseDir),
            },
        })
    }

    const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000
    const sessionStop = await resolveSessionPayload(baseDir, config, 'build', 'stop')
    await emitSession(api, sessionStop)

    return {
        filesParsed: parsedFiles.length,
        cssPath,
        cssBytes,
        durationMs,
        boundaryPaths,
    }
}
