import { select } from '@clack/prompts'
import { RepositoryType, StepFn } from '@/cli/types'

const selectRepositoryType: StepFn = async () => {
    return await select({
        message: 'Select repository type.',
        options: [
            { value: RepositoryType.SINGLE, label: 'Single' },
            { value: RepositoryType.MONOREPO, label: 'Monorepo' }
        ],
        initialValue: RepositoryType.SINGLE
    })
}

export default selectRepositoryType
