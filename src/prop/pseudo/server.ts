import { pseudoDependencies, pseudoList } from '@/prop/pseudo/shared'
import type { BossProp, Plugin } from '@/types'
import type { DictionaryItem } from '@/shared/types'

export const onBoot: Plugin<'onBoot'> = async api => {
    const log = api.log.child('prop').child('pseudo')
    log.log('onBoot')

    api.file.js.dts.set('body', `pseudo:PseudoPropsInterfaceStart`, `export interface $$PseudoProps {`)

    for (const name of dependencies) {
        const prop: DictionaryItem = {
            property: name,
            aliases: [name],
            description: `Pseudo class: ${name}`,
            values: [],
            initial: '',
            descriptor: {},
        }

        api.dictionary.set(name, prop)
        api.file.js.dts
            .set('body', `pseudo:${name}:description`, prop.description)
            .set('body', `pseudo:${name}:declaration`, `  "${name}"?: $$FinalProps\n`)
    }

    api.file.js.dts
        .set('body', `pseudo:PseudoPropsInterfaceEnd`, `}`)
        .replace('body', `$$:FinalProps`, v => `${v} & $$PseudoProps`)

    const runtimeConfig = api.runtime
    const hasRuntimeConfig = Boolean(runtimeConfig && (runtimeConfig.only !== undefined || runtimeConfig.strategy))
    if (hasRuntimeConfig) {
        api.file.js.importAndConfig({ name: 'onInit', from: 'boss-css/prop/pseudo/runtime-only' }, () => true)
    }

    const lines = pseudoList.map(value => `- ${value}`).join('\n') || '- (none)'
    const content = lines
    await api.trigger('onMetaData', { kind: 'ai', data: { section: 'pseudos', title: 'Pseudos', content } })
}

export const onProp: Plugin<'onProp'> = async (api, { name: _name, prop, contexts, preferVariables, file }) => {
    const _value = prop.value
    const log = api.log.child('prop').child('pseudo')
    log.log('onProp', _name, _value, contexts)
    contexts.push(_name)
    const contextLength = contexts.length
    const query = prop.query ?? null
    const pseudoChain = contexts.filter(name => dependencies.has(name))

    if (!_value || typeof _value !== 'object' || Array.isArray(_value)) {
        contexts.pop()
        return
    }

    for (const [name, prop] of Object.entries(_value as Record<string, BossProp>)) {
        const resolved = api.dictionary.resolve(name)
        const descriptor = resolved.descriptor

        if (!descriptor) continue

        if (resolved.suffix) {
            prop.named = resolved.suffix
            prop.rawName = resolved.raw
        }

        const classToken = prop.classToken
        const selectorName = prop.selectorName ?? resolved.name
        const selectorValue = preferVariables
            ? null
            : prop.selectorValue !== undefined
              ? prop.selectorValue
              : prop.value
        const className = classToken
            ? null
            : api.contextToClassName(selectorName, selectorValue, contexts, true, api.selectorPrefix)
        const baseSelector = classToken ? api.classTokenToSelector(classToken) : `.${className}`
        const baseWithPseudos = pseudoChain.length ? `${baseSelector}:${pseudoChain.join(':')}` : baseSelector
        const selector = api.applyChildSelectors(baseWithPseudos, contexts)

        api.css.selector({ selector, query })

        log.log('trigger:onProp', name, prop.value, contexts)
        if (query && !prop.query) {
            prop.query = query
        }
        await api.trigger(
            'onProp',
            { name: resolved.name, prop, contexts, preferVariables, file },
            ({ dependencies }) => {
                //console.log('meh', name, !dependencies || dependencies.has(descriptor.property), descriptor.property)
                return !dependencies || dependencies.has(descriptor.property)
            },
        )

        // In case the nested props didn't change the context, we need to write it, unless it was already written
        if (contextLength === contexts.length && api.css.current) {
            api.css.write()
            //console.log('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!', api.css.text)
        }
    }

    contexts.pop()
}

export const dependencies = pseudoDependencies

export const name = 'pseudo'
