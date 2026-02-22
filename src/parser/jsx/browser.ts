import isDOMProp from '@/parser/jsx/isDOMProp.js'
import isCSSProp from '@boss-css/is-css-prop'
import { cx, type CxValue } from '@/cx'
import { getClassNameProp } from '@/shared/framework'
import type { Plugin } from '@/types'

const ignoredProps = new Set(['ref', 'children', 'dangerouslySetInnerHtml', 'key'])

export const name = 'jsx'

// Add DOM props directly to the output as-is, and remove from input object
export const onBrowserObjectStart: Plugin<'onBrowserObjectStart'> = (api, { input, tag = 'div', contexts = [], output = {} }) => {
    const log = api.log.child('runtime').child('jsx')
    log.log('browserObject:start', input, output, contexts)
    // Only top level props can be DOM props
    if (contexts.length) return

    const isClassnameFirst = api.strategy === 'classname-first'
    const classNameProp = getClassNameProp(api.framework)
    let tokenOverrides = null

    for (const prop in input) {
        if (prop === 'tokens') {
            tokenOverrides = input[prop]
            delete input[prop]
            continue
        }

        if (prop === classNameProp) {
            output[classNameProp] = cx(output[classNameProp] as CxValue, input[prop] as CxValue)
            delete input[prop]
            continue
        }

        if (prop === 'style') {
            const styleValue = input[prop]
            if (styleValue && typeof styleValue === 'object' && !Array.isArray(styleValue)) {
                output.style = { ...(output.style ?? {}), ...(styleValue as Record<string, unknown>) }
            } else if (styleValue !== undefined) {
                output.style = styleValue
            }
            delete input[prop]
            continue
        }

        if (ignoredProps.has(prop) || isDOMProp(tag, prop)) {
            output[prop] = input[prop]
            delete input[prop]
            continue
        }

        if (typeof input[prop] === 'function') {
            if (isClassnameFirst && isCSSProp(tag, prop)) {
                continue
            }
            input[prop] = input[prop]()
        }
    }

    if (tokenOverrides && typeof api.tokenVars === 'function') {
        const resolved = typeof tokenOverrides === 'function' ? tokenOverrides() : tokenOverrides
        if (resolved && typeof resolved === 'object') {
            output.style = { ...(output.style ?? {}), ...api.tokenVars(resolved) }
        }
    }
    log.log('browserObject:end', input, output)
}
