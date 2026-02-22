import { select } from '@clack/prompts'

import type { TaskFn, Tasks } from '@/cli/types'
import { runTask } from '@/cli/utils'
import { cancelIf } from '@/cli/utils'

const chooseTask: TaskFn = async config => {
    return [
        {
            prompt: async () => {
                const task = await select({
                    message: 'Select the task you want to run.',
                    options: [
                        { value: 'init', label: 'Init', hint: 'Initialize boss in an existing project.' },
                        { value: 'build', label: 'Build', hint: 'Generate boss output without PostCSS.' },
                        { value: 'watch', label: 'Watch', hint: 'Watch files and regenerate boss output.' },
                        { value: 'compile', label: 'Compile', hint: 'Optimize source files and CSS.' },
                        { value: 'dev', label: 'Dev', hint: 'Start the boss dev server.' },
                    ],
                })
                cancelIf(task)
                config.argv._ = [task as string]
                await runTask(config)
                return true
            },
        },
    ] as Tasks
}

export default chooseTask
