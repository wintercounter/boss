import {
    baseAtValues,
    buildContainerQuery,
    buildMediaQuery,
    defaultBreakpoints,
    parseContainerContext,
    parseRangeKey,
} from '@/prop/at/shared'
import type { BossBrowserApi, Plugin } from '@/types'

const atValuesCache = new WeakMap<object, Map<string, string>>()

const buildQuery = (from: number | null, to: number | null) => {
    if (from === null && to === null) return ''
    if (from === null) return `@media screen and (max-width: ${to}px)`
    if (to === null) return `@media screen and (min-width: ${from}px)`
    return `@media screen and (min-width: ${from}px) and (max-width: ${to}px)`
}

const getAtValues = (api: BossBrowserApi) => {
    if (atValuesCache.has(api)) return atValuesCache.get(api) as Map<string, string>

    const values = new Map(baseAtValues)
    const breakpoints = getAtBreakpoints(api)

    Object.entries(breakpoints).forEach(([name, [from, to]]) => {
        values.set(name, buildQuery(from, to))
        if (!name.endsWith('+') && !name.endsWith('-')) {
            values.set(`${name}+`, buildQuery(from, null))
            values.set(`${name}-`, buildQuery(null, to))
        }
    })

    atValuesCache.set(api, values)
    return values
}

const getAtBreakpoints = (api: BossBrowserApi): Record<string, [number | null, number | null]> => ({
    ...defaultBreakpoints,
    ...(api.breakpoints ?? {}),
})

const getContainerInfo = (contexts: string[]) => {
    for (let i = contexts.length - 1; i >= 0; i -= 1) {
        const info = parseContainerContext(contexts[i])
        if (info) return { ...info, index: i }
    }
    return null
}

const resolveMediaQuery = (api: BossBrowserApi, key: string) => {
    const values = getAtValues(api)
    const direct = values.get(key)
    if (direct) return direct
    const range = parseRangeKey(key, getAtBreakpoints(api), api.unit ?? 'px')
    if (range) return buildMediaQuery(range) ?? key
    return key
}

const resolveContainerQuery = (api: BossBrowserApi, key: string, name: string | null) => {
    if (key.startsWith('@')) return key
    const range = parseRangeKey(key, getAtBreakpoints(api), api.unit ?? 'px')
    if (range) return buildContainerQuery(range, name)
    const prefix = name ? `@container ${name}` : '@container'
    return `${prefix} ${key}`
}

export const resolveAtQuery = (api: BossBrowserApi, contexts: string[]) => {
    const atIndex = contexts.lastIndexOf('at')
    if (atIndex !== -1 && contexts[atIndex + 1]) {
        const containerInfo = parseContainerContext(contexts[atIndex + 1])
        if (containerInfo) {
            const key = contexts[atIndex + 2]
            if (!key) return null
            return resolveContainerQuery(api, key, containerInfo.name)
        }
        const key = contexts[atIndex + 1]
        return resolveMediaQuery(api, key)
    }

    const containerInfo = getContainerInfo(contexts)
    if (containerInfo) {
        const key = contexts[containerInfo.index + 1]
        if (key) return resolveContainerQuery(api, key, containerInfo.name)
    }

    for (let i = contexts.length - 1; i >= 0; i -= 1) {
        const key = contexts[i]
        if (key.startsWith('@')) return key
        const range = parseRangeKey(key, getAtBreakpoints(api), api.unit ?? 'px')
        if (range) return buildMediaQuery(range) ?? key
        const values = getAtValues(api)
        if (values.has(key)) return values.get(key) as string
    }

    return null
}

export const name = 'at'

export const onInit: Plugin<'onInit'> = api => {
    api.breakpoints = {
        ...defaultBreakpoints,
        ...(api.breakpoints ?? {}),
    }
}
