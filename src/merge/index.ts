import { merge as deepMerge } from 'ts-deepmerge'
import isCssProp from '@boss-css/is-css-prop'

type ClassNameArray = ClassNameValue[]
type MergeObject = Record<string, unknown>
export type ClassNameValue = ClassNameArray | string | null | undefined | 0 | 0n | false
export type MergeInput = ClassNameValue | MergeObject
export type MergeOutput = string | MergeObject

export type BossMergeConfig = {
    cacheSize?: number
    sortContexts?: boolean
    orderSensitiveContexts?: string[]
    compoundContexts?: string[]
    conflictMap?: Record<string, string[]>
}

type ResolvedConfig = {
    cacheSize: number
    sortContexts: boolean
    orderSensitiveContexts: string[]
    orderSensitiveSet: Set<string>
    compoundContexts: string[]
    compoundContextSet: Set<string>
    conflictMap: Map<string, string[]>
    cache: LruCache<string, string>
}

type ParsedToken = {
    value: string
}

type LruCache<Key extends string, Value> = {
    get(key: Key): Value | undefined
    set(key: Key, value: Value): void
}

const cssPropCache = new Map<string, boolean>()
const whitespaceRegexp = /\s/

const defaultConfig = {
    cacheSize: 500,
    sortContexts: true,
    orderSensitiveContexts: ['before', 'after'],
    compoundContexts: ['at', 'container'],
    conflictMap: {},
}

export const createBossMerge = (config: BossMergeConfig = {}) => {
    const resolved = resolveConfig(config)

    return (...classLists: ClassNameValue[]): string => {
        const classList = join(...classLists)
        if (!classList) return ''

        const cached = resolved.cache.get(classList)
        if (cached) return cached

        const result = mergeClassList(classList, resolved)
        resolved.cache.set(classList, result)
        return result
    }
}

export const join = (...classLists: ClassNameValue[]): string => {
    let index = 0
    let argument: ClassNameValue
    let resolvedValue: string
    let string = ''

    while (index < classLists.length) {
        if ((argument = classLists[index++])) {
            if ((resolvedValue = toValue(argument))) {
                string && (string += ' ')
                string += resolvedValue
            }
        }
    }
    return string
}

const defaultMerge = createBossMerge()

export const merge = (...inputs: MergeInput[]): MergeOutput => {
    const objects = inputs.filter(isPlainObject)
    const nonObjects = inputs.filter(input => input != null && !isPlainObject(input))

    if (objects.length && nonObjects.length) {
        throw new Error('boss-css/merge: cannot mix object inputs with className values')
    }

    if (objects.length) {
        return deepMerge(...objects)
    }

    return defaultMerge(...(inputs as ClassNameValue[]))
}

function resolveConfig(config: BossMergeConfig): ResolvedConfig {
    const cacheSize = config.cacheSize ?? defaultConfig.cacheSize
    const sortContexts = config.sortContexts ?? defaultConfig.sortContexts
    const orderSensitiveContexts = config.orderSensitiveContexts ?? defaultConfig.orderSensitiveContexts
    const compoundContexts = config.compoundContexts ?? defaultConfig.compoundContexts

    const conflictMap = normalizeConflictMap(
        config.conflictMap ? { ...defaultConfig.conflictMap, ...config.conflictMap } : defaultConfig.conflictMap,
    )

    return {
        cacheSize,
        sortContexts,
        orderSensitiveContexts,
        orderSensitiveSet: new Set(orderSensitiveContexts),
        compoundContexts,
        compoundContextSet: new Set(compoundContexts),
        conflictMap,
        cache: createLruCache(cacheSize),
    }
}

const mergeClassList = (classList: string, config: ResolvedConfig): string => {
    const tokens = splitSelectors(classList)
    const parsedTokens: ParsedToken[] = []
    const lastIndexByKey = new Map<string, number>()

    for (const token of tokens.flatMap(expandGroupedSelector)) {
        const parsed = parseToken(token)

        if (parsed) {
            const { contexts, prop } = parsed
            const contextTokens = normalizeContexts(contexts, config)
            const contextKey = contextTokens.join(':')
            const exactKey = buildKey(contextKey, prop)
            const previousExactIndex = lastIndexByKey.get(exactKey)

            if (previousExactIndex !== undefined) {
                parsedTokens[previousExactIndex] = { value: '' }
            }

            const shorthandConflicts = config.conflictMap.get(prop)
            if (shorthandConflicts?.length) {
                for (const longhand of shorthandConflicts) {
                    const previousLonghandIndex = lastIndexByKey.get(buildKey(contextKey, longhand))
                    if (previousLonghandIndex !== undefined) {
                        parsedTokens[previousLonghandIndex] = { value: '' }
                    }
                }
            }

            lastIndexByKey.set(exactKey, parsedTokens.length)
        }

        parsedTokens.push({ value: token })
    }

    return parsedTokens
        .filter(entry => entry.value)
        .map(entry => entry.value)
        .join(' ')
}

const toValue = (mix: ClassNameValue): string => {
    if (!mix) return ''
    if (typeof mix === 'string') return mix

    if (typeof mix === 'object' && Array.isArray(mix)) {
        let resolvedValue: string
        let string = ''

        for (let k = 0; k < mix.length; k++) {
            if (mix[k]) {
                if ((resolvedValue = toValue(mix[k]))) {
                    string && (string += ' ')
                    string += resolvedValue
                }
            }
        }

        return string
    }

    return ''
}

