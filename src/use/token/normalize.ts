const isPlainObject = (value: unknown): value is Record<string, unknown> => {
    return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

const hasDtcgValue = (value: unknown): value is { $value: unknown; $type?: unknown } => {
    return isPlainObject(value) && Object.prototype.hasOwnProperty.call(value, '$value')
}

const hasValueEntry = (value: unknown): value is { value: unknown; $type?: unknown } => {
    return (
        isPlainObject(value) &&
        Object.prototype.hasOwnProperty.call(value, 'value') &&
        !Object.prototype.hasOwnProperty.call(value, 'unit')
    )
}

const hasRefEntry = (value: unknown): value is { $ref: string } => {
    return isPlainObject(value) && typeof value.$ref === 'string'
}

const decodeJsonPointer = (segment: string) => segment.replace(/~1/g, '/').replace(/~0/g, '~')

const resolveJsonPointer = (root: Record<string, unknown>, pointer: string) => {
    if (!pointer.startsWith('#/')) return undefined
    const parts = pointer.slice(2).split('/').map(decodeJsonPointer)
    let current: unknown = root
    for (const part of parts) {
        if (Array.isArray(current)) {
            const index = Number(part)
            if (!Number.isInteger(index) || index < 0 || index >= current.length) return undefined
            current = current[index]
            continue
        }
        if (!isPlainObject(current)) return undefined
        current = current[part]
    }
    return current
}

const resolvePath = (root: Record<string, unknown>, path: string) => {
    const parts = path.split('.').filter(Boolean)
    let current: unknown = root
    for (const part of parts) {
        if (!isPlainObject(current)) return undefined
        current = current[part]
    }
    return current
}

const resolveTokenValueReference = (root: Record<string, unknown>, path: string) => {
    const node = resolvePath(root, path)
    if (!node) return undefined
    if (hasDtcgValue(node)) return node.$value
    if (hasValueEntry(node)) return node.value
    return node
}

const applyRef = (root: Record<string, unknown>, ref: string) => {
    if (ref.startsWith('#/')) return resolveJsonPointer(root, ref)
    const match = ref.match(/^\{(.+)\}$/)
    if (match) return resolveTokenValueReference(root, match[1])
    return resolveTokenValueReference(root, ref)
}

const mergeGroups = (base: Record<string, unknown>, next: Record<string, unknown>) => {
    const result: Record<string, unknown> = { ...base }
    for (const [key, value] of Object.entries(next)) {
        if (key === '$extends' || key === '$ref') continue
        const existing = result[key]
        const existingIsToken = hasDtcgValue(existing)
        const nextIsToken = hasDtcgValue(value)
        if (!existing || existingIsToken || nextIsToken) {
            result[key] = value
            continue
        }
        if (isPlainObject(existing) && isPlainObject(value)) {
            result[key] = mergeGroups(existing, value)
        } else {
            result[key] = value
        }
    }
    return result
}

const resolveGroupExtends = (
    node: unknown,
    root: Record<string, unknown>,
    stack: Set<string>,
): unknown => {
    if (!isPlainObject(node) || hasDtcgValue(node)) return node

    const extendsValue = node.$extends ?? node.$ref
    const extendRefs = Array.isArray(extendsValue) ? extendsValue : extendsValue ? [extendsValue] : []

    let merged: Record<string, unknown> = {}

    for (const ref of extendRefs) {
        if (typeof ref !== 'string') continue
        if (stack.has(ref)) continue
        const target = ref.startsWith('#/') ? resolveJsonPointer(root, ref) : resolvePath(root, ref.replace(/^\{|\}$/g, ''))
        if (!isPlainObject(target)) continue
        stack.add(ref)
        const resolvedTarget = resolveGroupExtends(target, root, stack)
        stack.delete(ref)
        if (isPlainObject(resolvedTarget)) {
            merged = mergeGroups(merged, resolvedTarget)
        }
    }

    const resolvedNode: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(node)) {
        if (key === '$extends' || key === '$ref') continue
        resolvedNode[key] = resolveGroupExtends(value, root, stack)
    }

    return mergeGroups(merged, resolvedNode)
}

const tokenRefPattern = /\{([^}]+)\}/g

