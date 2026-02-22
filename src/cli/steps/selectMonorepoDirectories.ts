import { multiselect } from '@clack/prompts'

import { RepositoryType, StepFn } from '@/cli/types'

const selectMonorepoType: StepFn = async config => {
    const { repositoryType } = config

    if (repositoryType === RepositoryType.SINGLE) return

    return await multiselect({
        message: 'Select your initial monorepo directories.',
        options: [
            { value: 'apps', label: './apps', hint: 'For whole applications, for example: web client.' },
            { value: 'packages', label: './packages', hint: 'For libraries, individually published packages.' },
            { value: 'shared', label: './shared', hint: 'For shared code, for example: types, configs, utils.' },
            {
                value: '__custom__',
                label: 'Custom folders',
                hint: 'You may also define custom directories for your specific needs.'
            }
        ],
        required: true
    })
}

export default selectMonorepoType
