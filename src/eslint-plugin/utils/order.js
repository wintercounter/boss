import {
    parseGroupedSelector,
    splitFragments,
    isCssPropName,
    getDictionary,
    getDictionaryEntry,
} from './boss-classes.js'
import { propertyOrder } from './property-order.js'

const dashToCamelCase = str => str.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())

const getOrderMap = () => {
    const map = new Map()
    const dictionary = getDictionary()

    for (const [index, prop] of propertyOrder.entries()) {
        if (!map.has(prop)) map.set(prop, index)
    }

    if (!dictionary) return map

    for (const entry of dictionary.values()) {
        if (!entry?.isCSSProp) continue
        if (map.has(entry.property)) continue

        map.set(entry.property, map.size)
    }

    return map
}

const getTokenInfo = (token, extraProps) => {
    const grouped = parseGroupedSelector(token)
    if (grouped) {
        if (grouped.entries.length !== 1) return null
        const [entry] = grouped.entries
        if (!isCssPropName(entry.name, extraProps)) return null

        return {
            contexts: splitFragments(grouped.prefix),
            prop: entry.name,
        }
    }

    const fragments = splitFragments(token)
    if (!fragments.length) return null

    let propIndex = -1
    for (let i = 0; i < fragments.length; i += 1) {
        if (isCssPropName(fragments[i], extraProps)) {
            propIndex = i
            break
        }
    }

    if (propIndex === -1) return null

    return {
        contexts: fragments.slice(0, propIndex),
        prop: fragments[propIndex],
    }
}

const sortOfficial = classOrder => {
    return classOrder
        .toSorted(([, a], [, b]) => {
            if (a === b) return 0
            if (a === null) return -1
            if (b === null) return 1
            return a - b
        })
        .map(([className]) => className)
}

const sortTokens = (tokens, options) => {
    const order = options.order ?? 'improved'

    if (order === 'none') return tokens

    if (order === 'asc' || order === 'desc') {
        const sorted = [...tokens].sort((a, b) => a.localeCompare(b))
        return order === 'desc' ? sorted.reverse() : sorted
    }

    const extraProps = options.additionalProps?.length ? new Set(options.additionalProps) : null
    const orderMap = getOrderMap()

    const classOrder = tokens.map(token => {
        const info = getTokenInfo(token, extraProps)
        if (!info) return [token, null]

        const entry = getDictionaryEntry(info.prop)
        const orderIndex =
            (entry?.property ? orderMap.get(entry.property) : null) ??
            orderMap.get(info.prop) ??
            orderMap.get(dashToCamelCase(info.prop)) ??
            null

        return [token, orderIndex]
    })

    const official = sortOfficial(classOrder)

    if (order === 'official') return official

    const grouped = new Map()
    for (const className of official) {
        const info = getTokenInfo(className, extraProps)
        const variants = info ? info.contexts.join(':') : ''
        grouped.set(variants, [...(grouped.get(variants) ?? []), className])
    }

    return Array.from(grouped.values()).flat()
}

export { sortTokens }
