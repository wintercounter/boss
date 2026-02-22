import type { BossLogger } from '@/types'
import type { DebugValue } from '@/shared/types'
import type { DebugMatcher } from '@/shared/debug'
import { createDebugMatcher } from '@/shared/debug'

const normalizeDebugValue = (debug: DebugValue) => (debug === true ? 'boss:*' : debug)

export const createLogger = (namespace: string, debug?: DebugValue): BossLogger => {
    const normalized = normalizeDebugValue(debug)
    const matcher = createDebugMatcher(normalized)
    const cache = new Map<string, BossLogger>()

    const getLogger = (nextNamespace: string): BossLogger => {
        const existing = cache.get(nextNamespace)
        if (existing) return existing

        const enabled = matcher(nextNamespace)
        const logger: BossLogger = {
            namespace: nextNamespace,
            enabled,
            log: (...args: any[]) => {
                if (!enabled) return
                console.log(nextNamespace, ...args)
            },
            child: (name: string) => getLogger(`${nextNamespace}:${name}`),
        }

        cache.set(nextNamespace, logger)
        return logger
    }

    return getLogger(namespace)
}
