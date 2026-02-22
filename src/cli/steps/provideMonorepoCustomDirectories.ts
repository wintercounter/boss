import { text } from '@clack/prompts'

import { RepositoryType, StepFn } from '@/cli/types'

const provideMonorepoCustomDirectories: StepFn = async config => {
    const { repositoryType, monorepoDirectories } = config

    if (repositoryType === RepositoryType.SINGLE || !monorepoDirectories || !monorepoDirectories.includes('__custom__'))
        return

    return await text({
        message: 'Input your custom directories separated by spaces or commas. You may also provide paths using `/`.'
    })
}

export default provideMonorepoCustomDirectories
