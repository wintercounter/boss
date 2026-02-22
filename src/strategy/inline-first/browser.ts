import isCSSProp from '@boss-css/is-css-prop'
import { cx, type CxValue } from '@/cx'
import { getClassNameProp } from '@/shared/framework'
import type { Plugin } from '@/types'

export const name = 'inline-first'

export const onBrowserObjectStart: Plugin<'onBrowserObjectStart'> = (api, { input, output = {}, tag, contexts = [] }) => {
    const classNameProp = getClassNameProp(api.framework)
    const outputRecord = output as Record<string, unknown> & { style?: Record<string, unknown> }
    outputRecord.style ??= {}
    const inputRecord = input as Record<string, unknown>

    for (const prop in inputRecord) {
        const value = inputRecord[prop]
        const resolved = api.dictionary.resolve(prop)
        const descriptor = resolved.descriptor
        const resolvedName = resolved.name

        if (prop === 'child' && value && typeof value === 'object' && !Array.isArray(value)) {
            for (const [selector, childValue] of Object.entries(value)) {
                const childContext = `[${selector.replace(/ /g, '_')}]`
                contexts.push(childContext)
                api.trigger('onBrowserObjectStart', {
                    input: childValue as Record<string, unknown>,
                    output,
                    contexts,
                })
            }
            continue
        }

        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            // Default: Object values are just recursively processed
            if (!descriptor || !descriptor.handler) {
                contexts.push(prop)
                api.trigger('onBrowserObjectStart', { input: value as Record<string, unknown>, output, contexts })
            } else {
                descriptor.handler({ value, output: outputRecord, contexts })
            }
        } else if (descriptor?.handler) {
            descriptor.handler({ value, output: outputRecord, contexts })
        } else if (!contexts.length && isCSSProp(tag, resolvedName)) {
            outputRecord.style[resolvedName] = api.dictionary.toValue(value, resolvedName)
        } else {
            const className = api.contextToClassName(resolvedName, null, contexts, false, api.selectorPrefix)
            const cssVarName = api.contextToCSSVariable(resolvedName, null, contexts, api.selectorPrefix)
            outputRecord.style[cssVarName] = api.dictionary.toValue(value, resolvedName)
            outputRecord[classNameProp] = cx(outputRecord[classNameProp] as CxValue, className) as string
        }
    }

    contexts.pop()
}
