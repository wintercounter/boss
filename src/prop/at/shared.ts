export const defaultBreakpoints: Record<string, [number | null, number | null]> = {
    micro: [0, 375],
    mobile: [376, 639],
    tablet: [640, 1023],
    small: [1024, 1439],
    medium: [1440, 1919],
    large: [1920, 100000],
    device: [0, 1023],
}

export const baseAtValues: Array<[string, string]> = [
    ['dark', '@media screen and (prefers-color-scheme: dark)'],
    ['light', '@media screen and (prefers-color-scheme: light)'],
    ['hdpi', '@media and screen (min-resolution: 192dpi)'],
]

type RangeBounds = {
    min: string | null
    max: string | null
}

const numberWithUnit = /^(-?\d+(?:\.\d+)?)([a-z%]+)?$/i

const parseNumeric = (value: string, unit: string) => {
    const match = value.match(numberWithUnit)
    if (!match) return null
    const [, number, suffix] = match
    return `${number}${suffix ?? unit}`
}

const parseBreakpoint = (
    name: string,
    bound: 'min' | 'max',
    breakpoints: Record<string, [number | null, number | null]>,
) => {
    const entry = breakpoints[name]
    if (!entry) return null
    const value = bound === 'min' ? entry[0] : entry[1]
    if (value === null || value === undefined) return null
    return `${value}px`
}

const parseBound = (
    value: string,
    bound: 'min' | 'max',
    breakpoints: Record<string, [number | null, number | null]>,
    unit: string,
) => {
    return parseBreakpoint(value, bound, breakpoints) ?? parseNumeric(value, unit)
}

export const parseRangeKey = (
    key: string,
    breakpoints: Record<string, [number | null, number | null]>,
    unit: string,
): RangeBounds | null => {
    if (!key) return null

    if (key.endsWith('+')) {
        const min = parseBound(key.slice(0, -1), 'min', breakpoints, unit)
        return min ? { min, max: null } : null
    }

    if (key.endsWith('-')) {
        const max = parseBound(key.slice(0, -1), 'max', breakpoints, unit)
        return max ? { min: null, max } : null
    }

    const rangeIndex = key.lastIndexOf('-')
    if (rangeIndex > 0 && rangeIndex < key.length - 1) {
        const min = parseBound(key.slice(0, rangeIndex), 'min', breakpoints, unit)
        const max = parseBound(key.slice(rangeIndex + 1), 'max', breakpoints, unit)
        if (min || max) return { min: min ?? null, max: max ?? null }
    }

    const entry = breakpoints[key]
    if (entry) {
        const min = entry[0] == null ? null : `${entry[0]}px`
        const max = entry[1] == null ? null : `${entry[1]}px`
        if (min || max) return { min, max }
    }

    return null
}

export const buildMediaQuery = (range: RangeBounds) => {
    const parts = []
    if (range.min) parts.push(`(min-width: ${range.min})`)
    if (range.max) parts.push(`(max-width: ${range.max})`)
    if (!parts.length) return null
    return `@media screen and ${parts.join(' and ')}`
}

export const buildContainerQuery = (range: RangeBounds, name: string | null) => {
    const parts = []
    if (range.min) parts.push(`(min-width: ${range.min})`)
    if (range.max) parts.push(`(max-width: ${range.max})`)
    const prefix = name ? `@container ${name}` : '@container'
    if (!parts.length) return prefix
    return `${prefix} ${parts.join(' and ')}`
}

export const parseContainerContext = (context: string) => {
    if (!context) return null
    if (context === 'container') return { name: null }
    if (context.startsWith('container ')) {
        const name = context.slice('container '.length).trim()
        return name ? { name } : null
    }
    if (context.startsWith('container_')) {
        const name = context.slice('container_'.length).trim()
        return name ? { name } : null
    }
    return null
}

const keyframeStepPattern = /^\d+(?:\.\d+)?%$/

export const normalizeKeyframeStep = (step: string) => {
    if (!step) return null
    const trimmed = step.trim().toLowerCase()
    if (trimmed === 'from') return '0%'
    if (trimmed === 'to') return '100%'
    if (keyframeStepPattern.test(trimmed)) return trimmed
    return null
}

export const sortKeyframeSteps = (steps: string[]) => {
    const entries = steps.map((step, index) => {
        const order = keyframeStepPattern.test(step) ? Number(step.slice(0, -1)) : null
        return { step, index, order }
    })
    entries.sort((a, b) => {
        if (a.order !== null && b.order !== null) return a.order - b.order
        if (a.order !== null) return -1
        if (b.order !== null) return 1
        return a.index - b.index
    })
    return entries.map(entry => entry.step)
}

export const buildKeyframesRule = (name: string, frames: Map<string, Map<string, string>>) => {
    const orderedSteps = sortKeyframeSteps(Array.from(frames.keys()))
    const body = orderedSteps
        .map(step => {
            const props = frames.get(step)
            if (!props || props.size === 0) return ''
            const declarations = Array.from(props.entries())
                .map(([prop, value]) => `${prop}: ${value}`)
                .join('; ')
            return `${step} { ${declarations} }`
        })
        .filter(Boolean)
        .join(' ')
    return `@keyframes ${name} { ${body} }`
}

export const parseKeyframesContext = (context: string) => {
    if (!context) return null
    if (context === 'keyframes') return { name: null }
    if (context.startsWith('keyframes ')) {
        const name = context.slice('keyframes '.length).trim()
        return name ? { name } : null
    }
    if (context.startsWith('keyframes_')) {
        const name = context.slice('keyframes_'.length).trim()
        return name ? { name } : null
    }
    return null
}
