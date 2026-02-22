import { onInit as initRuntimeCss, applyGlobals } from '@/strategy/runtime-only/css'
import { onBrowserObjectStart as inlineFirstRuntime } from '@/strategy/inline-first/runtime-only'
import { onBrowserObjectStart as classnameFirstRuntime } from '@/strategy/classname-first/runtime-only'
import { onBrowserObjectStart as classicRuntime } from '@/strategy/classic/runtime-only'
import type { BossBrowserApi, Plugin } from '@/types'

export const name = 'runtime'
export const onInit: Plugin<'onInit'> = initRuntimeCss
export { applyGlobals }

const getRuntimeHandler = (api: BossBrowserApi) => {
    switch (api.strategy) {
        case 'classname-first':
            return classnameFirstRuntime
        case 'classic':
            return classicRuntime
        case 'inline-first':
        default:
            return inlineFirstRuntime
    }
}

export const onBrowserObjectStart: Plugin<'onBrowserObjectStart'> = (api, payload) => {
    const handler = getRuntimeHandler(api)
    return handler(api, payload)
}
