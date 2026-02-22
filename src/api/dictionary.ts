import { DictionaryItem } from '@/shared/types'
import type { BossApiBase } from '@/types'

export class Dictionary extends Map<unknown, DictionaryItem> {
    static Instance: Dictionary

    api: BossApiBase

    constructor(api: BossApiBase) {
        super()
        Dictionary.Instance = this
        this.api = api
    }

    resolve(name: string) {
        const direct = this.get(name)
        if (direct) {
            return { descriptor: direct, name, raw: name, suffix: null }
        }

        if (typeof name !== 'string') {
            return { descriptor: null, name, raw: name, suffix: null }
        }

        const underscoreIndex = name.indexOf('_')
        if (underscoreIndex <= 0 || underscoreIndex === name.length - 1) {
            return { descriptor: null, name, raw: name, suffix: null }
        }

        const base = name.slice(0, underscoreIndex)
        const suffix = name.slice(underscoreIndex + 1)
        const descriptor = this.get(base)
        if (!descriptor) {
            return { descriptor: null, name, raw: name, suffix: null }
        }

        return { descriptor, name: base, raw: name, suffix }
    }

    set(key: string, value: DictionaryItem) {
        for (const alias of value.aliases) {
            super.set(alias, value)
        }
        return this
    }

    toValue(value: unknown, property?: DictionaryItem | string): unknown {
        const propertyName = typeof property === 'string' ? property : property?.property ?? property?.aliases?.[0]
        switch (true) {
            case Array.isArray(value): {
                return value.map(v => this.toValue(v, property)).join(' ')
            }
            case typeof value === 'number':
            case isNumericValue(value as string | number): {
                const numericValue = typeof value === 'number' ? value : Number(value)
                if (propertyName && unitlessProperties.has(propertyName)) {
                    return numericValue === 0 ? 0 : `${value}`
                }
                return numericValue === 0 ? 0 : `${value}${this.api.unit}`
            }
            default:
                return value
        }
    }
}

export const unitlessProperties = new Set([
    'animationIterationCount',
    'aspectRatio',
    'borderImageOutset',
    'borderImageSlice',
    'borderImageWidth',
    'boxFlex',
    'boxFlexGroup',
    'boxOrdinalGroup',
    'columnCount',
    'columns',
    'flex',
    'flexGrow',
    'flexPositive',
    'flexShrink',
    'flexNegative',
    'flexOrder',
    'gridArea',
    'gridRow',
    'gridRowEnd',
    'gridRowSpan',
    'gridRowStart',
    'gridColumn',
    'gridColumnEnd',
    'gridColumnSpan',
    'gridColumnStart',
    'fontWeight',
    'lineClamp',
    'lineHeight',
    'opacity',
    'order',
    'orphans',
    'scale',
    'tabSize',
    'widows',
    'zIndex',
    'zoom',
    'fillOpacity',
    'floodOpacity',
    'stopOpacity',
    'strokeDasharray',
    'strokeDashoffset',
    'strokeMiterlimit',
    'strokeOpacity',
    'strokeWidth',
    'MozAnimationIterationCount',
    'MozBoxFlex',
    'MozBoxFlexGroup',
    'MozLineClamp',
    'msAnimationIterationCount',
    'msFlex',
    'msFlexGrow',
    'msFlexNegative',
    'msFlexOrder',
    'msFlexPositive',
    'msFlexShrink',
    'msGridColumn',
    'msGridColumnSpan',
    'msGridRow',
    'msGridRowSpan',
    'msZoom',
    'WebkitAnimationIterationCount',
    'WebkitBoxFlex',
    'WebkitBoxFlexGroup',
    'WebkitBoxOrdinalGroup',
    'WebkitColumnCount',
    'WebkitColumns',
    'WebkitFlex',
    'WebkitFlexGrow',
    'WebkitFlexPositive',
    'WebkitFlexShrink',
    'WebkitLineClamp',
    'animation-iteration-count',
    'aspect-ratio',
    'border-image-outset',
    'border-image-slice',
    'border-image-width',
    'box-flex',
    'box-flex-group',
    'box-ordinal-group',
    'column-count',
    'columns',
    'flex',
    'flex-grow',
    'flex-positive',
    'flex-shrink',
    'flex-negative',
    'flex-order',
    'grid-area',
    'grid-row',
    'grid-row-end',
    'grid-row-span',
    'grid-row-start',
    'grid-column',
    'grid-column-end',
    'grid-column-span',
    'grid-column-start',
    'font-weight',
    'line-clamp',
    'line-height',
    'opacity',
    'order',
    'orphans',
    'scale',
    'tab-size',
    'widows',
    'z-index',
    'zoom',
    'fill-opacity',
    'flood-opacity',
    'stop-opacity',
    'stroke-dasharray',
    'stroke-dashoffset',
    'stroke-miterlimit',
    'stroke-opacity',
    'stroke-width',
    '-moz-animation-iteration-count',
    '-moz-box-flex',
    '-moz-box-flex-group',
    '-moz-line-clamp',
    '-ms-animation-iteration-count',
    '-ms-flex',
    '-ms-flex-grow',
    '-ms-flex-negative',
    '-ms-flex-order',
    '-ms-flex-positive',
    '-ms-flex-shrink',
    '-ms-grid-column',
    '-ms-grid-column-span',
    '-ms-grid-row',
    '-ms-grid-row-span',
    '-ms-zoom',
    '-webkit-animation-iteration-count',
    '-webkit-box-flex',
    '-webkit-box-flex-group',
    '-webkit-box-ordinal-group',
    '-webkit-column-count',
    '-webkit-columns',
    '-webkit-flex',
    '-webkit-flex-grow',
    '-webkit-flex-positive',
    '-webkit-flex-shrink',
    '-webkit-line-clamp',
])

export const isNumericValue = (value: string | number) => {
    if (typeof value === 'number') return true
    return /^-?\d+(?:\.\d+)?$/.test(value)
}
