import { confirm, cancel } from '@clack/prompts'

import { StepFn } from '@/cli/types'

const checkIfInitialized: StepFn = async config => {
    const { isInitialized } = config
    if (isInitialized) {
        const shouldContinue = await confirm({
            message: 'Project seems like already initialized!\nDo you want to reconfigure the project?'
        })
        if (!shouldContinue) {
            cancel('Init task canceled!')
            process.exit(0)
        }
        return shouldContinue
    }
}

export default checkIfInitialized
