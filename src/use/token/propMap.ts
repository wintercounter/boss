export const propMap = new Map<string, Set<string> | string[]>([
    ['gradient', new Set(['background-image', 'linear-gradient', 'radial-gradient', 'conic-gradient'])],
    ['shadow', new Set(['box-shadow', 'text-shadow'])],
    [
        'color',
        new Set([
            'color',
            'background',
            'background-color',
            'border-color',
            'accent-color',
            'caret-color',
            'fill',
            'outline-color',
            'stroke',
            'text-decoration-color',
            'text-shadow',
            'box-shadow',
            'background-image',
            'linear-gradient',
            'radial-gradient',
            'conic-gradient',
            'filter',
        ]),
    ],
    [
        'border',
        new Set(['border', 'border-top', 'border-right', 'border-bottom', 'border-left', 'outline', 'outline-offset']),
    ],
    ['transition', new Set(['transition'])],
    [
        'size',
        new Set([
            'width',
            'height',
            'min-width',
            'min-height',
            'max-width',
            'max-height',
            'inset',
            'top',
            'right',
            'bottom',
            'left',
            'translate',
            'flex-basis',
            'gap',
            'column-gap',
            'row-gap',
            'margin',
            'margin-top',
            'margin-right',
            'margin-bottom',
            'margin-left',
            'padding',
            'padding-top',
            'padding-right',
            'padding-bottom',
            'padding-left',
            'border-spacing',
            'scroll-margin',
            'scroll-margin-top',
            'scroll-margin-right',
            'scroll-margin-bottom',
            'scroll-margin-left',
            'scroll-padding',
            'scroll-padding-top',
            'scroll-padding-right',
            'scroll-padding-bottom',
            'scroll-padding-left',
            'text-indent',
        ]),
    ],
    [
        'grid',
        new Set([
            'grid-column',
            'grid-row',
            'grid-template-columns',
            'grid-template-rows',
            'grid-auto-columns',
            'grid-auto-rows',
        ]),
    ],
    ['duration', new Set(['transition-duration', 'transition-delay', 'animation-duration', 'animation-delay'])],
    ['backgroundPosition', new Set(['background-position', 'object-position', 'transform-origin'])],
    ['typography', new Set(['font'])],
    ['font', new Set(['font-family'])],
])

const toDashCase = (value: string) => value.replace(/([A-Z])/g, '-$1').toLowerCase()

export const getTokenGroupsForProp = (prop: string) => {
    if (!prop) return []
    const target = toDashCase(prop)
    const matches: string[] = []
    for (const [group, props] of propMap.entries()) {
        if (toDashCase(group) === target) {
            matches.push(group)
            continue
        }
        for (const name of props) {
            if (toDashCase(String(name)) === target) {
                matches.push(group)
                break
            }
        }
    }
    return matches
}

export const getTokenGroupForProp = (prop: string) => {
    return getTokenGroupsForProp(prop)[0] ?? null
}

export const setTokenPropGroups = (groups: Record<string, string[]>) => {
    propMap.clear()
    for (const [group, props] of Object.entries(groups)) {
        propMap.set(group, new Set(props))
    }
}

export const getTokenPropGroups = () => {
    return Array.from(propMap.entries()).reduce(
        (acc, [group, values]) => {
            acc[group] = Array.from(values)
            return acc
        },
        {} as Record<string, string[]>,
    )
}
