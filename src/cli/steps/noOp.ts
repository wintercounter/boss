import { StepFn } from '@/cli/types'

const noOp: StepFn = async () => {
    return true
}

export const step = noOp
