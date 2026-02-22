import 'css.escape'

export const contextToClassName = (
    name: string,
    value: unknown,
    contexts: string[],
    escape = true,
    prefix = '',
) => {
    const parts = value !== null ? [name, Array.isArray(value) ? value.join('_') : String(value)] : [name]
    const className = `${prefix}${[...contexts, ...parts].join(':')}`

    return escape
        ? camelCaseToDash(escapeClassName(className))
        : camelCaseToDash(className.replace(/ /g, '_'))
}

export const contextToCSSVariable = (
    name: string,
    value: unknown,
    contexts: string[],
    prefix = '',
) => {
    return camelCaseToDash(escapeCSSVariable(`--${prefix}${[...contexts, name].join('-')}`))
}

export const escapeCSSVariable = (css: string) => {
    return css.replace(/ /g, '-').replace(/([^a-z0-9-_])/gi, '\\$1')
}

export const escapeClassName = (css: string) => {
    return (
        CSS.escape(css.replace(/ /g, '_'))
            // Fixes a bug in the library where : doesn't get properly escaped
            .replace(/([^\\]):/g, '\\:')
    )
}

export const escapeAttributeValue = (value: string) => {
    return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

export const classTokenToSelector = (token: string) => {
    if (token.includes('{') || token.includes('}')) {
        return `[class~="${escapeAttributeValue(token)}"]`
    }
    return `.${escapeClassName(token)}`
}

export const dashToCamelCase = (str: string) => {
    return str.replace(/-([a-z])/g, (_: string, a: string) => a.toUpperCase())
}

export const camelCaseToDash = (str: string) => {
    return str.replace(/([a-z])([A-Z])/g, (_: string, a: string, b: string) => `${a}-${b.toLowerCase()}`)
}

export const isChildSelectorContext = (context: string) => {
    return context.startsWith('[') && context.endsWith(']') && context.length > 2
}

export const normalizeChildSelectorContext = (context: string) => {
    if (!isChildSelectorContext(context)) return null
    return context.slice(1, -1).replace(/_/g, ' ').trim()
}

export const applyChildSelectors = (baseSelector: string, contexts: string[]) => {
    const selectors = contexts
        .map(normalizeChildSelectorContext)
        .filter((selector): selector is string => Boolean(selector))

    return selectors.reduce((current, selector) => {
        if (selector.includes('&')) {
            return selector.replace(/&/g, current)
        }
        return `${current} ${selector}`.trim()
    }, baseSelector)
}
