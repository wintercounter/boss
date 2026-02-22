import { cancel, isCancel } from '@clack/prompts'
import { log } from '@clack/prompts'

import type { Config, Tasks } from '@/cli/types'

export const cancelIf = (value: unknown, message = 'Operation cancelled.') => {
    if (isCancel(value)) {
        cancel(message)
        process.exit(0)
    }
}

export async function runTask(config: Config) {
    const { argv, runtimeType } = config
    const taskName = argv._[0] || 'choose'
    const taskLoaders: Record<string, () => Promise<{ default: (config: Config) => Promise<Tasks> }>> = {
        choose: () => import('@/cli/tasks/choose.js'),
        init: () => import('@/cli/tasks/init.js'),
        build: () => import('@/cli/tasks/build.js'),
        watch: () => import('@/cli/tasks/watch.js'),
        compile: () => import('@/cli/tasks/compile.js'),
        dev: () => import('@/cli/tasks/dev.js'),
    }
    const loadTask = taskLoaders[taskName]

    if (!loadTask) {
        log.error(`Unknown command: ${taskName}`)
        config.argv._ = ['choose']
        return runTask(config)
    }

    const taskModule = await loadTask()
    const steps: Tasks = await taskModule.default(config)

    for (const step of steps) {
        const { prompt, key, procedures } = step

        const value = await prompt(config)

        cancelIf(value)

        if (key) {
            // @ts-ignore
            config[key] = value
        }

        if (procedures) {
            config.procedures.push(...procedures)
        }
    }

    for (const procedure of config.procedures) {
        const { prompt } = procedure
        await prompt(config)
    }
}

export const spawn = async (command: string, args: string[], options: any) => {
    const { spawn } = await import('child_process')

    return new Promise((resolve, reject) => {
        log.info(`Executing command: ${command} ${args.join(' ')}`)

        const child = spawn(command, args, {
            cwd: process.cwd(),
            ...options,
        })

        child.stdout?.on('data', data => {
            log.message(data.toString())
        })

        child.stderr?.on('data', data => {
            log.error(data.toString())
        })

        child.on('close', code => {
            if (code === 0) {
                resolve(true)
            } else {
                reject()
            }
        })
    })
}
