import { setBosswindSelectorMap } from '@/prop/bosswind/selectors'

export type BosswindConfig = {
    fontSizeKeys?: string[]
    defaults?: {
        borderWidth?: string | number
        borderRadius?: string
        boxShadow?: string
    }
}

type BosswindPropEntry = {
    name: string
    description: string
    single?: boolean
}

const toDashCase = (value: string) => value.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()

const displayKeywords = new Map<string, string>([
    ['block', 'block'],
    ['inline', 'inline'],
    ['inlineBlock', 'inline-block'],
    ['inlineFlex', 'inline-flex'],
    ['inlineGrid', 'inline-grid'],
    ['contents', 'contents'],
    ['flowRoot', 'flow-root'],
    ['table', 'table'],
    ['inlineTable', 'inline-table'],
    ['tableRow', 'table-row'],
    ['tableCell', 'table-cell'],
])

const positionKeywords = new Map<string, string>([
    ['static', 'static'],
    ['relative', 'relative'],
    ['absolute', 'absolute'],
    ['fixed', 'fixed'],
    ['sticky', 'sticky'],
])

const booleanAliases = new Map<string, { prop: string; value: string }>([
    ['flexRow', { prop: 'flexDirection', value: 'row' }],
    ['flexCol', { prop: 'flexDirection', value: 'column' }],
    ['flexWrap', { prop: 'flexWrap', value: 'wrap' }],
    ['flexNoWrap', { prop: 'flexWrap', value: 'nowrap' }],
])

const aliasMap = new Map<string, string[]>([
    ['p', ['padding']],
    ['px', ['paddingLeft', 'paddingRight']],
    ['py', ['paddingTop', 'paddingBottom']],
    ['pt', ['paddingTop']],
    ['pr', ['paddingRight']],
    ['pb', ['paddingBottom']],
    ['pl', ['paddingLeft']],
    ['m', ['margin']],
    ['mx', ['marginLeft', 'marginRight']],
    ['my', ['marginTop', 'marginBottom']],
    ['mt', ['marginTop']],
    ['mr', ['marginRight']],
    ['mb', ['marginBottom']],
    ['ml', ['marginLeft']],
    ['gapX', ['columnGap']],
    ['gapY', ['rowGap']],
    ['w', ['width']],
    ['h', ['height']],
    ['minW', ['minWidth']],
    ['minH', ['minHeight']],
    ['maxW', ['maxWidth']],
    ['maxH', ['maxHeight']],
    ['inset', ['top', 'right', 'bottom', 'left']],
    ['insetX', ['left', 'right']],
    ['insetY', ['top', 'bottom']],
    ['basis', ['flexBasis']],
    ['items', ['alignItems']],
    ['justify', ['justifyContent']],
    ['self', ['alignSelf']],
    ['leading', ['lineHeight']],
    ['tracking', ['letterSpacing']],
    ['z', ['zIndex']],
    ['aspect', ['aspectRatio']],
])

const textAlias = 'text'
const bgAlias = 'bg'
const borderAlias = 'border'

const axisPairs = [
    {
        x: 'translateX',
        y: 'translateY',
        prop: 'translate',
        defaults: { x: 0, y: 0 },
    },
    {
        x: 'scaleX',
        y: 'scaleY',
        prop: 'scale',
        defaults: { x: 1, y: 1 },
    },
]

const borderWidthKeywords = new Set(['thin', 'medium', 'thick'])

export const getBosswindMeta = () => {
    return {
        props: bosswindProps,
        aliasMap: Object.fromEntries(aliasMap.entries()),
        booleanAliases: Object.fromEntries(booleanAliases.entries()),
        displayKeywords: Array.from(displayKeywords.keys()),
        positionKeywords: Array.from(positionKeywords.keys()),
        axisPairs: axisPairs.map(pair => ({ x: pair.x, y: pair.y, prop: pair.prop })),
    }
}

const toTokenPath = (value: string, tokens: Record<string, unknown> | undefined) => {
    if (!tokens || !value.includes('-')) return value
    const parts = value.split('-')
    if (parts.length < 2) return value
    const [prefix, ...restParts] = parts
    const suffix = restParts.join('-')
    const group = tokens[prefix]
    if (!group || typeof group !== 'object') return value
    const groupRecord = group as Record<string, unknown>
    if (suffix in groupRecord) return `${prefix}.${suffix}`
    return value
}

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

