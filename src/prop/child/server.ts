import { dependencies as pseudoDependencies } from '@/prop/pseudo/server'
import type { BossProp, Plugin } from '@/types'

export const name = 'child'

export const dependencies = new Set(['child'])

export const onBoot: Plugin<'onBoot'> = async api => {
    const prop = {
        property: 'child',
        aliases: ['child'],
        description: 'Arbitrary selector nesting',
    }

    api.dictionary.set('child', prop)

    api.file.js.dts
        .set('body', 'child:ChildProps', `export type $$ChildProps = { child?: { [selector: string]: $$FinalProps } }`)
        .replace('body', `$$:FinalProps`, v => `${v} & $$ChildProps`)

    const runtimeConfig = api.runtime
    const hasRuntimeConfig = Boolean(runtimeConfig && (runtimeConfig.only !== undefined || runtimeConfig.strategy))
    if (hasRuntimeConfig) {
        api.file.js.importAndConfig({ name: 'onInit', from: 'boss-css/prop/child/runtime-only' }, () => true)
    }
}

export const onProp: Plugin<'onProp'> = async (api, { prop, contexts, preferVariables, file }) => {
    const value = prop.value
    if (!value || typeof value !== 'object' || Array.isArray(value)) return

    const entries = value as Record<string, BossProp>
    for (const [rawSelector, selectorProp] of Object.entries(entries) as Array<[string, BossProp]>) {
        if (!selectorProp?.value || typeof selectorProp.value !== 'object' || Array.isArray(selectorProp.value)) {
            continue
        }

        const selectorToken = rawSelector.replace(/ /g, '_')
        const childContext = `[${selectorToken}]`
        contexts.push(childContext)

        const query = selectorProp.query ?? prop.query ?? null
        const pseudoChain = contexts.filter(context => pseudoDependencies.has(context))

        const childEntries = selectorProp.value as Record<string, BossProp>
        for (const [name, childProp] of Object.entries(childEntries) as Array<[string, BossProp]>) {
            const resolved = api.dictionary.resolve(name)
            const descriptor = resolved.descriptor
            if (!descriptor) continue

            if (resolved.suffix) {
                childProp.named = resolved.suffix
                childProp.rawName = resolved.raw
            }

            const classToken = childProp.classToken
            const selectorName = childProp.selectorName ?? resolved.name
            const selectorValue = preferVariables
                ? null
                : childProp.selectorValue !== undefined
                  ? childProp.selectorValue
                  : childProp.value
            const className = classToken
                ? null
                : api.contextToClassName(selectorName, selectorValue, contexts, true, api.selectorPrefix)
            const baseSelector = classToken ? api.classTokenToSelector(classToken) : `.${className}`
            const baseWithPseudos = pseudoChain.length ? `${baseSelector}:${pseudoChain.join(':')}` : baseSelector
            const selector = api.applyChildSelectors(baseWithPseudos, contexts)

            api.css.selector({ selector, query })

            if (query && !childProp.query) {
                childProp.query = query
            }

            await api.trigger(
                'onProp',
                { name: resolved.name, prop: childProp, contexts, preferVariables, file },
                ({ dependencies }) => {
                    return !dependencies || dependencies.has(descriptor.property)
                },
            )

            if (api.css.current) {
                api.css.write()
            }
        }

        contexts.pop()
    }
}
