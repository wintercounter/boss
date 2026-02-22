import type { BossApiBase, Plugin } from '@/types'
export const settings = new Map<string, unknown>([['emitRuntime', false]])

let needsRuntime = false

const resolveDescriptor = (api: BossApiBase, name: string) => {
    return api.dictionary.resolve(name)
}

export const onBoot: Plugin<'onBoot'> = async api => {
    const runtimeConfig = api.runtime
    const hasRuntimeConfig = Boolean(runtimeConfig && (runtimeConfig.only !== undefined || runtimeConfig.strategy))
    const runtimeStrategy = runtimeConfig?.strategy ?? name
    const runtimeModule = hasRuntimeConfig
        ? 'boss-css/strategy/runtime/runtime-only'
        : 'boss-css/strategy/inline-first/browser'
    const shouldEmitRuntime = () => Boolean(needsRuntime || settings.get('emitRuntime') === true)
    const onBrowserObjectStartVar = api.file.js.import(
        { name: 'onBrowserObjectStart', from: runtimeModule },
        shouldEmitRuntime,
    )
    const runtimePlugin: Record<string, string> = { onBrowserObjectStart: onBrowserObjectStartVar }
    if (hasRuntimeConfig) {
        const onInitVar = api.file.js.import({ name: 'onInit', from: runtimeModule }, shouldEmitRuntime)
        runtimePlugin.onInit = onInitVar
    }
    api.file.js.config({ from: runtimeModule, config: { plugin: runtimePlugin } }, shouldEmitRuntime)
    api.file.js.config(
        {
            from: 'boss-css/strategy/inline-first',
            config: {
                selectorPrefix: api.selectorPrefix,
                selectorScope: api.selectorScope,
                strategy: runtimeStrategy,
                ...(hasRuntimeConfig ? { runtime: runtimeConfig } : {}),
            },
        },
        shouldEmitRuntime,
    )

    api.strategy = name
}

export const onPropTree: Plugin<'onPropTree'> = async (api, { input, tree, preferVariables, parser, file }) => {
    if (api.runtime?.only === true) return

    // Nested CSS props will always use variables
    // This makes first level CSS props empty
    tree = api.mapPropTree(tree, (name, prop, depth) => {
        let result = prop
        const resolved = api.dictionary.resolve(name)
        const isCSSProp = resolved.descriptor?.isCSSProp
        if (preferVariables && isCSSProp) {
            needsRuntime ||= parser === 'jsx'
            result = { ...prop, value: null }
        }
        return result
    })

    for (const [name, prop] of Object.entries(tree)) {
        const resolved = resolveDescriptor(api, name)

        if (!resolved.descriptor) continue

        if (resolved.suffix) {
            prop.named = resolved.suffix
            prop.rawName = resolved.raw
        }

        const { aliases, isCSSProp, property } = resolved.descriptor
        const resolvedName = resolved.name

        const isContainerQueryProp =
            resolvedName === 'container' &&
            prop?.value &&
            typeof prop.value === 'object' &&
            !Array.isArray(prop.value)

        // If variable is preferred, keep value === null
        // Direct (first-level) CSS props are inlined on browser side, no need to deal with them
        // Property === name means it's not a shorthand. For shorthands use variables instead.
        // And not a deep prop somewhere in the tree
        if (preferVariables && isCSSProp && property === api.camelCaseToDash(resolvedName) && !isContainerQueryProp)
            continue

        // Any CSS
        await api.trigger(
            'onProp',
            { name: resolvedName, prop, contexts: [], preferVariables, file },
            ({ dependencies }) => {
                return !dependencies || aliases.some(alias => dependencies.has(alias))
            },
        )
    }
}

export const name = 'inline-first'