const isNumericString = (value: string) => /^-?\d+(?:\.\d+)?$/.test(value)

const isLengthLike = (value: unknown) => {
    if (typeof value === 'number') return true
    if (typeof value !== 'string') return false
    if (isNumericString(value)) return true
    if (value.startsWith('calc(') || value.startsWith('clamp(') || value.startsWith('min(') || value.startsWith('max(')) {
        return true
    }
    return /^-?\d+(?:\.\d+)?(px|rem|em|vh|vw|vmin|vmax|ch|ex|%|pt|pc|mm|cm|in)$/.test(value)
}

const readTokenGroup = (value: unknown) => {
    if (typeof value === 'function' && (value as { IS_TOKEN_FN?: boolean }).IS_TOKEN_FN) {
        const path = String((value as () => unknown)()).replace('$$.token.', '')
        const [group, ...rest] = path.split('.')
        return { group, path: rest.join('.') }
    }
    if (typeof value === 'string' && value.startsWith('$$.token.')) {
        const path = value.replace('$$.token.', '')
        const [group, ...rest] = path.split('.')
        return { group, path: rest.join('.') }
    }
    return null
}

const resolveTextTarget = (
    _api: import('@/types').BossApiBase,
    value: unknown,
    config: BosswindConfig,
    tokens: Record<string, unknown> | undefined,
) => {
    const tokenGroup = readTokenGroup(value)
    if (tokenGroup?.group === 'fontSize') {
        return { prop: 'fontSize', value }
    }
    if (tokenGroup?.group === 'color') {
        return { prop: 'color', value }
    }

    if (typeof value === 'string' && tokens?.color) {
        const normalized = toTokenPath(value, tokens.color as Record<string, unknown>)
        if (normalized !== value) {
            return { prop: 'color', value: normalized }
        }
    }

    if (typeof value === 'string' && tokens?.fontSize) {
        const normalized = toTokenPath(value, tokens.fontSize as Record<string, unknown>)
        if (normalized !== value) {
            return { prop: 'fontSize', value: normalized }
        }
    }

    if (isLengthLike(value)) {
        return { prop: 'fontSize', value }
    }

    if (typeof value === 'string' && config.fontSizeKeys?.includes(value)) {
        return { prop: 'fontSize', value }
    }

    return { prop: 'color', value }
}

const resolveBorderTarget = (
    value: unknown,
    config: BosswindConfig,
    tokens: Record<string, unknown> | undefined,
) => {
    if (value === null || value === true) {
        return { prop: 'borderWidth', value: config.defaults?.borderWidth ?? 1 }
    }

    if (Array.isArray(value)) {
        return null
    }

    if (typeof value === 'string' && tokens?.color) {
        const normalized = toTokenPath(value, tokens.color as Record<string, unknown>)
        if (normalized !== value) {
            return { prop: 'borderColor', value: normalized }
        }
    }

    if (isLengthLike(value)) {
        return { prop: 'borderWidth', value }
    }

    if (typeof value === 'string' && borderWidthKeywords.has(value)) {
        return { prop: 'borderWidth', value }
    }

    if (typeof value === 'string' && (value.includes(' ') || value.includes('_'))) {
        return null
    }

    return { prop: 'borderColor', value }
}

const resolveBorderToken = (value: unknown, tokens: Record<string, unknown> | undefined) => {
    const tokenGroup = readTokenGroup(value)
    if (tokenGroup?.group === 'color') {
        return { prop: 'borderColor', value }
    }
    if (typeof value === 'string' && tokens?.color) {
        const normalized = toTokenPath(value, tokens.color as Record<string, unknown>)
        if (normalized !== value) {
            return { prop: 'borderColor', value: normalized }
        }
    }
    return null
}

const resolveShadowValue = (value: unknown, config: BosswindConfig) => {
    if (value === null || value === true) {
        return config.defaults?.boxShadow ?? value
    }
    return value
}

const resolveRoundedValue = (value: unknown, config: BosswindConfig) => {
    if (value === null || value === true) {
        return config.defaults?.borderRadius ?? value
    }
    return value
}

