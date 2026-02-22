import { log } from '@clack/prompts'

import { runBuild } from '@/cli/build'

import type { TaskFn, Tasks } from '@/cli/types'

const build: TaskFn = async config => {
    return [
        {
            prompt: async () => {
                try {
                    const result = await runBuild(config.userConfig)
                    const cssNote = result.cssPath
                        ? `${result.cssBytes} bytes -> ${result.cssPath}`
                        : 'runtime-only (no css output)'
                    log.message(`boss build ready (${result.filesParsed} files, ${cssNote}).`)
                    return true
                } catch (error) {
                    const message = error instanceof Error ? error.message : 'boss build failed.'
                    log.error(message)
                    process.exit(1)
                }
            },
        },
    ] as Tasks
}

export default build
