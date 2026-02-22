import { registerBosswindDictionary, rewriteBosswindInput } from '@/prop/bosswind/shared'
import { getBosswindSelectorMap, setBosswindSelectorMap } from '@/prop/bosswind/selectors'
import type { Plugin } from '@/types'

export const name = 'bosswind'

export const onInit: Plugin<'onInit'> = api => {
    registerBosswindDictionary(api)
}

export const onBrowserObjectStart: Plugin<'onBrowserObjectStart'> = (api, { input }) => {
    if (!input || typeof input !== 'object') return
    const config = api.bosswind ?? {}
    const rewritten = rewriteBosswindInput(api, input, config)
    Object.keys(input).forEach(key => delete input[key])
    Object.assign(input, rewritten)
    const selectorMap = getBosswindSelectorMap(rewritten)
    if (selectorMap) {
        setBosswindSelectorMap(input, selectorMap)
    }
}