const resolveGrowShrinkValue = (name: string, value: unknown) => {
    if (value === null || value === true) {
        return name === 'grow' ? 1 : 1
    }
    return value
}

const resolveTranslateScaleValue = (value: unknown, fallback: unknown) => {
    if (value === null || value === true) return fallback
    return value ?? fallback
}

const resolveSkewAxisValue = (value: unknown, fallback: string) => {
    if (value === null || value === true) return fallback
    if (typeof value === 'number') return `${value}deg`
    if (typeof value === 'string' && isNumericString(value)) return `${value}deg`
    return value
}

const buildSkewTransform = (xValue: unknown, yValue: unknown, includeX: boolean, includeY: boolean) => {
    const parts: string[] = []
    if (includeX) {
        parts.push(`skewX(${xValue})`)
    }
    if (includeY) {
        parts.push(`skewY(${yValue})`)
    }
    return parts.length ? parts.join(' ') : null
}

const resolveSkewTransformValue = (
    xValue: unknown,
    yValue: unknown,
    includeX: boolean,
    includeY: boolean,
) => {
    const hasFn = typeof xValue === 'function' || typeof yValue === 'function'
    if (hasFn) {
        return () => {
            const resolvedX = includeX
                ? resolveSkewAxisValue(typeof xValue === 'function' ? xValue() : xValue, '0deg')
                : null
            const resolvedY = includeY
                ? resolveSkewAxisValue(typeof yValue === 'function' ? yValue() : yValue, '0deg')
                : null
            return buildSkewTransform(resolvedX, resolvedY, includeX, includeY)
        }
    }
    const resolvedX = includeX ? resolveSkewAxisValue(xValue, '0deg') : null
    const resolvedY = includeY ? resolveSkewAxisValue(yValue, '0deg') : null
    return buildSkewTransform(resolvedX, resolvedY, includeX, includeY)
}

export const bosswindProps: BosswindPropEntry[] = [
    { name: 'p', description: 'Padding (all sides).' },
    { name: 'px', description: 'Padding on the x-axis (left + right).' },
    { name: 'py', description: 'Padding on the y-axis (top + bottom).' },
    { name: 'pt', description: 'Padding top.' },
    { name: 'pr', description: 'Padding right.' },
    { name: 'pb', description: 'Padding bottom.' },
    { name: 'pl', description: 'Padding left.' },
    { name: 'm', description: 'Margin (all sides).' },
    { name: 'mx', description: 'Margin on the x-axis (left + right).' },
    { name: 'my', description: 'Margin on the y-axis (top + bottom).' },
    { name: 'mt', description: 'Margin top.' },
    { name: 'mr', description: 'Margin right.' },
    { name: 'mb', description: 'Margin bottom.' },
    { name: 'ml', description: 'Margin left.' },
    { name: 'gapX', description: 'Column gap.' },
    { name: 'gapY', description: 'Row gap.' },
    { name: 'w', description: 'Width.' },
    { name: 'h', description: 'Height.' },
    { name: 'minW', description: 'Min width.' },
    { name: 'minH', description: 'Min height.' },
    { name: 'maxW', description: 'Max width.' },
    { name: 'maxH', description: 'Max height.' },
    { name: 'inset', description: 'Top, right, bottom, left.' },
    { name: 'insetX', description: 'Left and right.' },
    { name: 'insetY', description: 'Top and bottom.' },
    { name: 'grow', description: 'Flex grow.', single: true },
    { name: 'shrink', description: 'Flex shrink.', single: true },
    { name: 'basis', description: 'Flex basis.' },
    { name: 'items', description: 'Align items.' },
    { name: 'justify', description: 'Justify content.' },
    { name: 'self', description: 'Align self.' },
    { name: 'leading', description: 'Line height.' },
    { name: 'tracking', description: 'Letter spacing.' },
    { name: 'rounded', description: 'Border radius.', single: true },
    { name: 'shadow', description: 'Box shadow.', single: true },
    { name: 'z', description: 'Z index.' },
    { name: 'aspect', description: 'Aspect ratio.' },
    { name: 'text', description: 'Text color or font size.' },
    { name: 'bg', description: 'Background color.' },
    { name: 'border', description: 'Border width or border color.', single: true },
    { name: 'block', description: 'Display block.', single: true },
    { name: 'inline', description: 'Display inline.', single: true },
    { name: 'inlineBlock', description: 'Display inline-block.', single: true },
    { name: 'inlineFlex', description: 'Display inline-flex.', single: true },
    { name: 'inlineGrid', description: 'Display inline-grid.', single: true },
    { name: 'contents', description: 'Display contents.', single: true },
    { name: 'flowRoot', description: 'Display flow-root.', single: true },
    { name: 'table', description: 'Display table.', single: true },
    { name: 'inlineTable', description: 'Display inline-table.', single: true },
    { name: 'tableRow', description: 'Display table-row.', single: true },
    { name: 'tableCell', description: 'Display table-cell.', single: true },
    { name: 'static', description: 'Position static.', single: true },
    { name: 'relative', description: 'Position relative.', single: true },
    { name: 'absolute', description: 'Position absolute.', single: true },
    { name: 'fixed', description: 'Position fixed.', single: true },
    { name: 'sticky', description: 'Position sticky.', single: true },
    { name: 'flexRow', description: 'Flex direction row.', single: true },
    { name: 'flexCol', description: 'Flex direction column.', single: true },
    { name: 'flexWrap', description: 'Flex wrap.', single: true },
    { name: 'flexNoWrap', description: 'Flex nowrap.', single: true },
    { name: 'translateX', description: 'Translate x-axis.' },
    { name: 'translateY', description: 'Translate y-axis.' },
    { name: 'scaleX', description: 'Scale x-axis.' },
    { name: 'scaleY', description: 'Scale y-axis.' },
    { name: 'skewX', description: 'Skew x-axis.' },
    { name: 'skewY', description: 'Skew y-axis.' },
]

