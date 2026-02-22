import { resolveRuntimeToken } from '@/use/token/runtime-only'
import type { BossBrowserApi, Plugin } from '@/types'

const ignoredProps = new Set(['ref', 'children', 'as', 'className', 'css', 'child', 'at', 'pseudo'])

const isNumericValue = (value: unknown) => {
    if (typeof value === 'number') return true
    if (typeof value !== 'string') return false
    return /^-?\d+(?:\.\d+)?$/.test(value)
}

const normalizeValue = (value: unknown): unknown => {
    if (Array.isArray(value)) {
        return value.map(entry => normalizeValue(entry))
    }
    if (isNumericValue(value)) {
        return typeof value === 'string' ? Number(value) : value
    }
    return value
}

const resolveTokenLiteral = (api: BossBrowserApi, tokenPath: string) => {
    const tokens = typeof api.tokens === 'function' ? api.tokens({}) : api.tokens
    if (!tokens || typeof tokens !== 'object') return undefined
    const [group, ...rest] = tokenPath.split('.')
    let current: any = (tokens as Record<string, unknown>)[group]
    for (const key of rest) {
        if (!current || typeof current !== 'object') return undefined
        const next = (current as Record<string, any>)[key]
        current = next && typeof next === 'object' && 'value' in next ? next.value : next
    }
    return current
}

const getStyleProps = (api: BossBrowserApi & { nativeStylePropSet?: Set<string> }) => {
    if (!api.nativeStyleProps) return new Set()
    api.nativeStylePropSet ??= new Set(api.nativeStyleProps)
    return api.nativeStylePropSet as Set<string>
}

export const name = 'native'

export const onBrowserObjectStart: Plugin<'onBrowserObjectStart'> = (api, { input, output = {} }) => {
    const styleProps = getStyleProps(api)
    const bossStyle: Record<string, unknown> = {}
    let hasBossStyle = false

    for (const prop in input) {
        if (ignoredProps.has(prop)) {
            delete input[prop]
            continue
        }

        if (prop === 'style') {
            output.style = input[prop]
            delete input[prop]
            continue
        }

        const isStyleProp = styleProps.has(prop)
        if (!isStyleProp) {
            output[prop] = input[prop]
            delete input[prop]
            continue
        }

        let value = input[prop]
        if (typeof value === 'function') {
            value = value()
        }
        const token = resolveRuntimeToken(api, prop, value)
        if (token) {
            const isRuntimeOnly = api.runtime?.only === true
            if (
                isRuntimeOnly &&
                typeof token.value === 'string' &&
                token.value.startsWith('var(') &&
                token.tokenPath
            ) {
                const literal = resolveTokenLiteral(api, token.tokenPath)
                value = literal ?? token.value
            } else {
                value = token.value
            }
        }
        bossStyle[prop] = normalizeValue(value)
        hasBossStyle = true
        delete input[prop]
    }

    if (!hasBossStyle) return

    if (!output.style) {
        output.style = bossStyle
        return
    }

    if (Array.isArray(output.style)) {
        output.style = [...output.style, bossStyle]
        return
    }

    if (typeof output.style === 'object') {
        output.style = { ...output.style, ...bossStyle }
        return
    }

    output.style = [output.style, bossStyle]
}
