import type { UserConfig } from '@/shared/types'
import { compileProject } from '@/compile'

export type CompileOptions = {
    config: UserConfig
    prod?: boolean
}

export const runCompile = async ({ config, prod = false }: CompileOptions) => {
    return compileProject({ config, prod })
}
