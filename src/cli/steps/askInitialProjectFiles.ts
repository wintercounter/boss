import { confirm } from '@clack/prompts'

import { StepFn } from '@/cli/types'

const askInitialProjectFiles: StepFn = config => {
    return confirm({
        message:
            'Do you want to setup initial project files? This will crate a start project based on your preferences.'
    })
}

export default askInitialProjectFiles
