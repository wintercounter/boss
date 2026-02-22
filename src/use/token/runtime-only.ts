import { createTokenVars } from '@/use/token/vars.js'
import { getTokenGroupsForProp, setTokenPropGroups } from '@/use/token/propMap'
import { normalizeTokens } from '@/use/token/normalize'
import type { BossBrowserApi, Plugin } from '@/types'

let currentApi: BossBrowserApi | null = null
type TokenVarsBuilder = (input?: Record<string, unknown>) => Record<string, string | number>
type TokenFn = (() => string) & { IS_TOKEN_FN?: boolean }
export type TokenProxy = TokenFn & { [key: string]: TokenProxy }

const tokenVarsCache = new WeakMap<object, TokenVarsBuilder>()

const getTokenVars = (api: BossBrowserApi | null) => {
    if (!api) return null
    const cached = tokenVarsCache.get(api)
    if (cached) return cached

    const builder = createTokenVars({
        prefix: api.selectorPrefix ?? '',
        toValue: (value, property) => {
            const resolved = api.dictionary.toValue(value as never, property)
            if (typeof resolved === 'number' || typeof resolved === 'string') return resolved
            if (resolved == null) return null
            return String(resolved)
        },
    })
    tokenVarsCache.set(api, builder)
    return builder
}

export const tokenVars = (input?: Record<string, unknown>) => {
    const builder = getTokenVars(currentApi)
    return builder ? builder(input) : {}
}

export const onInit: Plugin<'onInit'> = api => {
    currentApi = api
    if (api.tokenPropGroups) {
        setTokenPropGroups(api.tokenPropGroups)
    }
    if (!api.tokenVars) {
        api.tokenVars = tokenVars
    }
}

export const create = (currentKey = '$$.token'): TokenProxy => {
    const baseFn = (() => currentKey) as TokenProxy
    const toVarString = () => {
        if (!currentKey.startsWith('$$.token.')) return currentKey
        const path = currentKey.slice('$$.token.'.length)
        if (!path) return currentKey
        const prefix = currentApi?.selectorPrefix ?? ''
        return `var(--${prefix}${path.replace(/\./g, '-')})`
    }
    return new Proxy(baseFn, {
        get(target, key: string | symbol) {
            if (key === 'IS_TOKEN_FN') return true
            if (key === 'toString') return toVarString
            return typeof key === 'string' ? create(`${target()}.${key}`) : undefined
        },
    }) as TokenProxy
}

export const tokenPaths = new Set<string>()

const defaultTokens = {
    color: {
        black: '#000',
        white: '#fff',
    },
}

const mergeTokens = (base: Record<string, unknown>, incoming?: Record<string, unknown>) => {
    if (!incoming || typeof incoming !== 'object') return { ...base }
    const result = { ...base }
    for (const [key, value] of Object.entries(incoming)) {
        if (value && typeof value === 'object' && !Array.isArray(value) && typeof result[key] === 'object') {
            result[key] = mergeTokens(result[key] as Record<string, unknown>, value as Record<string, unknown>)
        } else {
            result[key] = value
        }
    }
    return result
}

const tokenState = new WeakMap<object, { groups: Record<string, unknown> }>()
const tokenAlphaKeyPattern = /^[a-zA-Z0-9_.-]+$/

const getTokenState = (api: BossBrowserApi) => {
    if (tokenState.has(api)) {
        return tokenState.get(api) as { groups: Record<string, unknown> }
    }

    const tokens = normalizeTokens(mergeTokens(defaultTokens as Record<string, unknown>, api.tokens as Record<string, unknown>))

    const state = { groups: tokens }
    tokenState.set(api, state)
    return state
}

const resolveTokenParts = (values: Record<string, any>, pathParts: string[]) => {
    if (!pathParts.length) return values
    return pathParts.reduce((acc, key) => acc?.[key]?.value ?? acc?.[key]?.$value ?? acc?.[key], values)
}

const parseTokenAlphaValue = (value: string) => {
    const slashIndex = value.lastIndexOf('/')
    if (slashIndex <= 0 || slashIndex === value.length - 1) return null

    const base = value.slice(0, slashIndex)
    const alphaRaw = value.slice(slashIndex + 1)

    if (!tokenAlphaKeyPattern.test(base)) return null

    if (!/^\d{1,3}$/.test(alphaRaw)) {
        return { base, alpha: null }
    }

    const alpha = Number(alphaRaw)
    if (!Number.isInteger(alpha) || alpha < 0 || alpha > 100) {
        return { base, alpha: null }
    }

    return { base, alpha }
}

const isTokenFunction = (value: unknown): value is TokenFn =>
    typeof value === 'function' && Boolean(value && (value as TokenFn).IS_TOKEN_FN)