const splitSelectors = (input: string) => {
    const results: string[] = []
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

const expandGroupedSelector = (selector: string): string[] => {
    const grouped = parseGroupedSelector(selector)
    if (!grouped) return [selector]

    const nextEntries = grouped.entries.map(entry => ({
        name: entry.name,
        rawValue: entry.rawValue,
    }))

    if (nextEntries.length > 1) {
        const sortedEntries = [...nextEntries].sort((a, b) => a.name.localeCompare(b.name))
        return sortedEntries.map(entry => `${grouped.prefix}:${entry.name}:${entry.rawValue}`)
    }

    const [entry] = nextEntries
    return [`${grouped.prefix}:{${entry.name}:${entry.rawValue}}`]
}

const parseGroupedSelector = (selector: string) => {
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
        .filter((entry): entry is { name: string; rawValue: string } => Boolean(entry))

    if (!entries.length) return null

    return { prefix, entries }
}

const splitFragments = (selector: string) => splitOutside(selector, ':')

const splitOutside = (input: string, delimiter: string) => {
    const results: string[] = []
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

const splitOnceOutside = (input: string, delimiter: string) => {
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

const findGroupStart = (selector: string) => {
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

const parseToken = (token: string): { contexts: string[]; prop: string } | null => {
    const grouped = parseGroupedSelector(token)
    if (grouped) {
        if (grouped.entries.length !== 1) return null
        const [entry] = grouped.entries
        if (!isCssPropName(entry.name)) return null

        const contexts = splitFragments(grouped.prefix)
        return { contexts, prop: entry.name }
    }

    const fragments = splitFragments(token)
    if (fragments.length < 2) return null

    const propIndex = findFirstCssPropIndex(fragments)
    if (propIndex === -1) return null

    const contexts = fragments.slice(0, propIndex)
    const prop = fragments[propIndex]

    return { contexts, prop }
}

const normalizeContexts = (contexts: string[], config: ResolvedConfig): string[] => {
    const compound = combineCompoundContexts(contexts, config.compoundContextSet)
    if (!config.sortContexts) return compound

    return sortContexts(compound, config.orderSensitiveSet)
}

const combineCompoundContexts = (contexts: string[], compoundSet: Set<string>) => {
    const combined: string[] = []

    for (let i = 0; i < contexts.length; i += 1) {
        const current = contexts[i]
        if (compoundSet.has(current) && contexts[i + 1]) {
            combined.push(`${current}:${contexts[i + 1]}`)
            i += 1
            continue
        }

        combined.push(current)
    }

    return combined
}

const sortContexts = (contexts: string[], orderSensitiveSet: Set<string>) => {
    const result: string[] = []
    let currentSegment: string[] = []

    const isOrderSensitive = (context: string) => {
        if (orderSensitiveSet.has(context)) return true
        const base = splitFragments(context)[0]
        return orderSensitiveSet.has(base)
    }

    for (const context of contexts) {
        if (isOrderSensitive(context)) {
            if (currentSegment.length) {
                currentSegment.sort()
                result.push(...currentSegment)
                currentSegment = []
            }
            result.push(context)
        } else {
            currentSegment.push(context)
        }
    }

    if (currentSegment.length) {
        currentSegment.sort()
        result.push(...currentSegment)
    }

    return result
}

const buildKey = (contexts: string, prop: string) => {
    return contexts ? `${contexts}|${prop}` : `|${prop}`
}

const findFirstCssPropIndex = (fragments: string[]) => {
    for (let i = 0; i < fragments.length; i += 1) {
        if (isCssPropName(fragments[i])) return i
    }

    return -1
}

const isCssPropName = (name: string) => {
    const cached = cssPropCache.get(name)
    if (cached !== undefined) return cached

    const camelName = dashToCamelCase(name)
    const result = isCssProp('div', name) || isCssProp('div', camelName)

    cssPropCache.set(name, result)
    return result
}

const dashToCamelCase = (str: string) => {
    return str.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())
}

function createLruCache<Key extends string, Value>(maxCacheSize: number): LruCache<Key, Value> {
    if (maxCacheSize < 1) {
        return {
            get: () => undefined,
            set: () => {},
        }
    }

    let cacheSize = 0
    let cache: Record<Key, Value> = Object.create(null)
    let previousCache: Record<Key, Value> = Object.create(null)

    const update = (key: Key, value: Value) => {
        cache[key] = value
        cacheSize += 1

        if (cacheSize > maxCacheSize) {
            cacheSize = 0
            previousCache = cache
            cache = Object.create(null)
        }
    }

    return {
        get(key) {
            let value = cache[key]

            if (value !== undefined) {
                return value
            }
            if ((value = previousCache[key]) !== undefined) {
                update(key, value)
                return value
            }
        },
        set(key, value) {
            if (key in cache) {
                cache[key] = value
            } else {
                update(key, value)
            }
        },
    }
}

function normalizeConflictMap(conflictMap: Record<string, string[]>) {
    const normalized = new Map<string, string[]>()

    for (const [key, values] of Object.entries(conflictMap)) {
        normalized.set(key, unique(values))
    }

    return normalized
}

function unique<T>(items: T[]) {
    return Array.from(new Set(items))
}

const isPlainObject = (value: unknown): value is MergeObject => {
    return !!value && typeof value === 'object' && !Array.isArray(value)
}
