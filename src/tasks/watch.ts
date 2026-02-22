import path from 'node:path'

import watcher from '@parcel/watcher'

import { createApi } from '@/api/server'
import { runBuild, resolveBuildConfig } from '@/tasks/build'
import type { BuildResult } from '@/tasks/build'
import { emitSession, resolveSessionPayload } from '@/tasks/session'

import type { UserConfig } from '@/shared/types'

const DEFAULT_DEBOUNCE_MS = 80

export type WatchResult = {
    close: () => Promise<void>
}

export type WatchOptions = {
    baseDir?: string
    debounceMs?: number
    onBuild?: (result: BuildResult) => void
    onError?: (error: Error) => void
    onReady?: () => void
}

export const runWatch = async (userConfig: UserConfig, options: WatchOptions = {}): Promise<WatchResult> => {
    const baseDir = options.baseDir ?? process.cwd()
    const debounceMs = options.debounceMs ?? DEFAULT_DEBOUNCE_MS
    const { config: buildConfig, folderPath, stylesheetPath } = resolveBuildConfig(userConfig, baseDir)

    if (!buildConfig.content) {
        throw new Error('boss watch requires config.content in .bo$$/config.js or package.json.')
    }

    const api = await createApi(buildConfig, true)
    api.baseDir = baseDir
    const sessionStart = await resolveSessionPayload(baseDir, buildConfig, 'watch', 'start')
    await emitSession(api, sessionStart)

    const ignoredDirs = new Set<string>([
        path.resolve(baseDir, 'node_modules'),
        path.resolve(baseDir, '.git'),
        path.resolve(baseDir, 'dist'),
        folderPath,
    ])

    if (buildConfig.configDir) {
        ignoredDirs.add(path.resolve(baseDir, buildConfig.configDir))
    }

    if (buildConfig.compile?.tempOutDir) {
        ignoredDirs.add(path.resolve(baseDir, buildConfig.compile.tempOutDir))
    }

    const ignoredFiles = new Set<string>()
    let ignoredBoundaryFiles = new Set<string>()
    if (stylesheetPath) {
        ignoredFiles.add(path.resolve(stylesheetPath))
    }

    const ignoreGlobs = ['**/node_modules/**', '**/.git/**', '**/dist/**']
    for (const dir of ignoredDirs) {
        const relative = path.relative(baseDir, dir).replace(/\\/g, '/')
        if (!relative || relative.startsWith('..')) continue
        ignoreGlobs.push(`${relative}/**`)
    }
    for (const file of ignoredFiles) {
        const relative = path.relative(baseDir, file).replace(/\\/g, '/')
        if (!relative || relative.startsWith('..')) continue
        ignoreGlobs.push(relative)
    }

    const shouldIgnore = (filePath: string) => {
        const resolved = path.resolve(filePath)
        if (ignoredFiles.has(resolved)) return true
        if (ignoredBoundaryFiles.has(resolved)) return true
        for (const dir of ignoredDirs) {
            if (resolved === dir || resolved.startsWith(dir + path.sep)) {
                return true
            }
        }
        return false
    }

    let running = false
    let pending = false
    let timer: ReturnType<typeof setTimeout> | null = null

    const runOnce = async () => {
        running = true
        try {
            const sessionRun = await resolveSessionPayload(baseDir, buildConfig, 'watch', 'run')
            await emitSession(api, sessionRun)

            const result = await runBuild(buildConfig, { baseDir })
            ignoredBoundaryFiles = new Set((result.boundaryPaths ?? []).map(entry => path.resolve(entry)))
            options.onBuild?.(result)
        } catch (error) {
            const err = error instanceof Error ? error : new Error('boss watch build failed.')
            options.onError?.(err)
        } finally {
            running = false
            if (pending) {
                pending = false
                scheduleBuild()
            }
        }
    }

    const scheduleBuild = () => {
        pending = true
        if (running) return
        if (timer) return
        timer = setTimeout(() => {
            timer = null
            if (!pending) return
            pending = false
            void runOnce()
        }, debounceMs)
    }

    scheduleBuild()

    const subscription = await watcher.subscribe(
        baseDir,
        (error, events) => {
            if (error) {
                options.onError?.(error)
                return
            }

            const hasRelevantChange = events.some(event => !shouldIgnore(event.path))
            if (!hasRelevantChange) return
            scheduleBuild()
        },
        { ignore: ignoreGlobs },
    )

    options.onReady?.()

    return {
        close: async () => {
            await subscription.unsubscribe()
            const sessionStop = await resolveSessionPayload(baseDir, buildConfig, 'watch', 'stop')
            await emitSession(api, sessionStop)
        },
    }
}
