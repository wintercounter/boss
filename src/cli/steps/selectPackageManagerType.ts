import { select } from '@clack/prompts'
import { PackageManagerType, StepFn } from '@/cli/types'

const selectPackageManagerType: StepFn = async () => {
    const initialPackageManager = process.env.npm_config_user_agent?.split('/')?.[0] || PackageManagerType.BUN

    return await select({
        message: 'Select package manager.',
        options: [
            {
                value: PackageManagerType.NPM,
                label: 'NPM',
                hint: initialPackageManager === PackageManagerType.NPM ? 'Detected' : undefined
            },
            {
                value: PackageManagerType.PNPM,
                label: 'PNPM',
                hint: initialPackageManager === PackageManagerType.PNPM ? 'Detected' : undefined
            },
            {
                value: PackageManagerType.YARN,
                label: 'Yarn',
                hint: initialPackageManager === PackageManagerType.YARN ? 'Detected' : undefined
            },
            {
                value: PackageManagerType.BUN,
                label: 'Bun',
                hint: initialPackageManager === PackageManagerType.BUN ? 'Detected' : undefined
            }
        ],
        initialValue: initialPackageManager
    })
}

export default selectPackageManagerType