const resolveReferences = (node: unknown, root: Record<string, unknown>, stack: Set<string>): unknown => {
    if (typeof node === 'string') {
        const matches = Array.from(node.matchAll(tokenRefPattern))
        if (!matches.length) return node
        if (matches.length === 1 && matches[0][0] === node) {
            const refPath = matches[0][1]
            if (stack.has(refPath)) return node
            const refValue = resolveTokenValueReference(root, refPath)
            if (refValue === undefined) return node
            stack.add(refPath)
            const resolved = resolveReferences(refValue, root, stack)
            stack.delete(refPath)
            return resolved
        }
        let nextValue = node
        for (const match of matches) {
            const refPath = match[1]
            if (stack.has(refPath)) continue
            const refValue = resolveTokenValueReference(root, refPath)
            if (refValue === undefined) continue
            stack.add(refPath)
            const resolved = resolveReferences(refValue, root, stack)
            stack.delete(refPath)
            nextValue = nextValue.replace(match[0], String(resolved))
        }
        return nextValue
    }

    if (Array.isArray(node)) {
        return node.map(entry => resolveReferences(entry, root, stack))
    }

    if (!isPlainObject(node)) {
        return node
    }

    if (hasRefEntry(node)) {
        const resolved = applyRef(root, node.$ref)
        if (resolved === undefined) return node
        return resolveReferences(resolved, root, stack)
    }

    if (hasDtcgValue(node)) {
        const nextValue = resolveReferences(node.$value, root, stack)
        const result: Record<string, unknown> = { ...node, $value: nextValue }
        return result
    }

    if (hasValueEntry(node)) {
        const nextValue = resolveReferences(node.value, root, stack)
        return { ...node, value: nextValue }
    }

    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(node)) {
        result[key] = resolveReferences(value, root, stack)
    }
    return result
}

const getTokenPathFromRef = (ref: string) => {
    if (ref.startsWith('#/')) {
        const parts = ref.slice(2).split('/').map(decodeJsonPointer)
        if (!parts.length) return null
        const valueIndex = parts.indexOf('$value')
        const typeIndex = parts.indexOf('$type')
        const stopIndex = valueIndex >= 0 ? valueIndex : typeIndex >= 0 ? typeIndex : parts.length
        const tokenParts = parts.slice(0, stopIndex)
        return tokenParts.length ? tokenParts.join('.') : null
    }

    const match = ref.match(/^\{(.+)\}$/)
    if (match) return match[1]
    return ref
}

const getAliasPath = (node: Record<string, unknown>) => {
    const value = hasDtcgValue(node) ? node.$value : hasValueEntry(node) ? node.value : undefined

    if (typeof value === 'string') {
        if (value.startsWith('#/')) return getTokenPathFromRef(value)
        const match = value.match(/^\{(.+)\}$/)
        return match ? match[1] : null
    }

    if (isPlainObject(value) && hasRefEntry(value)) {
        return getTokenPathFromRef(value.$ref)
    }

    if (hasRefEntry(node)) {
        return getTokenPathFromRef(node.$ref)
    }

    return null
}

type TokenTypeMap = Map<string, string | undefined>

type TokenMaps = {
    typeMap: TokenTypeMap
    nodeMap: Map<string, Record<string, unknown>>
}

const buildTokenMaps = (root: Record<string, unknown>): TokenMaps => {
    const typeMap: TokenTypeMap = new Map()
    const nodeMap = new Map<string, Record<string, unknown>>()

    const walk = (node: unknown, path: string[], inheritedType?: string) => {
        if (!isPlainObject(node)) return

        const nodeType = typeof node.$type === 'string' ? node.$type : inheritedType
        const hasOnlyMetaKeys = Object.keys(node).every(key => key.startsWith('$'))
        const isToken = hasDtcgValue(node) || hasValueEntry(node) || (hasRefEntry(node) && hasOnlyMetaKeys)
        if (isToken && path.length) {
            const pathKey = path.join('.')
            typeMap.set(pathKey, nodeType)
            nodeMap.set(pathKey, node)
        }

        for (const [key, value] of Object.entries(node)) {
            if (key.startsWith('$')) continue
            walk(value, [...path, key], nodeType)
        }
    }

    walk(root, [])

    for (let iteration = 0; iteration < 6; iteration += 1) {
        let changed = false
        for (const [path, node] of nodeMap.entries()) {
            if (typeMap.get(path)) continue
            const aliasPath = getAliasPath(node)
            if (!aliasPath) continue
            const aliasType = typeMap.get(aliasPath)
            if (aliasType) {
                typeMap.set(path, aliasType)
                changed = true
            }
        }
        if (!changed) break
    }

    return { typeMap, nodeMap }
}

