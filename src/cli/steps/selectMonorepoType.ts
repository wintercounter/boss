import { select } from '@clack/prompts'

import { MonorepoType, RepositoryType, RuntimeType, StepFn } from '@/cli/types'

const selectMonorepoType: StepFn = async config => {
    const { runtimeType, repositoryType } = config

    if (repositoryType === RepositoryType.SINGLE) return

    const workspaceName = (() => {
        switch (runtimeType) {
            case RuntimeType.NODE:
                return 'Node Workspaces'
            case RuntimeType.DENO:
                return 'Deno Workspaces'
            case RuntimeType.BUN:
                return 'Bun Workspaces'
            default:
                return 'Workspaces'
        }
    })()

    return await select({
        message: 'Select monorepo type.',
        options: [
            { value: MonorepoType.WORKSPACES, label: workspaceName },
            { value: MonorepoType.TURBOREPO, label: 'Turborepo' }
        ],
        initialValue: MonorepoType.WORKSPACES
    })
}

export default selectMonorepoType
