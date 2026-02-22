import type { BossApiBase, BossProp, BossPropTree, Plugin } from '@/types'
export const settings = new Map<string, unknown>([
    ['emitRuntime', false],
    ['emitAllTokens', false],
])

let needsRuntime = false

const isFunctionProp = (prop: BossProp | undefined) => typeof prop?.isFn === 'boolean' && prop.isFn

const resolveDescriptor = (api: BossApiBase, name: string) => {
    return api.dictionary.resolve(name)
}

const normalizeArrayValue = (value: unknown[]): unknown[] => {
    return value.map(entry => {
        if (entry && typeof entry === 'object' && 'value' in (entry as Record<string, unknown>)) {
            const raw = (entry as { value?: unknown }).value
            return Array.isArray(raw) ? normalizeArrayValue(raw) : raw
        }
        return entry
    })
}

const describeLocation = (file?: { path?: string } | null, code?: string) => {
    if (!file?.path && !code) return ''
    const parts = []
    if (file?.path) parts.push(file.path)
    if (code) parts.push(code.trim())
    return parts.length ? ` (${parts.join(' | ')})` : ''
}

export const onBoot: Plugin<'onBoot'> = async api => {
    const runtimeConfig = api.runtime
    const hasRuntimeConfig = Boolean(runtimeConfig && (runtimeConfig.only !== undefined || runtimeConfig.strategy))
    const runtimeStrategy = runtimeConfig?.strategy ?? name
    const runtimeModule = hasRuntimeConfig
        ? 'boss-css/strategy/runtime/runtime-only'
        : 'boss-css/strategy/classname-first/browser'
    const shouldEmitRuntime = () => needsRuntime || settings.get('emitRuntime') === true
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
            from: 'boss-css/strategy/classname-first',
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

    if (settings.get('emitAllTokens') === true || (process.env.NODE_ENV !== 'production')) {
        api.emitAllTokens = true
    }
}

export const onPropTree: Plugin<'onPropTree'> = async (api, { tree, parser, file, code }) => {
    if (api.runtime?.only === true) return

    const invalidProps: string[] = []

    const pruneTree = (node: BossPropTree): BossPropTree => {
        const next: BossPropTree = {}
        for (const [name, prop] of Object.entries(node)) {
            const value = prop?.value
            const resolved = resolveDescriptor(api, name)
            const isCssProp = Boolean(resolved.descriptor?.isCSSProp)

            if (value && typeof value === 'object' && !Array.isArray(value)) {
                const nested = pruneTree(value as BossPropTree)
                if (Object.keys(nested).length) {
                    next[name] = { ...prop, value: nested }
                }
                continue
            }

            if (!isCssProp) {
                next[name] = prop
                continue
            }

            needsRuntime ||= parser === 'jsx'

            if (prop.dynamic && !isFunctionProp(prop)) {
                invalidProps.push(name)
                continue
            }

            if (prop.dynamic && isFunctionProp(prop)) {
                next[name] = { ...prop, value: null, selectorValue: null }
                continue
            }

            const normalizedValue = Array.isArray(prop.value)
                ? normalizeArrayValue(prop.value as unknown[])
                : prop.value
            next[name] = {
                ...prop,
                value: normalizedValue,
                selectorValue: prop.selectorValue !== undefined ? prop.selectorValue : normalizedValue,
            }
        }

        return next
    }

    const pruned = pruneTree(tree)
    Object.keys(tree).forEach(key => delete tree[key])
    Object.assign(tree, pruned)

    if (invalidProps.length) {
        const location = describeLocation(file, code)
        for (const name of invalidProps) {
            console.warn(
                `[boss-css] classname-first skipped dynamic prop "${name}". Use ${name}={() => value}.${location}`,
            )
        }
    }

    for (const [name, prop] of Object.entries(tree)) {
        const resolved = resolveDescriptor(api, name)

        if (!resolved.descriptor) continue

        if (resolved.suffix) {
            prop.named = resolved.suffix
            prop.rawName = resolved.raw
        }

        const { aliases } = resolved.descriptor

        await api.trigger(
            'onProp',
            { name: resolved.name, prop, contexts: [], file },
            ({ dependencies }) => {
                return !dependencies || aliases.some(alias => dependencies.has(alias))
            },
        )
    }
}

export const name = 'classname-first'