const isValueUnitObject = (value: Record<string, unknown>) =>
    Object.prototype.hasOwnProperty.call(value, 'value') && Object.prototype.hasOwnProperty.call(value, 'unit')

const normalizeValueUnit = (value: unknown, unit: unknown) => {
    if (typeof value === 'number' || typeof value === 'string') {
        const unitString = typeof unit === 'string' ? unit : unit == null ? '' : String(unit)
        return `${value}${unitString}`
    }
    return value
}

const normalizeFontFamilyToken = (value: string) => {
    const trimmed = value.trim()
    if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
        return trimmed
    }
    const needsQuotes = /\s/.test(trimmed)
    const escaped = trimmed.replace(/"/g, '\\"')
    return needsQuotes ? `"${escaped}"` : escaped
}

const fontWeightMap: Record<string, number> = {
    thin: 100,
    hairline: 100,
    'extra-light': 200,
    'ultra-light': 200,
    light: 300,
    normal: 400,
    regular: 400,
    book: 400,
    medium: 500,
    'semi-bold': 600,
    'demi-bold': 600,
    bold: 700,
    'extra-bold': 800,
    'ultra-bold': 800,
    black: 900,
    heavy: 900,
    'extra-black': 950,
    'ultra-black': 950,
}

const normalizeFontWeight = (value: unknown) => {
    if (typeof value === 'number') return value
    if (typeof value === 'string') {
        const trimmed = value.trim()
        if (/^\d+$/.test(trimmed)) return trimmed
        const normalized = trimmed.toLowerCase().replace(/_/g, '-').replace(/\s+/g, '-')
        return fontWeightMap[normalized] ?? trimmed
    }
    return value
}

const parseHexColor = (input: string) => {
    const raw = input.startsWith('#') ? input.slice(1) : input
    if (![3, 4, 6, 8].includes(raw.length)) return null

    const expand = (value: string) => value.split('').map(ch => ch + ch).join('')
    const hex = raw.length <= 4 ? expand(raw) : raw
    const hasAlpha = hex.length === 8
    const r = parseInt(hex.slice(0, 2), 16)
    const g = parseInt(hex.slice(2, 4), 16)
    const b = parseInt(hex.slice(4, 6), 16)
    const a = hasAlpha ? parseInt(hex.slice(6, 8), 16) / 255 : null
    if ([r, g, b].some(Number.isNaN)) return null
    return { r, g, b, a }
}

const normalizeColor = (value: unknown) => {
    if (typeof value === 'string') return value
    if (!isPlainObject(value)) return value

    if (typeof value.hex === 'string') {
        const parsed = parseHexColor(value.hex)
        const alpha = typeof value.alpha === 'number' ? value.alpha : null
        if (parsed) {
            const alphaValue = alpha ?? parsed.a
            if (alphaValue != null && alphaValue >= 0 && alphaValue <= 1) {
                return `rgb(${parsed.r} ${parsed.g} ${parsed.b} / ${alphaValue})`
            }
        }
        return value.hex
    }

    if (Array.isArray(value.components)) {
        const components = value.components
        const colorSpace = typeof value.colorSpace === 'string' ? value.colorSpace : 'srgb'
        let alpha = typeof value.alpha === 'number' ? value.alpha : undefined
        if (alpha === undefined && components.length >= 4 && typeof components[3] === 'number') {
            alpha = components[3]
        }

        const normalized = components.map(component => {
            if (component === 'none') return 'none'
            if (typeof component === 'number') return component
            const numeric = Number(component)
            return Number.isNaN(numeric) ? null : numeric
        })

        if (normalized.some(component => component === null)) return value

        const sanitized = normalized as Array<number | 'none'>

        if (colorSpace === 'srgb' || colorSpace === 'srgb-linear') {
            const numeric = sanitized.slice(0, 3)
            const usesNormalized = numeric.every(component => component === 'none' || (component >= 0 && component <= 1))
            const rgb = numeric.map(component => {
                if (component === 'none') return 'none'
                return usesNormalized ? Math.round(component * 255) : Math.round(component)
            })
            if (alpha != null && alpha >= 0 && alpha <= 1) {
                return `rgb(${rgb[0]} ${rgb[1]} ${rgb[2]} / ${alpha})`
            }
            return `rgb(${rgb[0]} ${rgb[1]} ${rgb[2]})`
        }

        const colorArgs = sanitized.slice(0, 3).map(component => String(component)).join(' ')
        if (alpha != null && alpha >= 0 && alpha <= 1) {
            return `color(${colorSpace} ${colorArgs} / ${alpha})`
        }
        return `color(${colorSpace} ${colorArgs})`
    }

    return value
}

