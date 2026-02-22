import { createTokenVars } from '@/use/token/vars'
import { getTokenGroupsForProp, setTokenPropGroups } from '@/use/token/propMap'
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

// runtime imported
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

export const tokenPaths = new Set()

const isTokenFn = (value: unknown): value is TokenFn => {
    return typeof value === 'function' && Boolean((value as TokenFn).IS_TOKEN_FN)
}

export const onBrowserObjectStart: Plugin<'onBrowserObjectStart'> = (api, { input }) => {
    const isClassnameFirst = api.strategy === 'classname-first'
    const mutableInput = input as Record<string, unknown>
    const prefix = api.selectorPrefix ?? ''
    const toTokenVar = (path: string) => `var(--${prefix}${path.replace(/\./g, '-')})`

    for (const prop in mutableInput) {
        const value = mutableInput[prop]
        if (isTokenFn(value)) {
            const path = value().replace('$$.token.', '')
            if (isClassnameFirst) {
                mutableInput[prop] = path.split('.').slice(1).join('.')
            } else {
                mutableInput[prop] = toTokenVar(path)
            }
        } else if (typeof value === 'string' && value.startsWith('$$.token.')) {
            const path = value.replace('$$.token.', '')
            if (isClassnameFirst) {
                mutableInput[prop] = path.split('.').slice(1).join('.')
            } else {
                mutableInput[prop] = toTokenVar(path)
            }
        } else if (typeof prop === 'string') {
            const rawValue = mutableInput[prop]
            if (typeof rawValue !== 'string') continue
            const dashProp = api.camelCaseToDash?.(prop) ?? prop
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
            const groupName = groupCandidates.find(group => tokenPaths.has(`${group}.${rawValue}`))
            if (groupName && !isClassnameFirst) {
                mutableInput[prop] = toTokenVar(`${groupName}.${rawValue.replace('$$.token.', '')}`)
            }
        }
    }
}

/*const $$ = {}

$$.token = create()

console.log($$.token.foo.bar.baz.kek.nek.jujj.andy())*/