const bosswindDashAliases = new Map<string, string>(
    bosswindProps
        .map(entry => [toDashCase(entry.name), entry.name] as const)
        .filter(([dashName, original]) => dashName !== original),
)

const normalizeBosswindName = (name: string) => bosswindDashAliases.get(name) ?? name

export const registerBosswindDictionary = (api: import('@/types').BossApiBase) => {
    for (const entry of bosswindProps) {
        if (entry.name === 'flex' || entry.name === 'grid') continue
        const aliases = new Set([entry.name])
        const dashedAlias = toDashCase(entry.name)
        if (dashedAlias !== entry.name) {
            aliases.add(dashedAlias)
        }
        const prop = {
            property: entry.name,
            aliases: Array.from(aliases),
            description: entry.description,
            values: [],
            initial: '',
            isCSSProp: true,
            single: entry.single === true,
        }
        api.dictionary.set(entry.name, prop)
    }
}

const selectorValueUnset = Symbol('selectorValueUnset')

const cloneProp = (
    prop: import('@/types').BossProp,
    value: unknown,
    selectorName?: string,
    selectorValue: unknown = selectorValueUnset,
): import('@/types').BossProp => {
    const next = {
        ...prop,
        value,
    } as import('@/types').BossProp
    if (selectorName && selectorName !== prop.selectorName) {
        next.selectorName = selectorName
    }
    if (selectorValue !== selectorValueUnset) {
        next.selectorValue = selectorValue
    }
    return next
}

const combineAxisValues = (xValue: unknown, yValue: unknown, defaults: { x: number; y: number }) => {
    const hasFn = typeof xValue === 'function' || typeof yValue === 'function'
    if (hasFn) {
        return () => [
            resolveTranslateScaleValue(typeof xValue === 'function' ? xValue() : xValue, defaults.x),
            resolveTranslateScaleValue(typeof yValue === 'function' ? yValue() : yValue, defaults.y),
        ]
    }
    return [resolveTranslateScaleValue(xValue, defaults.x), resolveTranslateScaleValue(yValue, defaults.y)]
}

