import type { DebugValue } from '@/shared/types'

export type DebugMatcher = (namespace: string) => boolean

const truthyValues = new Set(['1', 'true', 'yes', 'on'])
const falsyValues = new Set(['0', 'false', 'no', 'off'])

const normalizeDebugValue = (value: unknown): DebugValue => {
    if (value === undefined || value === null) return undefined
    if (typeof value === 'boolean') return value
    if (typeof value === 'number') return value > 0
    if (typeof value !== 'string') return undefined

    const trimmed = value.trim()
    if (!trimmed) return undefined

    const lowered = trimmed.toLowerCase()
    if (truthyValues.has(lowered)) return true
    if (falsyValues.has(lowered)) return false

    return trimmed
}

const readLocalStorageDebug = (): DebugValue => {
    if (typeof localStorage === 'undefined') return undefined
    try {
        return normalizeDebugValue(localStorage.getItem('BOSS_DEBUG'))
    } catch {
        return undefined
    }
}

const readGlobalDebug = (): DebugValue => {
    if (typeof globalThis === 'undefined') return undefined
    return normalizeDebugValue((globalThis as { BOSS_DEBUG?: unknown }).BOSS_DEBUG)
}

const readEnvDebug = (): DebugValue => {
    if (typeof process === 'undefined' || !process.env) return undefined
    return normalizeDebugValue(process.env.BOSS_DEBUG)
}

export const resolveDebugValue = (explicit?: DebugValue): DebugValue => {
    if (explicit !== undefined) return explicit

    const fromStorage = readLocalStorageDebug()
    if (fromStorage !== undefined) return fromStorage

    const fromGlobal = readGlobalDebug()
    if (fromGlobal !== undefined) return fromGlobal

    return readEnvDebug()
}

const escapeRegexp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export const createDebugMatcher = (debug: DebugValue): DebugMatcher => {
    if (debug === true) {
        return () => true
    }
    if (!debug || debug === false) {
        return () => false
    }

    const rawPatterns = debug
        .split(/[\s,]+/)
        .map(pattern => pattern.trim())
        .filter(Boolean)

    if (!rawPatterns.length) {
        return () => false
    }

    const includes: RegExp[] = []
    const excludes: RegExp[] = []

    for (const pattern of rawPatterns) {
        const isExclude = pattern.startsWith('-')
        const raw = isExclude ? pattern.slice(1) : pattern
        if (!raw) continue
        const regex = new RegExp(`^${escapeRegexp(raw).replace(/\\\*/g, '.*?')}$`)
        if (isExclude) {
            excludes.push(regex)
        } else {
            includes.push(regex)
        }
    }

    return (namespace: string) => {
        if (excludes.some(regex => regex.test(namespace))) return false
        if (!includes.length) return false
        return includes.some(regex => regex.test(namespace))
    }
}
