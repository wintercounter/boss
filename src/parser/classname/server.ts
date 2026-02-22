import type { BossServerApi, Plugin } from '@/types'

export const name = 'classname'

export const onParse: Plugin<'onParse'> = async (api, input) => {
    if (api.runtime?.only) return
    const log = api.log.child('parser').child('classname')
    const { content } = input
    const { codes: extractedCodes } = extractCode(content)

    const results = await Promise.all(extractedCodes.map(v => extractPropTree(v, api)))

    for (const [key, tree] of Object.entries(results)) {
        if (!Object.keys(tree).length) continue

        log.log('onPropTree', tree)
        await api.trigger('onPropTree', {
            input: api.propTreeToObject(tree),
            tree,
            preferVariables: false,
            file: input,
            code: extractedCodes[key as unknown as number],
            parser: 'classname',
        })
    }
}

const templateRegexp = /`([\S\s]+?)`/g
const quoteRegexps = [/"(.+?)"/g, /'(.+?)'/g, templateRegexp]

const extractCode = (content: string) => {
    const results: string[] = []

    for (const regexp of quoteRegexps) {
        const matches = content.matchAll(regexp)
        const isTemplate = regexp === templateRegexp

        for (const match of matches) {
            const [, code] = match
            if (isTemplate && code.includes('${')) {
                console.warn(
                    '[boss-css] classname parser skipped template literals with expressions. Classnames must be static.',
                )
                console.warn(code)
                continue
            }
            results.push(code)
        }
    }

    return { codes: results }
}

type PropNode = {
    value: string | string[] | null | PropTree
    important?: boolean
    classToken?: string
    selectorName?: string
    selectorValue?: unknown
}

type PropTree = Record<string, PropNode>

const extractPropTree = async (string: string, api: BossServerApi) => {
    const tree: PropTree = {}
    const selectorTokens = new Map<string, string>()
    const selectors = splitSelectors(string.replace(/[\n\r]/g, ' '))
    const resolveDescriptor = (fragment: string) => {
        if (getChildSelector(fragment)) return api.dictionary.resolve('child')
        return api.dictionary.resolve(fragment)
    }

    selectors.forEach(selector => {
        const grouped = parseGroupedSelector(selector)

        if (grouped) {
            const rawFragments = splitFragments(grouped.prefix)
            const descriptor = resolveDescriptor(stripImportantSuffix(rawFragments[0])).descriptor

            if (!descriptor || rawFragments.length === 0) return

            const fragments = expandFragments(rawFragments)

            grouped.entries.forEach(({ name, rawValue }) => {
                const entryDescriptor = resolveDescriptor(name).descriptor
                if (!entryDescriptor?.isCSSProp) return
                const { value, important } = parseImportantValue(rawValue)
                const prop: PropNode = { value }
                if (important) {
                    prop.important = true
                }
                const path = [...fragments, name]
                const key = pathKey(path)
                createPropPath([...path], prop, tree)
                selectorTokens.set(key, selector)
            })
            return
        }

        const rawFragments = splitFragments(selector)
        let value = null
        let important = false
        const path = []
        const descriptor = resolveDescriptor(
            rawFragments.length === 1 ? stripImportantSuffix(rawFragments[0]) : rawFragments[0],
        ).descriptor

        // is single: "a" will be ignored if descriptor didn't specify it as a single prop
        if (!descriptor || (rawFragments.length === 1 && !descriptor.single)) return

        for (const [index, fragment] of Object.entries(rawFragments)) {
            const isLast = rawFragments.length === +index + 1
            // if there's a path and this is the last item, we treat it as a value
            if (path.length && isLast) {
                const parsed = parseImportantValue(fragment)
                value = parsed.value
                important = parsed.important
            } else {
                const cleanedFragment = stripImportantSuffix(fragment)
                if (isLast && rawFragments.length === 1 && cleanedFragment !== fragment) {
                    important = true
                }
                const childSelector = getChildSelector(cleanedFragment)
                if (childSelector) {
                    path.push('child', childSelector)
                } else {
                    path.push(cleanedFragment)
                }
            }
        }

        if (path.length) {
            const lastProp = path.at(-1)
            const lastDescriptor = lastProp ? resolveDescriptor(lastProp).descriptor : null
            if (!lastDescriptor?.isCSSProp) return
            const key = pathKey(path)
            const prop: PropNode = { value }
            if (important) {
                prop.important = true
                prop.classToken = selector
            }
            if (lastProp) {
                prop.selectorName = lastProp
            }
            prop.selectorValue = value
            createPropPath([...path], prop, tree)
            selectorTokens.delete(key)
        }
    })

    applySelectorTokens(tree, selectorTokens)
    return tree
}

const splitSelectors = (string: string) => splitOutside(string, ' ')

const splitFragments = (selector: string) => splitOutside(selector, ':')

const splitGroupedEntries = (body: string) => splitOutside(body, ';')

const splitGroupedEntry = (entry: string) => splitOnceOutside(entry, ':')

const parseGroupedSelector = (selector: string) => {
    if (!selector.endsWith('}')) return null

    const groupStart = findGroupStart(selector)
    if (groupStart === -1) return null

    const prefix = selector.slice(0, groupStart)
    const body = selector.slice(groupStart + 2, -1)

    const entries = splitGroupedEntries(body)
        .map(entry => entry.trim())
        .filter(Boolean)
        .map(entry => {
            const parts = splitGroupedEntry(entry)
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

const splitOutside = (input: string, delimiter: string) => {
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

const getChildSelector = (fragment: string) => {
    if (!fragment || !fragment.startsWith('[') || !fragment.endsWith(']')) return null
    return fragment.slice(1, -1)
}

const expandFragments = (fragments: string[]) => {
    const path = []

    for (const fragment of fragments) {
        const childSelector = getChildSelector(fragment)
        if (childSelector) {
            path.push('child', childSelector)
        } else {
            path.push(fragment)
        }
    }

    return path
}

const parseValue = (rawValue: string) => {
    return rawValue.includes('_') ? rawValue.split('_') : rawValue
}

const parseImportantValue = (rawValue: string) => {
    if (!rawValue) return { value: rawValue, important: false }
    const important = rawValue.endsWith('!')
    const trimmed = important ? rawValue.slice(0, -1) : rawValue
    return { value: parseValue(trimmed), important }
}

const stripImportantSuffix = (fragment: string) => {
    return fragment && fragment.endsWith('!') ? fragment.slice(0, -1) : fragment
}

const pathKey = (path: string[]) => path.join('>')

const createPropPath = (path: string[], prop: PropNode, obj: PropTree) => {
    const last = path.pop()
    if (!last) return

    for (const key of path) {
        obj[key] = obj[key] || { value: {} }
        const next = obj[key].value
        if (!next || typeof next !== 'object' || Array.isArray(next)) {
            return
        }
        obj = next
    }

    typeof obj === 'object' && (obj[last] = prop)
}

const applySelectorTokens = (tree: PropTree, selectorTokens: Map<string, string>, path: string[] = []) => {
    Object.entries(tree).forEach(([name, prop]) => {
        const nextPath = [...path, name]
        const token = selectorTokens.get(pathKey(nextPath))

        if (token) {
            prop.classToken = token
        }

        if (prop.value && typeof prop.value === 'object' && !Array.isArray(prop.value)) {
            applySelectorTokens(prop.value, selectorTokens, nextPath)
        }
    })
}