const resolveAxisPairs = (entries: Array<[string, import('@/types').BossProp]>, node: Record<string, import('@/types').BossProp>) => {
    const results: Array<{ emitIndex: number; prop: string; x: string; y: string; defaults: { x: number; y: number } }> = []
    for (const pair of axisPairs) {
        if (pair.prop in node) continue
        const xIndex = entries.findIndex(([name]) => name === pair.x)
        const yIndex = entries.findIndex(([name]) => name === pair.y)
        if (xIndex === -1 && yIndex === -1) continue
        const emitIndex = Math.min(xIndex === -1 ? Number.POSITIVE_INFINITY : xIndex, yIndex === -1 ? Number.POSITIVE_INFINITY : yIndex)
        results.push({
            emitIndex,
            prop: pair.prop,
            x: pair.x,
            y: pair.y,
            defaults: pair.defaults,
        })
    }
    return results
}

const applyAxisPairsToTree = (
    entries: Array<[string, import('@/types').BossProp]>,
    node: Record<string, import('@/types').BossProp>,
    output: Record<string, import('@/types').BossProp>,
    used: Map<string, boolean>,
    getSelectorName?: (name: string) => string,
) => {
    const pairs = resolveAxisPairs(entries, node)
    if (!pairs.length) return
    for (const pair of pairs) {
        if (!Number.isFinite(pair.emitIndex)) continue
        const xValue = node[pair.x]?.value ?? null
        const yValue = node[pair.y]?.value ?? null
        const xIndex = entries.findIndex(([name]) => name === pair.x)
        const yIndex = entries.findIndex(([name]) => name === pair.y)
        const sourceName =
            xIndex === -1 ? pair.y : yIndex === -1 ? pair.x : xIndex <= yIndex ? pair.x : pair.y
        const selectorName = getSelectorName ? getSelectorName(sourceName) : undefined
        const sourceProp = node[sourceName] || node[pair.x] || node[pair.y]
        const selectorValue =
            sourceProp?.selectorValue !== undefined ? sourceProp.selectorValue : sourceProp?.value
        output[pair.prop] = cloneProp(
            sourceProp,
            combineAxisValues(xValue, yValue, pair.defaults),
            selectorName,
            selectorValue,
        )
        used.set(pair.x, true)
        used.set(pair.y, true)
        used.set(`__emit:${pair.emitIndex}:${pair.prop}`, true)
    }
}

