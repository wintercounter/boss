import isCSSProp from '@boss-css/is-css-prop'
import { cx, type CxValue } from '@/cx'
import { getClassNameProp } from '@/shared/framework'
import { getBosswindSelectorMap } from '@/prop/bosswind/selectors'
import type { Plugin } from '@/types'

export const name = 'classname-first'

type TokenFn = (() => string) & { IS_TOKEN_FN?: boolean }
const isTokenFunction = (value: unknown): value is TokenFn =>
    typeof value === 'function' && Boolean((value as TokenFn).IS_TOKEN_FN)

const resolveTokenValue = (value: unknown) => {
    if (isTokenFunction(value)) {
        const path = value().replace('$$.token.', '')
        return path.split('.').slice(1).join('.')
    }

    if (typeof value === 'string' && value.startsWith('$$.token.')) {
        const path = value.replace('$$.token.', '')
        return path.split('.').slice(1).join('.')
    }

    return value
}

const resolveDynamicValue = (value: TokenFn) => {
    const resolved = value()
    if (isTokenFunction(resolved)) {
        const path = resolved().replace('$$.token.', '')
        return `var(--${path.replace(/\./g, '-')})`
    }

    if (typeof resolved === 'string' && resolved.startsWith('$$.token.')) {
        const path = resolved.replace('$$.token.', '')
        return `var(--${path.replace(/\./g, '-')})`
    }

    return resolved
}

export const onBrowserObjectStart: Plugin<'onBrowserObjectStart'> = (api, { input, output = {}, tag, contexts = [] }) => {
    const classNameProp = getClassNameProp(api.framework)
    const outputRecord = output as Record<string, unknown> & { style?: Record<string, unknown> }
    const selectorMap = getBosswindSelectorMap(input)
    for (const prop in input) {
        const value = (input as Record<string, unknown>)[prop]

        if (prop === 'child' && value && typeof value === 'object' && !Array.isArray(value)) {
            for (const [selector, childValue] of Object.entries(value as Record<string, unknown>)) {
                const childContext = `[${selector.replace(/ /g, '_')}]`
                contexts.push(childContext)
                api.trigger('onBrowserObjectStart', {
                    input: childValue as Record<string, unknown>,
                    output,
                    contexts,
                    tag,
                })
            }
            continue
        }

        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            contexts.push(prop)
            api.trigger('onBrowserObjectStart', { input: value as Record<string, unknown>, output, contexts, tag })
            continue
        }

        const cssProp = isCSSProp(tag, prop)
        if (!cssProp) {
            continue
        }

        const resolvedTokenValue = resolveTokenValue(value)
        const isDynamicFn = typeof resolvedTokenValue === 'function'
        const selectorValue = isDynamicFn ? null : resolvedTokenValue

        const selectorEntry = selectorMap?.get(prop)
        const selectorProp = selectorEntry?.name ?? prop
        const selectorOverride = selectorEntry && Object.prototype.hasOwnProperty.call(selectorEntry, 'value')
            ? selectorEntry.value
            : undefined
        const finalSelectorValue = selectorOverride !== undefined ? selectorOverride : selectorValue
        const className = api.contextToClassName(selectorProp, finalSelectorValue, contexts, false, api.selectorPrefix)
        outputRecord[classNameProp] = cx(outputRecord[classNameProp] as CxValue, className) as string

        if (!isDynamicFn) continue

        const cssVarName = api.contextToCSSVariable(prop, null, contexts, api.selectorPrefix)
        outputRecord.style ??= {}
        outputRecord.style[cssVarName] = api.dictionary.toValue(resolveDynamicValue(resolvedTokenValue as TokenFn), prop)
    }

    contexts.pop()
}
