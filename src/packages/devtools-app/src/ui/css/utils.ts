import type { TokenSnapshot } from '../../types'
import { toDashCase, toCamelCase } from './properties'

const unitlessFallback = new Set([
    'opacity',
    'z-index',
    'font-weight',
    'line-height',
    'flex',
    'flex-grow',
    'flex-shrink',
    'order',
    'zoom',
])

export const normalizePropName = (value: string) => toDashCase(value)

export const isUnitlessProp = (name: string) => unitlessFallback.has(normalizePropName(name))

export const parseInlineStyles = (styleText: string) => {
    const entries: Record<string, string> = {}
    if (!styleText) return entries
    for (const chunk of styleText.split(';')) {
        const [rawName, ...rest] = chunk.split(':')
        if (!rawName || !rest.length) continue
        const name = rawName.trim()
        const value = rest.join(':').trim()
        if (!name) continue
        entries[name] = value
    }
    return entries
}

export const getTokenGroup = (name: string, tokens: TokenSnapshot | null) => {
    if (!name || !tokens?.propGroups) return null
    const normalized = normalizePropName(name)
    const camel = toCamelCase(normalized)
    for (const [group, props] of Object.entries(tokens.propGroups)) {
        if (props.includes(name) || props.includes(normalized) || props.includes(camel)) return group
    }
    return null
}

const readTokenValue = (tokens: Record<string, any> | undefined, path: string) => {
    if (!tokens) return null
    const parts = path.split('.').filter(Boolean)
    let current: any = tokens
    for (const part of parts) {
        if (!current || typeof current !== 'object') return null
        current = current[part]
        if (current && typeof current === 'object' && 'value' in current) {
            current = current.value
        }
    }
    if (typeof current === 'string' || typeof current === 'number') return String(current)
    return null
}

export const resolveTokenValue = (propName: string, value: string, tokens: TokenSnapshot | null) => {
    if (!value) return null
    if (!tokens?.tokens) return null

    let path = value.trim()
    if (path.startsWith('$$.token.')) {
        path = path.replace('$$.token.', '')
        const [group, ...rest] = path.split('.')
        if (!group) return null
        return readTokenValue(tokens.tokens[group], rest.join('.'))
    }

    const group = getTokenGroup(propName, tokens)
    if (!group) return null
    if (path.startsWith(`${group}.`)) {
        path = path.slice(group.length + 1)
    }

    return readTokenValue(tokens.tokens[group], path)
}

export const resolvePreviewValue = (
    propName: string,
    value: string,
    tokens: TokenSnapshot | null,
    hostApi?: { dictionary?: { toValue?: (value: unknown, prop?: string) => unknown } },
) => {
    if (!value) return ''
    const tokenValue = resolveTokenValue(propName, value, tokens)
    if (tokenValue) return tokenValue

    const trimmed = value.trim()
    if (/^-?\d+(?:\.\d+)?$/.test(trimmed)) {
        const num = Number(trimmed)
        if (!Number.isNaN(num)) {
            const withHost = hostApi?.dictionary?.toValue?.(num, propName)
            if (withHost !== undefined) return String(withHost)
            if (num === 0 || unitlessFallback.has(normalizePropName(propName))) return String(num)
            return `${num}px`
        }
    }

    return value
}

export const toInputValue = (value: string | null | undefined) => (value ? value : '')

export const asNumber = (value: string, fallback: number) => {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : fallback
}

export const formatNumber = (value: number, digits = 2) => {
    const rounded = Number(value.toFixed(digits))
    return String(rounded)
}

export const mergeValue = (value: string, fallback: string) => (value !== '' ? value : fallback)

export const isColorProp = (name: string) => {
    const normalized = normalizePropName(name)
    return (
        normalized.includes('color') ||
        normalized.includes('fill') ||
        normalized.includes('stroke') ||
        normalized === 'background' ||
        normalized === 'box-shadow' ||
        normalized === 'text-shadow'
    )
}

export const buildTokenOptions = (values?: Record<string, any>, prefix = ''): Array<{ key: string; value: string }> => {
    if (!values || typeof values !== 'object') return []
    const entries: Array<{ key: string; value: string }> = []
    for (const [key, value] of Object.entries(values)) {
        const nextKey = prefix ? `${prefix}.${key}` : key
        if (value && typeof value === 'object') {
            const maybeValue = (value as { value?: unknown }).value
            if (typeof maybeValue === 'string' || typeof maybeValue === 'number') {
                entries.push({ key: nextKey, value: String(maybeValue) })
                continue
            }
            entries.push(...buildTokenOptions(value, nextKey))
        } else {
            entries.push({ key: nextKey, value: String(value) })
        }
    }
    return entries
}

export const getTokenOptionsForProp = (prop: string, tokens: TokenSnapshot | null) => {
    const group = getTokenGroup(prop, tokens)
    if (!group || !tokens?.tokens) return []
    return buildTokenOptions(tokens.tokens[group])
}

export const getAllTokenOptions = (tokens: TokenSnapshot | null) => {
    if (!tokens?.tokens) return []
    const entries: Array<{ key: string; value: string }> = []
    for (const [group, values] of Object.entries(tokens.tokens)) {
        entries.push(...buildTokenOptions(values, group))
    }
    return entries
}

export const isTokenValue = (prop: string, value: string, tokens: TokenSnapshot | null) => {
    if (!value) return false
    if (value.trim().startsWith('$$.token.')) return true
    const group = getTokenGroup(prop, tokens)
    if (!group || !tokens?.tokens) return false

    const normalized = value.startsWith('$$.token.') ? value.replace('$$.token.', '') : value
    const path = normalized.startsWith(`${group}.`) ? normalized.slice(group.length + 1) : normalized
    return Boolean(readTokenValue(tokens.tokens[group], path))
}