export const rewriteBosswindTree = (
    api: import('@/types').BossApiBase,
    tree: import('@/types').BossPropTree,
    config: BosswindConfig,
    tokens: Record<string, unknown> | undefined,
    parser?: string,
) => {
    let usedBosswind = false
    let usedText = false

    const rewriteNode = (node: import('@/types').BossPropTree) => {
        const rawEntries = Object.entries(node) as Array<[string, import('@/types').BossProp]>
        const entries: Array<[string, import('@/types').BossProp]> = []
        const normalizedNode: import('@/types').BossPropTree = {}

        const rawNameByNormalized = new Map<string, string>()

        rawEntries.forEach(([rawName, prop]) => {
            const name = normalizeBosswindName(rawName)
            if (Object.prototype.hasOwnProperty.call(normalizedNode, name)) return
            normalizedNode[name] = prop
            rawNameByNormalized.set(name, rawName)
            entries.push([name, prop])
        })

        const getSelectorName = (name: string) => rawNameByNormalized.get(name) ?? name

        const output: Record<string, import('@/types').BossProp> = {}
        const used = new Map<string, boolean>()

        applyAxisPairsToTree(entries, normalizedNode, output, used, getSelectorName)

        const hasSkewX = Object.prototype.hasOwnProperty.call(normalizedNode, 'skewX')
        const hasSkewY = Object.prototype.hasOwnProperty.call(normalizedNode, 'skewY')
        if (!Object.prototype.hasOwnProperty.call(normalizedNode, 'transform') && (hasSkewX || hasSkewY)) {
            const xValue = hasSkewX ? normalizedNode.skewX?.value ?? null : null
            const yValue = hasSkewY ? normalizedNode.skewY?.value ?? null : null
            const transformValue = resolveSkewTransformValue(xValue, yValue, hasSkewX, hasSkewY)
            if (transformValue) {
                const sourceName = hasSkewX ? 'skewX' : 'skewY'
                const sourceProp = normalizedNode[sourceName]
                if (sourceProp) {
                    const selectorValue =
                        sourceProp.selectorValue !== undefined ? sourceProp.selectorValue : sourceProp.value
                    output.transform = cloneProp(
                        sourceProp,
                        transformValue,
                        getSelectorName(sourceName),
                        selectorValue,
                    )
                }
                used.set('skewX', true)
                used.set('skewY', true)
            }
        }

        entries.forEach(([name, prop], index) => {
            if (used.get(name)) return
            if (used.get(`__emit:${index}:${name}`)) return
            if (prop?.value && isPlainObject(prop.value)) {
                const nested = rewriteNode(prop.value as import('@/types').BossPropTree)
                if (Object.keys(nested).length) {
                    output[name] = { ...prop, value: nested }
                }
                return
            }

            const value = prop?.value

            if (name === 'flex' || name === 'grid') {
                if (value === null || value === true) {
                    output.display = cloneProp(prop, name, getSelectorName(name), null)
                    usedBosswind = true
                    return
                }
                output[name] = prop
                return
            }

            if (displayKeywords.has(name)) {
                if (value === null || value === true) {
                    const displayValue = displayKeywords.get(name)
                    if (displayValue) {
                        output.display = cloneProp(prop, displayValue, getSelectorName(name), null)
                    }
                }
                usedBosswind = true
                return
            }

            if (positionKeywords.has(name)) {
                if (value === null || value === true) {
                    const positionValue = positionKeywords.get(name)
                    if (positionValue) {
                        output.position = cloneProp(prop, positionValue, getSelectorName(name), null)
                    }
                }
                usedBosswind = true
                return
            }

            if (booleanAliases.has(name)) {
                if (value === null || value === true) {
                    const entry = booleanAliases.get(name)
                    if (entry) {
                        output[entry.prop] = cloneProp(prop, entry.value, getSelectorName(name), null)
                    }
                }
                usedBosswind = true
                return
            }

            if (name === textAlias) {
                usedBosswind = true
                usedText = true
                if (value === null || value === true) return
                const resolved = resolveTextTarget(api, value, config, tokens)
                output[resolved.prop] = cloneProp(prop, resolved.value, getSelectorName(name))
                return
            }

            if (name === bgAlias) {
                usedBosswind = true
                if (value === null || value === true) return
                const normalized =
                    typeof value === 'string' && tokens?.color
                        ? toTokenPath(value, tokens.color as Record<string, unknown>)
                        : value
                output.backgroundColor = cloneProp(prop, normalized, getSelectorName(name))
                return
            }

            if (name === borderAlias) {
                usedBosswind = true
                if (parser === 'jsx') {
                    const resolvedToken = resolveBorderToken(value, tokens)
                    if (resolvedToken) {
                        output[resolvedToken.prop] = cloneProp(prop, resolvedToken.value, getSelectorName(name))
                        return
                    }
                    if (value === null || value === true) {
                        output[name] = cloneProp(prop, value, getSelectorName(name), null)
                    } else {
                        output[name] = cloneProp(prop, value, getSelectorName(name))
                    }
                    return
                }
                const resolved = resolveBorderTarget(value, config, tokens)
                if (!resolved) {
                    output[name] = cloneProp(prop, value, getSelectorName(name))
                    return
                }
                if (value === null || value === true) {
                    output[resolved.prop] = cloneProp(prop, resolved.value, getSelectorName(name), null)
                } else {
                    output[resolved.prop] = cloneProp(prop, resolved.value, getSelectorName(name))
                }
                return
            }

            if (name === 'shadow') {
                usedBosswind = true
                if (value === null || value === true) {
                    output.boxShadow = cloneProp(prop, resolveShadowValue(value, config), getSelectorName(name), null)
                } else {
                    output.boxShadow = cloneProp(prop, value, getSelectorName(name))
                }
                return
            }

            if (name === 'rounded') {
                usedBosswind = true
                if (value === null || value === true) {
                    output.borderRadius = cloneProp(
                        prop,
                        resolveRoundedValue(value, config),
                        getSelectorName(name),
                        null,
                    )
                } else {
                    output.borderRadius = cloneProp(prop, value, getSelectorName(name))
                }
                return
            }

            if (name === 'grow' || name === 'shrink') {
                usedBosswind = true
                const target = name === 'grow' ? 'flexGrow' : 'flexShrink'
                if (value === null || value === true) {
                    output[target] = cloneProp(prop, resolveGrowShrinkValue(name, value), getSelectorName(name), null)
                } else {
                    output[target] = cloneProp(prop, resolveGrowShrinkValue(name, value), getSelectorName(name))
                }
                return
            }

            if (aliasMap.has(name)) {
                usedBosswind = true
                if (value === null || value === true) return
                const targets = aliasMap.get(name) || []
                const resolvedValue = name === 'shadow' ? resolveShadowValue(value, config) : value
                targets.forEach(target => {
                    output[target] = cloneProp(prop, resolvedValue, getSelectorName(name))
                })
                return
            }

            output[name] = prop
        })

        return output
    }

    const next = rewriteNode(tree)
    return { tree: next, usedBosswind, usedText }
}