const getTokenPath = (api: BossBrowserApi, prop: string, value: unknown) => {
    if (isTokenFunction(value)) {
        const path = value().replace('$$.token.', '')
        return { path, source: 'group' as const }
    }

    if (typeof value === 'string' && value.startsWith('$$.token.')) {
        return { path: value.replace('$$.token.', ''), source: 'group' as const }
    }

    if (typeof value !== 'string') return null

    const { groups } = getTokenState(api)
    const dashProp = api?.camelCaseToDash ? api.camelCaseToDash(prop) : prop
    const groupCandidates: string[] = []
    const seen = new Set<string>()
    const addCandidate = (group: string | null | undefined) => {
        if (!group || seen.has(group)) return
        seen.add(group)
        groupCandidates.push(group)
    }
    for (const group of getTokenGroupsForProp(prop)) addCandidate(group)
    for (const group of getTokenGroupsForProp(dashProp)) addCandidate(group)
    addCandidate(prop)
    addCandidate(dashProp)

    if (!groupCandidates.length) return null

    if (typeof value !== 'string') return null

    const tokenAlphaCandidate = parseTokenAlphaValue(value)
    const baseParts = tokenAlphaCandidate ? tokenAlphaCandidate.base.split('.') : []
    const rawParts = value.split('.')
    const colorTokens = groups?.color as Record<string, unknown> | undefined

    for (const group of groupCandidates) {
        const values = groups?.[group] as Record<string, any> | undefined
        if (!values) continue
        if (tokenAlphaCandidate && values === colorTokens) {
            const baseValue = resolveTokenParts(values as Record<string, any>, baseParts)
            if (baseValue === undefined) continue
            if (tokenAlphaCandidate.alpha === null) return null
            return {
                path: `${group}.${tokenAlphaCandidate.base}`,
                source: 'prop' as const,
                values: values as Record<string, any>,
                alpha: tokenAlphaCandidate.alpha,
                selectorValue: value,
            }
        }
        const dottedValue = resolveTokenParts(values as Record<string, any>, rawParts)
        if (dottedValue !== undefined) {
            return { path: `${group}.${value}`, source: 'prop' as const, values: values as Record<string, any> }
        }
        if (value in values) {
            return { path: `${group}.${value}`, source: 'prop' as const, values: values as Record<string, any> }
        }
    }
    return null
}

export const resolveRuntimeToken = (api: BossBrowserApi, prop: string, value: unknown) => {
    const tokenData = getTokenPath(api, prop, value) as {
        path: string
        source: 'group' | 'prop'
        values?: Record<string, any>
        alpha?: number
        selectorValue?: string
    } | null
    if (!tokenData) return null

    const { groups } = getTokenState(api)
    let tokenValue
    if (tokenData.source === 'group') {
        const parts = tokenData.path.split('.')
        const [group, ...rest] = parts
        const values = groups[group]
        if (!values) return null
        tokenValue = resolveTokenParts(values, rest)
    } else {
        tokenValue = resolveTokenParts(tokenData.values ?? {}, tokenData.path.split('.').slice(1))
    }
    if (tokenValue === undefined) return null

    const runtimeOnly = api.runtime?.only === true
    const hasServerToken = tokenPaths.has(tokenData.path)
    const tokenKey = tokenData.selectorValue ?? tokenData.path.split('.').slice(1).join('.')
    const varName = `--${api.selectorPrefix ?? ''}${tokenData.path.replace(/\./g, '-')}`
    const varValue = `var(${varName})`
    const mixValue =
        tokenData.alpha === undefined
            ? null
            : `color-mix(in oklab, ${runtimeOnly || hasServerToken ? varValue : tokenValue} ${tokenData.alpha}%, transparent)`

    if (runtimeOnly) {
        if (api.css && typeof api.css.addRoot === 'function') {
            const resolvedValue = api.dictionary.toValue(tokenValue)
            if (resolvedValue !== undefined && resolvedValue !== null) {
                api.css.addRoot(`${varName}: ${resolvedValue};`)
            }
        }
        return {
            value: mixValue ?? varValue,
            selectorValue: tokenKey,
            tokenKey,
            tokenPath: tokenData.path,
        }
    }

    if (!hasServerToken) {
        return {
            value: mixValue ?? tokenValue,
            selectorValue: tokenData.alpha === undefined ? tokenValue : tokenKey,
            tokenKey,
            tokenPath: tokenData.path,
        }
    }

    return { value: mixValue ?? varValue, selectorValue: tokenKey, tokenKey, tokenPath: tokenData.path }
}

export const onBrowserObjectStart: Plugin<'onBrowserObjectStart'> = () => {}
