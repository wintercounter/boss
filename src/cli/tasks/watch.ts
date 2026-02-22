import { log } from '@clack/prompts'
import { runWatch } from '@/tasks/watch'

import type { TaskFn, Tasks } from '@/cli/types'

const watch: TaskFn = async config => {
    return [
        {
            prompt: async () => {
                const formatDuration = (ms: number) => {
                    if (ms < 1000) return `${ms.toFixed(0)}ms`
                    if (ms < 60_000) return `${(ms / 1000).toFixed(2)}s`
                    return `${(ms / 60_000).toFixed(2)}m`
                }

                try {
                    await runWatch(config.userConfig, {
                        onBuild: result => {
                            const cssNote = result.cssPath
                                ? `${result.cssBytes} bytes -> ${result.cssPath}`
                                : 'runtime-only (no css output)'
                            log.message(
                                `boss watch updated (${result.filesParsed} files, ${cssNote}, ${formatDuration(
                                    result.durationMs,
                                )}).`,
                            )
                        },
                        onError: error => {
                            log.error(`boss watch error: ${error.message}`)
                        },
                        onReady: () => {
                            log.message('boss watch listening for changes...')
                        },
                    })
                } catch (error) {
                    const message = error instanceof Error ? error.message : 'boss watch failed.'
                    log.error(message)
                    process.exit(1)
                }

                await new Promise(() => {})
                return true
            },
        },
    ] as Tasks
}

export default watch
