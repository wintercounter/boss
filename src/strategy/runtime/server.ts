import * as inlineFirstServer from '@/strategy/inline-first/server'
import * as classnameFirstServer from '@/strategy/classname-first/server'
import type { BossServerApi, Plugin } from '@/types'

export const name = 'runtime'

export const settings = new Map<string, unknown>([
    ['emitRuntime', false],
    ['emitAllTokens', false],
])

let needsRuntime = false

const resolveRuntimeStrategy = (api: BossServerApi) => api.runtime?.strategy ?? 'inline-first'
const resolveRuntimeGlobals = (api: BossServerApi) => {
    if (!api.runtime?.only) return null
    return api.runtime?.globals ?? 'inline'
}

const resolveServerStrategy = (strategy: string) => {
    if (strategy === 'classname-first') return classnameFirstServer
    return inlineFirstServer
}

export const onBoot: Plugin<'onBoot'> = async api => {
    const runtimeStrategy = resolveRuntimeStrategy(api)
    const runtimeConfig = api.runtime ?? {}
    const globalsMode = resolveRuntimeGlobals(api)
    const shouldInlineGlobals = globalsMode === 'inline'
    const shouldEmitRuntime = () =>
        needsRuntime || settings.get('emitRuntime') === true || shouldInlineGlobals

    const runtimeModule = 'boss-css/strategy/runtime/runtime-only'
    const onBrowserObjectStartVar = api.file.js.import(
        { name: 'onBrowserObjectStart', from: runtimeModule },
        shouldEmitRuntime,
    )
    const onInitVar = api.file.js.import({ name: 'onInit', from: runtimeModule }, shouldEmitRuntime)
    const applyGlobalsVar = shouldInlineGlobals
        ? api.file.js.import({ name: 'applyGlobals', from: runtimeModule }, shouldEmitRuntime)
        : null
    api.file.js.config(
        {
            from: runtimeModule,
            config: {
                plugin: { onInit: onInitVar, onBrowserObjectStart: onBrowserObjectStartVar },
            },
        },
        shouldEmitRuntime,
    )

    api.file.js.config(
        {
            from: 'boss-css/strategy/runtime',
            config: {
                selectorPrefix: api.selectorPrefix,
                selectorScope: api.selectorScope,
                strategy: runtimeStrategy,
                runtime: runtimeConfig,
            },
        },
        shouldEmitRuntime,
    )

    if (shouldInlineGlobals && applyGlobalsVar) {
        api.file.js.set(
            'body',
            'runtime:globals',
            () => {
                const cssText = api.css?.text?.trim()
                if (!cssText) return ''
                return `${applyGlobalsVar}(${JSON.stringify({ cssText })});`
            },
            shouldEmitRuntime,
        )
    }

    api.strategy = runtimeStrategy

    if (runtimeStrategy === 'classname-first') {
        if (settings.get('emitAllTokens') === true || process.env.NODE_ENV !== 'production') {
            api.emitAllTokens = true
        }
    }
}

export const onPropTree: Plugin<'onPropTree'> = async (api, data) => {
    needsRuntime ||= data?.parser === 'jsx'

    if (api.runtime?.only === true) return

    const runtimeStrategy = resolveRuntimeStrategy(api)
    const serverStrategy = resolveServerStrategy(runtimeStrategy)
    if (!serverStrategy.onPropTree) return
    await serverStrategy.onPropTree(api, data)
}