const applyAxisPairsToInput = (
    entries: Array<[string, unknown]>,
    input: Record<string, unknown>,
    output: Record<string, unknown>,
    used: Map<string, boolean>,
    getSelectorName: (name: string) => string,
    setSelector: (prop: string, name: string, valueOverride?: unknown) => void,
) => {
    const pairs = resolveAxisPairs(
        entries as Array<[string, import('@/types').BossProp]>,
        input as Record<string, import('@/types').BossProp>,
    )
    if (!pairs.length) return
    for (const pair of pairs) {
        if (!Number.isFinite(pair.emitIndex)) continue
        const xValue = input[pair.x]
        const yValue = input[pair.y]
        output[pair.prop] = combineAxisValues(xValue, yValue, pair.defaults)
        const xIndex = entries.findIndex(([name]) => name === pair.x)
        const yIndex = entries.findIndex(([name]) => name === pair.y)
        const sourceName =
            xIndex === -1 ? pair.y : yIndex === -1 ? pair.x : xIndex <= yIndex ? pair.x : pair.y
        setSelector(pair.prop, getSelectorName(sourceName))
        used.set(pair.x, true)
        used.set(pair.y, true)
        used.set(`__emit:${pair.emitIndex}:${pair.prop}`, true)
    }
}

export const rewriteBosswindInput = (
    api: import('@/types').BossApiBase,
    input: Record<string, unknown>,
    config: BosswindConfig,
) => {
    const rawEntries = Object.entries(input)
    const entries: Array<[string, unknown]> = []
    const normalizedInput: Record<string, unknown> = {}
    const rawNameByNormalized = new Map<string, string>()

    rawEntries.forEach(([rawName, value]) => {
        const name = normalizeBosswindName(rawName)
        if (Object.prototype.hasOwnProperty.call(normalizedInput, name)) return
        normalizedInput[name] = value
        rawNameByNormalized.set(name, rawName)
        entries.push([name, value])
    })

    const selectorMap = new Map<string, { name: string; value?: unknown }>()
    const getSelectorName = (name: string) => rawNameByNormalized.get(name) ?? name
    const setSelector = (prop: string, name: string, valueOverride?: unknown) => {
        const entry: { name: string; value?: unknown } = { name }
        if (valueOverride !== undefined) {
            entry.value = valueOverride
        }
        selectorMap.set(prop, entry)
    }

    const output: Record<string, unknown> = {}
    const used = new Map<string, boolean>()

    applyAxisPairsToInput(entries, normalizedInput, output, used, getSelectorName, setSelector)

    const hasSkewX = Object.prototype.hasOwnProperty.call(normalizedInput, 'skewX')
    const hasSkewY = Object.prototype.hasOwnProperty.call(normalizedInput, 'skewY')
    if (!Object.prototype.hasOwnProperty.call(normalizedInput, 'transform') && (hasSkewX || hasSkewY)) {
        const xValue = hasSkewX ? normalizedInput.skewX : null
        const yValue = hasSkewY ? normalizedInput.skewY : null
        const transformValue = resolveSkewTransformValue(xValue, yValue, hasSkewX, hasSkewY)
        if (transformValue) {
            output.transform = transformValue
            const sourceName = hasSkewX ? 'skewX' : 'skewY'
            setSelector('transform', getSelectorName(sourceName))
            used.set('skewX', true)
            used.set('skewY', true)
        }
    }

    entries.forEach(([name, value], index) => {
        if (used.get(name)) return
        if (used.get(`__emit:${index}:${name}`)) return

        if (value && isPlainObject(value)) {
            output[name] = rewriteBosswindInput(api, value, config)
            return
        }

        if (name === 'flex' || name === 'grid') {
            if (value === null || value === true) {
                output.display = name
                setSelector('display', getSelectorName(name), null)
            } else {
                output[name] = value
            }
            return
        }

        if (displayKeywords.has(name)) {
            if (value === null || value === true) {
                const displayValue = displayKeywords.get(name)
                if (displayValue) {
                    output.display = displayValue
                    setSelector('display', getSelectorName(name), null)
                }
            }
            return
        }

        if (positionKeywords.has(name)) {
            if (value === null || value === true) {
                const positionValue = positionKeywords.get(name)
                if (positionValue) {
                    output.position = positionValue
                    setSelector('position', getSelectorName(name), null)
                }
            }
            return
        }

        if (booleanAliases.has(name)) {
            if (value === null || value === true) {
                const entry = booleanAliases.get(name)
                if (entry) {
                    output[entry.prop] = entry.value
                    setSelector(entry.prop, getSelectorName(name), null)
                }
            }
            return
        }

        if (name === textAlias) {
            if (value === null || value === true) return
            const resolved = resolveTextTarget(api, value, config, undefined)
            output[resolved.prop] = resolved.value
            setSelector(resolved.prop, getSelectorName(name))
            return
        }

        if (name === bgAlias) {
            if (value === null || value === true) return
            output.backgroundColor = value
            setSelector('backgroundColor', getSelectorName(name))
            return
        }

        if (name === borderAlias) {
            const resolvedToken = resolveBorderToken(value, api.tokens as Record<string, unknown> | undefined)
            if (resolvedToken) {
                output[resolvedToken.prop] = resolvedToken.value
                setSelector(resolvedToken.prop, getSelectorName(name))
                return
            }
            output[name] = value
            if (value === null || value === true) {
                setSelector(name, getSelectorName(name), null)
            } else {
                setSelector(name, getSelectorName(name))
            }
            return
        }

        if (name === 'shadow') {
            output.boxShadow = resolveShadowValue(value, config)
            if (value === null || value === true) {
                setSelector('boxShadow', getSelectorName(name), null)
            } else {
                setSelector('boxShadow', getSelectorName(name))
            }
            return
        }

        if (name === 'rounded') {
            output.borderRadius = resolveRoundedValue(value, config)
            if (value === null || value === true) {
                setSelector('borderRadius', getSelectorName(name), null)
            } else {
                setSelector('borderRadius', getSelectorName(name))
            }
            return
        }

        if (name === 'grow' || name === 'shrink') {
            output[name === 'grow' ? 'flexGrow' : 'flexShrink'] = resolveGrowShrinkValue(name, value)
            if (value === null || value === true) {
                setSelector(name === 'grow' ? 'flexGrow' : 'flexShrink', getSelectorName(name), null)
            } else {
                setSelector(name === 'grow' ? 'flexGrow' : 'flexShrink', getSelectorName(name))
            }
            return
        }

        if (aliasMap.has(name)) {
            if (value === null || value === true) return
            const targets = aliasMap.get(name) || []
            targets.forEach(target => {
                output[target] = value
                setSelector(target, getSelectorName(name))
            })
            return
        }

        output[name] = value
    })

    setBosswindSelectorMap(output, selectorMap)
    return output
}

export const getBosswindDefaults = (theme: Record<string, unknown>) => {
    const borderRadius = (theme.borderRadius as Record<string, string> | undefined)?.DEFAULT
    const boxShadow = (theme.boxShadow as Record<string, string> | undefined)?.DEFAULT
    const borderWidth = (theme.borderWidth as Record<string, string> | undefined)?.DEFAULT

    return {
        borderRadius: borderRadius ?? '0.25rem',
        boxShadow:
            boxShadow ??
            '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        borderWidth: borderWidth ?? 1,
    }
}

export const getBosswindFontSizeKeys = (theme: Record<string, unknown>) => {
    const fontSize = theme.fontSize as Record<string, unknown> | undefined
    return fontSize ? Object.keys(fontSize) : []
}
