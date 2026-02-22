import type { Plugin } from '@/types'
export const onBoot: Plugin<'onBoot'> = async api => {
    api.strategy = name
}

export const onPropTree: Plugin<'onPropTree'> = async (api, { tree, file }) => {
    if (api.runtime?.only === true) return

    for (const [name, prop] of Object.entries(tree)) {
        const resolved = api.dictionary.resolve(name)

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

export const name = 'classname-only'