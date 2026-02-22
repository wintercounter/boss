import type { BossLogger } from '@/types'

export const createLogStub = (namespace = 'boss'): BossLogger => ({
    namespace,
    enabled: false,
    log: () => {},
    child: (name: string) => createLogStub(`${namespace}:${name}`),
})
