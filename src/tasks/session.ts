import path from 'node:path'
import fs from 'node:fs/promises'

import type { UserConfig } from '@/shared/types'

export type SessionPhase = 'start' | 'run' | 'stop'
export type SessionKind = 'watch' | 'postcss' | 'build' | 'compile' | 'custom'

export type SessionPayload = {
    phase: SessionPhase
    kind: SessionKind
    baseDir: string
    configPath: string | null
    runtimePath: string | null
}

const hasFile = async (filePath: string) => {
    try {
        await fs.access(filePath)
        return true
    } catch {
        return false
    }
}

export const resolveConfigPath = async (baseDir: string, configDir: string) => {
    const primary = path.join(baseDir, configDir, 'config.js')
    if (await hasFile(primary)) {
        return primary
    }

    if (configDir === '.bo$$') {
        const fallback = path.join(baseDir, 'src', '.bo$$', 'config.js')
        if (await hasFile(fallback)) {
            return fallback
        }
    }

    return null
}

export const resolveRuntimePath = (baseDir: string, config: UserConfig) => {
    const runtimeDir = config.folder ?? config.configDir ?? '.bo$$'
    const basePath = path.isAbsolute(runtimeDir) ? runtimeDir : path.join(baseDir, runtimeDir)
    return path.join(basePath, 'index.js')
}

export const resolveSessionPayload = async (baseDir: string, config: UserConfig, kind: SessionKind, phase: SessionPhase) => {
    const configDir = config.configDir ?? '.bo$$'
    const configPath = await resolveConfigPath(baseDir, configDir)
    const runtimePath = resolveRuntimePath(baseDir, config)
    return {
        phase,
        kind,
        baseDir,
        configPath,
        runtimePath,
    } satisfies SessionPayload
}

export const emitSession = async (api: any, payload: SessionPayload) => {
    if (!api?.trigger) return
    await api.trigger('onSession', payload)
}