const normalizeCubicBezier = (value: unknown) => {
    if (Array.isArray(value)) {
        const numeric = value.filter(component => typeof component === 'number')
        if (numeric.length >= 4) {
            return `cubic-bezier(${numeric.slice(0, 4).join(', ')})`
        }
    }
    if (typeof value === 'string') return value
    return value
}

const normalizeStrokeStyle = (value: unknown) => {
    if (typeof value === 'string') return value
    if (isPlainObject(value)) {
        if (Array.isArray(value.dashArray) || value.dashArray != null) return 'dashed'
        return 'solid'
    }
    return value
}

const normalizeShadowItem = (value: Record<string, unknown>, normalize: NormalizeTokenValue) => {
    const inset = value.inset ? 'inset' : null
    const offsetX = normalize(value.offsetX, 'dimension') ?? '0'
    const offsetY = normalize(value.offsetY, 'dimension') ?? '0'
    const blur = normalize(value.blur, 'dimension')
    const spread = normalize(value.spread, 'dimension')
    const color = normalize(value.color, 'color')

    const parts = [inset, offsetX, offsetY].filter(Boolean).map(String)
    const blurValue = blur ?? (spread != null ? '0' : null)
    if (blurValue != null) parts.push(String(blurValue))
    if (spread != null) parts.push(String(spread))
    if (color != null) parts.push(String(color))

    return parts.join(' ')
}

const normalizeGradientStops = (value: unknown): unknown[] => {
    if (Array.isArray(value)) {
        const stops: unknown[] = []
        for (const entry of value) {
            if (Array.isArray(entry)) {
                stops.push(...entry)
            } else {
                stops.push(entry)
            }
        }
        return stops
    }
    return [value]
}

const normalizeGradientPosition = (value: unknown) => {
    if (typeof value === 'number') {
        const clamped = Math.min(Math.max(value, 0), 1)
        return `${Math.round(clamped * 10000) / 100}%`
    }
    if (typeof value === 'string') return value
    if (isPlainObject(value) && isValueUnitObject(value)) {
        return normalizeValueUnit(value.value, value.unit)
    }
    return value
}

type NormalizeTokenValue = (value: unknown, type?: string) => unknown

