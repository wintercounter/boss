import isCSSProp from '@boss-css/is-css-prop'
import { getDefaultContexts } from './defaults.js'
import { getApi } from './api.js'

const whitespaceRegexp = /\s/
const cssPropCache = new Map()

const dashToCamelCase = str => str.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())

const getDictionary = () => {
    const { api } = getApi()
    return api?.dictionary ?? null
}

const getDictionaryEntry = name => {
    const dictionary = getDictionary()
    if (!dictionary) return null

    if (typeof dictionary.resolve === 'function') {
        return dictionary.resolve(name).descriptor || dictionary.resolve(dashToCamelCase(name)).descriptor || null
    }

    return dictionary.get(name) || dictionary.get(dashToCamelCase(name)) || null
}

const isCssPropName = (name, extraProps) => {
    if (!name) return false

    if (extraProps && extraProps.has(name)) {
        return true
    }

    const dictionaryEntry = getDictionaryEntry(name)
    if (dictionaryEntry) {
        return Boolean(dictionaryEntry.isCSSProp)
    }

    const cached = cssPropCache.get(name)
    if (cached !== undefined) return cached

    const camelName = dashToCamelCase(name)
    const result = isCSSProp('div', name) || isCSSProp('div', camelName)

    cssPropCache.set(name, result)
    return result
}

const splitClassList = input => {
    const results = []
    let current = ''
    let braceDepth = 0
    let bracketDepth = 0

    for (const char of input) {
        if (char === '{') braceDepth += 1
        if (char === '}') braceDepth = Math.max(0, braceDepth - 1)
        if (char === '[') bracketDepth += 1
        if (char === ']') bracketDepth = Math.max(0, bracketDepth - 1)

        if (braceDepth === 0 && bracketDepth === 0 && whitespaceRegexp.test(char)) {
            if (current) results.push(current)
            current = ''
            continue
        }

        current += char
    }

    if (current) results.push(current)

    return results
}

const splitFragments = selector => splitOutside(selector, ':')

const parseGroupedSelector = selector => {
    if (!selector.endsWith('}')) return null

    const groupStart = findGroupStart(selector)
    if (groupStart === -1) return null

    const prefix = selector.slice(0, groupStart)
    const body = selector.slice(groupStart + 2, -1)
    const entries = splitOutside(body, ';')
        .map(entry => entry.trim())
        .filter(Boolean)
        .map(entry => {
            const parts = splitOnceOutside(entry, ':')
            if (!parts) return null
            const [name, rawValue] = parts
            return {
                name: name.trim(),
                rawValue: rawValue.trim(),
            }
        })
        .filter(Boolean)

    if (!entries.length) return null

    return { prefix, entries }
}

const splitOutside = (input, delimiter) => {
    const results = []
    let current = ''
    let braceDepth = 0
    let bracketDepth = 0

    for (const char of input) {
        if (char === '{') braceDepth += 1
        if (char === '}') braceDepth = Math.max(0, braceDepth - 1)
        if (char === '[') bracketDepth += 1
        if (char === ']') bracketDepth = Math.max(0, bracketDepth - 1)

        if (char === delimiter && braceDepth === 0 && bracketDepth === 0) {
            if (current) results.push(current)
            current = ''
            continue
        }

        current += char
    }

    if (current) results.push(current)

    return results
}

const splitOnceOutside = (input, delimiter) => {
    let braceDepth = 0
    let bracketDepth = 0

    for (let i = 0; i < input.length; i += 1) {
        const char = input[i]
        if (char === '{') braceDepth += 1
        if (char === '}') braceDepth = Math.max(0, braceDepth - 1)
        if (char === '[') bracketDepth += 1
        if (char === ']') bracketDepth = Math.max(0, bracketDepth - 1)

        if (char === delimiter && braceDepth === 0 && bracketDepth === 0) {
            return [input.slice(0, i), input.slice(i + 1)]
        }
    }

    return null
}

const findGroupStart = selector => {
    let bracketDepth = 0

    for (let i = 0; i < selector.length - 1; i += 1) {
        const char = selector[i]
        if (char === '[') bracketDepth += 1
        if (char === ']') bracketDepth = Math.max(0, bracketDepth - 1)

        if (bracketDepth === 0 && selector[i] === ':' && selector[i + 1] === '{') {
            return i
        }
    }

    return -1
}

const isArbitrarySelectorContext = context => context.startsWith('[') && context.endsWith(']')
const isContainerContext = context =>
    context === 'container' || context.startsWith('container ') || context.startsWith('container_')

const getContextSet = options => {
    const contexts = getDefaultContexts()
    const dictionary = getDictionary()

    if (dictionary) {
        for (const [name, entry] of dictionary.entries()) {
            if (entry?.isCSSProp) continue
            contexts.add(name)
        }
    }

    if (options?.additionalContexts) {
        for (const context of options.additionalContexts) {
            contexts.add(context)
        }
    }

    return contexts
}

const hasValidContexts = (contexts, options, contextSet) => {
    if (options?.allowCustomContexts) return true
    return contexts.every(
        context =>
            isArbitrarySelectorContext(context) ||
            contextSet.has(context) ||
            (contextSet.has('container') && isContainerContext(context)),
    )
}

const isValidBossToken = (token, options = {}) => {
    if (!token) return false

    const contextSet = getContextSet(options)
    const extraProps = options.additionalProps ? new Set(options.additionalProps) : null
    const singleProps = options.singleProps ? new Set(options.singleProps) : null

    const grouped = parseGroupedSelector(token)
    if (grouped) {
        const contexts = splitFragments(grouped.prefix)
        if (!hasValidContexts(contexts, options, contextSet)) return false

        for (const entry of grouped.entries) {
            if (!entry.name) return false
            if (!isCssPropName(entry.name, extraProps)) return false
        }

        return true
    }

    const fragments = splitFragments(token)
    if (!fragments.length) return false

    let propIndex = -1

    for (let i = 0; i < fragments.length; i += 1) {
        if (isCssPropName(fragments[i], extraProps)) {
            propIndex = i
            break
        }
    }

    if (propIndex === -1) return false

    const contexts = fragments.slice(0, propIndex)
    if (!hasValidContexts(contexts, options, contextSet)) return false

    const hasValue = propIndex < fragments.length - 1
    if (!hasValue) {
        const entry = getDictionaryEntry(fragments[propIndex])
        if (entry?.single) return true
        if (!singleProps) return false
        if (!singleProps.has(fragments[propIndex])) return false
    }

    return true
}

const findInvalidTokens = (classList, options) => {
    const tokens = splitClassList(classList)
    const invalid = []

    for (const token of tokens) {
        if (!token) continue
        if (!isValidBossToken(token, options)) {
            invalid.push(token)
        }
    }

    return invalid
}

const containsBossToken = (classList, options) => {
    const tokens = splitClassList(classList)
    return tokens.some(token => isValidBossToken(token, options))
}

export {
    splitClassList,
    splitFragments,
    parseGroupedSelector,
    isCssPropName,
    getContextSet,
    isValidBossToken,
    findInvalidTokens,
    containsBossToken,
    getDictionaryEntry,
    getDictionary,
}
