import fs from 'node:fs/promises'
import path from 'node:path'

import { log } from '@clack/prompts'

import { startDevServer } from '@/dev/server'
import { DEFAULT_DEV_PORT } from '@/dev/shared'
import { updateDevPort, updateRuntimePort } from '@/dev/port'

import type { TaskFn, Tasks } from '@/cli/types'
import type { UserConfig } from '@/shared/types'

const dev: TaskFn = async config => {
    return [
        {
            prompt: async () => {
                const { argv, userConfig } = config
                const basePort = Number.isFinite(Number(argv.port)) ? Number(argv.port) : DEFAULT_DEV_PORT
                const maxPort = Number.isFinite(Number(argv.maxPort)) ? Number(argv.maxPort) : basePort + 49
                const configDir = userConfig.configDir ?? '.bo$$'

                const { port } = await startDevServer({ port: basePort, maxPort })
                const configPath = await resolveConfigPath(userConfig)
                if (configPath) {
                    const shouldInsert = port !== DEFAULT_DEV_PORT
                    const updated = await updateDevPort(configPath, port, shouldInsert)
                    if (!updated) {
                        log.warn(`Skipping devServer update for ${configPath}.`)
                    }
                } else {
                    log.warn('No boss config found; skipping devServer update.')
                }

                const runtimeDir = userConfig.folder ?? configDir
                const runtimePath = path.join(process.cwd(), runtimeDir, 'index.js')
                await updateRuntimePort(runtimePath, port)

                log.message(`boss dev listening on ws://localhost:${port}`)
                await new Promise(() => {})
                return true
            },
        },
    ] as Tasks
}

const resolveConfigPath = async (userConfig: UserConfig) => {
    const cwd = process.cwd()
    const configDir = userConfig.configDir ?? '.bo$$'
    const candidates = [path.join(cwd, configDir, 'config.js')]
    const srcCandidate = path.join(cwd, 'src', configDir, 'config.js')
    if (!candidates.includes(srcCandidate)) {
        candidates.push(srcCandidate)
    }

    if (userConfig.folder && userConfig.folder !== configDir) {
        candidates.push(path.join(cwd, userConfig.folder, 'config.js'))
    }

    for (const candidate of candidates) {
        try {
            await fs.access(candidate)
            return candidate
        } catch {
            continue
        }
    }

    return null
}

export default dev