const normalizeTokenValue: NormalizeTokenValue = (value, type) => {
    if (hasDtcgValue(value)) {
        const nestedType = typeof value.$type === 'string' ? value.$type : type
        return normalizeTokenValue(value.$value, nestedType)
    }

    if (hasValueEntry(value)) {
        const nestedType = typeof value.$type === 'string' ? value.$type : type
        return normalizeTokenValue(value.value, nestedType)
    }

    if (type === 'color') {
        return normalizeColor(value)
    }

    if (type === 'dimension' || type === 'duration') {
        if (isPlainObject(value) && isValueUnitObject(value)) {
            return normalizeValueUnit(value.value, value.unit)
        }
        return value
    }

    if (type === 'fontFamily') {
        if (Array.isArray(value)) {
            return value.map(entry => normalizeFontFamilyToken(String(entry))).join(', ')
        }
        if (typeof value === 'string') {
            if (value.includes(',')) {
                return value
                    .split(',')
                    .map(entry => normalizeFontFamilyToken(entry.trim()))
                    .join(', ')
            }
            return normalizeFontFamilyToken(value)
        }
        return value
    }

    if (type === 'fontWeight') {
        return normalizeFontWeight(value)
    }

    if (type === 'cubicBezier') {
        return normalizeCubicBezier(value)
    }

    if (type === 'strokeStyle') {
        return normalizeStrokeStyle(value)
    }

    if (type === 'border') {
        if (!isPlainObject(value)) return value
        const width = normalizeTokenValue(value.width, 'dimension')
        const style = normalizeTokenValue(value.style, 'strokeStyle')
        const color = normalizeTokenValue(value.color, 'color')
        return [width, style, color].filter(v => v != null && v !== '').map(String).join(' ')
    }

    if (type === 'transition') {
        if (!isPlainObject(value)) return value
        const duration = normalizeTokenValue(value.duration, 'duration')
        const timingFunction = normalizeTokenValue(value.timingFunction, 'cubicBezier')
        const delay = normalizeTokenValue(value.delay, 'duration')
        return [duration, timingFunction, delay].filter(v => v != null && v !== '').map(String).join(' ')
    }

    if (type === 'shadow') {
        if (Array.isArray(value)) {
            const items = normalizeGradientStops(value)
            return items
                .map(item => (isPlainObject(item) ? normalizeShadowItem(item, normalizeTokenValue) : String(item)))
                .filter(Boolean)
                .join(', ')
        }
        if (!isPlainObject(value)) return value
        return normalizeShadowItem(value, normalizeTokenValue)
    }

    if (type === 'gradient') {
        const stops = normalizeGradientStops(value)
        const stopValues = stops
            .map(stop => {
                if (typeof stop === 'string') return stop
                if (!isPlainObject(stop)) return String(stop)
                const color = normalizeTokenValue(stop.color, 'color')
                const position = normalizeGradientPosition(stop.position)
                return [color, position].filter(v => v != null && v !== '').map(String).join(' ')
            })
            .filter(Boolean)
        return `linear-gradient(${stopValues.join(', ')})`
    }

    if (type === 'typography') {
        if (!isPlainObject(value)) return value
        const fontWeight = normalizeTokenValue(value.fontWeight, 'fontWeight')
        const fontSize = normalizeTokenValue(value.fontSize, 'dimension')
        const lineHeight = normalizeTokenValue(value.lineHeight, 'number')
        const fontFamily = normalizeTokenValue(value.fontFamily, 'fontFamily')

        const parts: string[] = []
        if (fontWeight != null && fontWeight !== '') parts.push(String(fontWeight))
        if (fontSize != null && fontSize !== '') {
            if (lineHeight != null && lineHeight !== '') {
                parts.push(`${fontSize}/${lineHeight}`)
            } else {
                parts.push(String(fontSize))
            }
        }
        if (fontFamily != null && fontFamily !== '') parts.push(String(fontFamily))
        return parts.join(' ')
    }

    if (isPlainObject(value) && isValueUnitObject(value)) {
        return normalizeValueUnit(value.value, value.unit)
    }

    if (isPlainObject(value) && typeof value.hex === 'string' && Object.keys(value).length <= 3) {
        return normalizeColor(value)
    }

    if (Array.isArray(value)) {
        return value.map(entry => normalizeTokenValue(entry))
    }

    if (isPlainObject(value)) {
        const result: Record<string, unknown> = {}
        for (const [key, entry] of Object.entries(value)) {
            if (key.startsWith('$')) continue
            result[key] = normalizeTokenValue(entry)
        }
        return result
    }

    return value
}

type NormalizeContext = {
    type?: string
    path: string[]
    typeMap: TokenTypeMap
}

const normalizeNode = (node: unknown, context: NormalizeContext): unknown => {
    const pathKey = context.path.join('.')
    const mappedType = pathKey ? context.typeMap.get(pathKey) : undefined
    if (mappedType && !hasDtcgValue(node) && !hasValueEntry(node)) {
        return normalizeTokenValue(node, mappedType)
    }

    if (Array.isArray(node)) {
        return node.map(entry => normalizeNode(entry, context))
    }

    if (!isPlainObject(node)) {
        return node
    }

    if (hasDtcgValue(node) || hasValueEntry(node)) {
        const value = hasDtcgValue(node) ? node.$value : node.value
        const explicitType = typeof node.$type === 'string' ? node.$type : undefined
        const tokenType = explicitType ?? context.type ?? mappedType
        return normalizeTokenValue(value, tokenType)
    }

    const nodeType = typeof node.$type === 'string' ? node.$type : context.type
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(node)) {
        if (key.startsWith('$')) continue
        result[key] = normalizeNode(value, { type: nodeType, path: [...context.path, key], typeMap: context.typeMap })
    }
    return result
}

export const normalizeTokens = (input: Record<string, unknown>) => {
    const extended = resolveGroupExtends(input, input, new Set()) as Record<string, unknown>
    const { typeMap } = buildTokenMaps(extended)
    const resolved = resolveReferences(extended, extended, new Set()) as Record<string, unknown>
    return normalizeNode(resolved, { path: [], typeMap }) as Record<string, unknown>
}

export const resolveTokenReferences = (input: Record<string, unknown>) =>
    resolveReferences(input, input, new Set()) as Record<string, unknown>
