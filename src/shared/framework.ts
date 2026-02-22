import type { FrameworkDescriptor } from '@/detect-fw'
import type { FrameworkConfig, FrameworkId } from '@/shared/types'

export type FrameworkLike = FrameworkDescriptor | FrameworkConfig | FrameworkId | null | undefined

export const getClassNameProp = (framework?: FrameworkLike) => {
    if (!framework || typeof framework === 'string') return 'className'
    if ('className' in framework && framework.className) return framework.className
    return 'className'
}
