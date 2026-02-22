import * as React from 'react'
import {
    BezierCurve,
    AlignBottom,
    AlignCenterHorizontal,
    AlignCenterVertical,
    AlignLeft,
    AlignRight,
    AlignTop,
    ArrowsOutCardinal,
    ArrowsOutLineVertical,
    BoundingBox,
    Cursor,
    DotsSix,
    DotsSixVertical,
    Layout,
    MagnifyingGlass,
    PaintBucket,
    PushPinSimple,
    SelectionAll,
    SplitHorizontal,
    Sparkle,
    TextAlignCenter,
    TextAlignJustify,
    TextAlignLeft,
    TextAlignRight,
    TextT,
    Timer,
    Wrench,
    X,
} from '@phosphor-icons/react'
import { cx } from 'boss-css/variants'
import { BezierSplineEditor } from 'react-bezier-spline-editor/react'
import type { Point } from 'react-bezier-spline-editor/core'

import type { PropRow, TokenSnapshot, UiStatus } from '../types'
import { cssProperties, isCssProperty, toDashCase } from './css/properties'
import { asNumber, formatNumber, parseInlineStyles, resolvePreviewValue, isColorProp } from './css/utils'
import {
    ControlRow,
    DefaultUnitContext,
    GradientRow,
    OptionGroup,
    PropertyRow,
    CompactDropdown,
    CompactInputRow,
    Section,
    SectionStack,
    SectionSpan,
    SpacingControl,
    ColorRow,
} from './css/editor-components'
import type { OptionItem, StyleState } from './css/editor-components'

export type CssEditorFooterState = {
    dirty: boolean
    canUndo: boolean
    canRedo: boolean
    saving: boolean
}

export type CssEditorHandle = {
    undo: () => void
    redo: () => void
    reset: () => void
    save: () => void
}

type CssEditorProps = {
    element: Element | null
    props: PropRow[]
    tokens: TokenSnapshot | null
    status: UiStatus
    hostApi?: { dictionary?: { toValue?: (value: unknown, prop?: string) => unknown }; unit?: string } | null
    onSaveStyles: (changes: Array<{ prop: string; value: string }>) => Promise<void>
    onStateChange?: (state: CssEditorFooterState) => void
}

type StyleAction =
    | { type: 'init'; values: Record<string, string> }
    | { type: 'set'; prop: string; value: string; commit?: boolean }
    | { type: 'batch'; values: Record<string, string>; commit?: boolean }
    | { type: 'reset' }
    | { type: 'undo' }
    | { type: 'redo' }

const reducer = (state: StyleState, action: StyleAction): StyleState => {
    switch (action.type) {
        case 'init': {
            const values = { ...action.values }
            return {
                initial: values,
                draft: values,
                history: [values],
                historyIndex: 0,
            }
        }
        case 'set': {
            const next = { ...state.draft }
            if (action.value === '') {
                delete next[action.prop]
            } else {
                next[action.prop] = action.value
            }
            if (!action.commit) {
                return { ...state, draft: next }
            }
            const history = state.history.slice(0, state.historyIndex + 1)
            history.push(next)
            return { ...state, draft: next, history, historyIndex: history.length - 1 }
        }
        case 'batch': {
            const next = { ...state.draft }
            for (const [prop, value] of Object.entries(action.values)) {
                if (value === '') {
                    delete next[prop]
                } else {
                    next[prop] = value
                }
            }
            if (!action.commit) {
                return { ...state, draft: next }
            }
            const history = state.history.slice(0, state.historyIndex + 1)
            history.push(next)
            return { ...state, draft: next, history, historyIndex: history.length - 1 }
        }
        case 'reset': {
            const history = state.history.slice(0, state.historyIndex + 1)
            history.push({ ...state.initial })
            return {
                ...state,
                draft: { ...state.initial },
                history,
                historyIndex: history.length - 1,
            }
        }
        case 'undo': {
            if (state.historyIndex <= 0) return state
            const historyIndex = state.historyIndex - 1
            return { ...state, historyIndex, draft: { ...state.history[historyIndex] } }
        }
        case 'redo': {
            if (state.historyIndex >= state.history.length - 1) return state
            const historyIndex = state.historyIndex + 1
            return { ...state, historyIndex, draft: { ...state.history[historyIndex] } }
        }
        default:
            return state
    }
}

const groupList = [
    { id: 'layout', label: 'Layout', icon: Layout },
    { id: 'type', label: 'Typography', icon: TextT },
    { id: 'background', label: 'Background', icon: PaintBucket },
    { id: 'border', label: 'Border', icon: SelectionAll },
    { id: 'effects', label: 'Effects', icon: Sparkle },
    { id: 'transform', label: 'Transform', icon: ArrowsOutCardinal },
    { id: 'transition', label: 'Transition', icon: DotsSix },
    { id: 'animation', label: 'Animation', icon: Timer },
    { id: 'interaction', label: 'Interaction', icon: Cursor },
    { id: 'svg', label: 'SVG', icon: BezierCurve },
    { id: 'misc', label: 'Misc', icon: Wrench },
]

const SIDEBAR_PIN_STORAGE_KEY = 'boss-devtools-css-sidebar-pinned'

const displayOptions = [
    'block',
    'inline-block',
    'inline',
    'flex',
    'inline-flex',
    'grid',
    'inline-grid',
    'none',
    'contents',
]

const positionOptions = ['static', 'relative', 'absolute', 'fixed', 'sticky']

const overflowOptions = ['visible', 'hidden', 'scroll', 'auto', 'clip']

const backgroundModeOptions: OptionItem[] = [
    { value: 'detailed', label: 'Detailed' },
    { value: 'shorthand', label: 'Shorthand' },
]

const fontWeightOptions = ['100', '200', '300', '400', '500', '600', '700', '800', '900']

const borderStyleOptions = ['solid', 'dashed', 'dotted', 'double', 'groove', 'ridge', 'inset', 'outset', 'none']
const fillRuleOptions = ['nonzero', 'evenodd']
const strokeLinecapOptions = ['butt', 'round', 'square']
const strokeLinejoinOptions = ['miter', 'round', 'bevel']
const vectorEffectOptions = ['none', 'non-scaling-stroke', 'non-scaling-size', 'non-rotation', 'fixed-position']
const cursorOptions = [
    'auto',
    'default',
    'pointer',
    'text',
    'move',
    'crosshair',
    'grab',
    'grabbing',
    'zoom-in',
    'zoom-out',
    'not-allowed',
    'wait',
    'help',
    'context-menu',
    'progress',
]
const pointerEventsOptions = ['auto', 'none', 'visible', 'visiblePainted', 'visibleFill', 'visibleStroke', 'all']
const userSelectOptions = ['auto', 'none', 'text', 'all', 'contain']
const touchActionOptions = [
    'auto',
    'none',
    'pan-x',
    'pan-y',
    'pan-left',
    'pan-right',
    'pan-up',
    'pan-down',
    'manipulation',
]
const scrollBehaviorOptions = ['auto', 'smooth']
const overscrollBehaviorOptions = ['auto', 'contain', 'none']
const textWrapOptions = ['wrap', 'nowrap', 'balance', 'pretty']
const textTransformOptions = ['none', 'uppercase', 'lowercase', 'capitalize']
const textBoxTrimOptions = ['none', 'trim-start', 'trim-end', 'trim-both']
const textBoxEdgeOptions = ['text', 'cap', 'alphabetic', 'ideographic']
const textSpacingTrimOptions = ['normal', 'trim-start', 'trim-end', 'trim-both']
const textDecorationLineOptions = ['none', 'underline', 'overline', 'line-through']
const textDecorationStyleOptions = ['solid', 'double', 'dotted', 'dashed', 'wavy']
const textUnderlinePositionOptions = ['auto', 'from-font', 'under', 'left', 'right']
const textOverflowOptions = ['clip', 'ellipsis']

const blendModeOptions = [
    'normal',
    'multiply',
    'screen',
    'overlay',
    'darken',
    'lighten',
    'color-dodge',
    'color-burn',
    'hard-light',
    'soft-light',
    'difference',
    'exclusion',
    'hue',
    'saturation',
    'color',
    'luminosity',
]

const backgroundLonghandProps = [
    'background-color',
    'background-image',
    'background-size',
    'background-position',
    'background-repeat',
    'background-blend-mode',
]

const svgProps = [
    'fill',
    'fill-opacity',
    'fill-rule',
    'stroke',
    'stroke-width',
    'stroke-linecap',
    'stroke-linejoin',
    'stroke-dasharray',
    'stroke-dashoffset',
    'stroke-miterlimit',
    'stroke-opacity',
    'vector-effect',
    'cx',
    'cy',
    'r',
    'rx',
    'ry',
    'x',
    'y',
    'd',
    'text-anchor',
    'marker',
    'marker-start',
    'marker-mid',
    'marker-end',
    'paint-order',
    'shape-rendering',
    'text-rendering',
    'color-interpolation',
    'stop-color',
    'stop-opacity',
    'shape-subtract',
]

const svgExtraRows: Array<{
    label: string
    prop: string
    type: 'text' | 'number' | 'options' | 'color'
    options?: string[]
    full?: boolean
}> = [
    { label: 'CX', prop: 'cx', type: 'number' },
    { label: 'CY', prop: 'cy', type: 'number' },
    { label: 'R', prop: 'r', type: 'number' },
    { label: 'RX', prop: 'rx', type: 'number' },
    { label: 'RY', prop: 'ry', type: 'number' },
    { label: 'X', prop: 'x', type: 'number' },
    { label: 'Y', prop: 'y', type: 'number' },
    { label: 'Path', prop: 'd', type: 'text', full: true },
    { label: 'Text Anchor', prop: 'text-anchor', type: 'options', options: ['start', 'middle', 'end'], full: true },
    { label: 'Marker', prop: 'marker', type: 'text', full: true },
    { label: 'Marker Start', prop: 'marker-start', type: 'text', full: true },
    { label: 'Marker Mid', prop: 'marker-mid', type: 'text', full: true },
    { label: 'Marker End', prop: 'marker-end', type: 'text', full: true },
    { label: 'Paint Order', prop: 'paint-order', type: 'text', full: true },
    {
        label: 'Shape Rendering',
        prop: 'shape-rendering',
        type: 'options',
        options: ['auto', 'optimizeSpeed', 'crispEdges', 'geometricPrecision'],
        full: true,
    },
    {
        label: 'Text Rendering',
        prop: 'text-rendering',
        type: 'options',
        options: ['auto', 'optimizeSpeed', 'optimizeLegibility', 'geometricPrecision'],
        full: true,
    },
    {
        label: 'Color Interpolation',
        prop: 'color-interpolation',
        type: 'options',
        options: ['auto', 'sRGB', 'linearRGB'],
        full: true,
    },
    { label: 'Stop Color', prop: 'stop-color', type: 'color', full: true },
    { label: 'Stop Opacity', prop: 'stop-opacity', type: 'number' },
    { label: 'Shape Subtract', prop: 'shape-subtract', type: 'text', full: true },
]

const layoutProps = [
    'display',
    'position',
    'visibility',
    'box-sizing',
    'overflow',
    'overflow-x',
    'overflow-y',
    'width',
    'height',
    'min-width',
    'min-height',
    'max-width',
    'max-height',
    'aspect-ratio',
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
    'inset',
    'top',
    'right',
    'bottom',
    'left',
    'z-index',
    'flex-direction',
    'flex-wrap',
    'justify-content',
    'align-items',
    'gap',
    'grid-template-columns',
    'grid-template-rows',
    'grid-auto-flow',
    'grid-auto-columns',
    'grid-auto-rows',
]

const typographyProps = [
    'font-family',
    'font-size',
    'font-weight',
    'line-height',
    'letter-spacing',
    'text-wrap',
    'text-align',
    'text-transform',
    'text-overflow',
    'text-indent',
    'line-clamp',
    'text-box-trim',
    'text-box-edge',
    'text-spacing-trim',
    'text-decoration-line',
    'text-decoration-style',
    'text-decoration-thickness',
    'text-underline-offset',
    'text-underline-position',
    'text-decoration-color',
    'color',
]

const borderProps = [
    'border-width',
    'border-style',
    'border-color',
    'border-radius',
    'outline-width',
    'outline-style',
    'outline-color',
]

const effectsProps = ['box-shadow', 'text-shadow', 'filter', 'backdrop-filter', 'opacity', 'mix-blend-mode']

const transformProps = ['transform']

const transitionLonghandProps = [
    'transition-property',
    'transition-duration',
    'transition-timing-function',
    'transition-delay',
]
const transitionProps = ['transition', ...transitionLonghandProps]

const animationLonghandProps = [
    'animation-name',
    'animation-duration',
    'animation-timing-function',
    'animation-delay',
    'animation-iteration-count',
    'animation-direction',
    'animation-fill-mode',
    'animation-play-state',
]
const animationProps = ['animation', ...animationLonghandProps]

const interactionProps = [
    'cursor',
    'pointer-events',
    'user-select',
    'touch-action',
    'scroll-behavior',
    'overscroll-behavior',
    'caret-color',
]

const miscExcludedProps = new Set([
    ...svgProps,
    ...layoutProps,
    ...typographyProps,
    'background',
    ...backgroundLonghandProps,
    ...borderProps,
    ...effectsProps,
    ...transformProps,
    ...transitionProps,
    ...animationProps,
    ...interactionProps,
])

const justifyContentOptions: OptionItem[] = [
    { value: 'flex-start', label: 'Start', icon: AlignLeft, tooltip: 'Start' },
    { value: 'center', label: 'Center', icon: AlignCenterHorizontal, tooltip: 'Center' },
    { value: 'flex-end', label: 'End', icon: AlignRight, tooltip: 'End' },
    { value: 'space-between', label: 'Space between', icon: TextAlignJustify, tooltip: 'Space between' },
    { value: 'space-around', label: 'Space around', icon: DotsSix, tooltip: 'Space around' },
    { value: 'space-evenly', label: 'Space evenly', icon: DotsSixVertical, tooltip: 'Space evenly' },
    { value: 'stretch', label: 'Stretch', icon: ArrowsOutLineVertical, tooltip: 'Stretch' },
]

const alignItemsOptions: OptionItem[] = [
    { value: 'flex-start', label: 'Start', icon: AlignTop, tooltip: 'Start' },
    { value: 'center', label: 'Center', icon: AlignCenterVertical, tooltip: 'Center' },
    { value: 'flex-end', label: 'End', icon: AlignBottom, tooltip: 'End' },
    { value: 'stretch', label: 'Stretch', icon: ArrowsOutLineVertical, tooltip: 'Stretch' },
    { value: 'baseline', label: 'Baseline', icon: TextT, tooltip: 'Baseline' },
]

const textAlignIconOptions: OptionItem[] = [
    { value: 'left', label: 'Left', icon: TextAlignLeft, tooltip: 'Left' },
    { value: 'center', label: 'Center', icon: TextAlignCenter, tooltip: 'Center' },
    { value: 'right', label: 'Right', icon: TextAlignRight, tooltip: 'Right' },
    { value: 'justify', label: 'Justify', icon: TextAlignJustify, tooltip: 'Justify' },
    { value: 'start', label: 'Start', icon: TextAlignLeft, tooltip: 'Start' },
    { value: 'end', label: 'End', icon: TextAlignRight, tooltip: 'End' },
]

const spacingProps = {
    margin: ['margin-top', 'margin-right', 'margin-bottom', 'margin-left'],
    padding: ['padding-top', 'padding-right', 'padding-bottom', 'padding-left'],
    inset: ['top', 'right', 'bottom', 'left'],
}

const transformDefaults = {
    translateX: 0,
    translateY: 0,
    translateZ: 0,
    rotate: 0,
    rotateX: 0,
    rotateY: 0,
    rotateZ: 0,
    scaleX: 1,
    scaleY: 1,
    scaleZ: 1,
    skewX: 0,
    skewY: 0,
    perspective: 0,
    matrix: '',
}

type TransformState = typeof transformDefaults

const timingTargetProps = {
    transition: 'transition-timing-function',
    animation: 'animation-timing-function',
} as const

type BezierTarget = keyof typeof timingTargetProps

const bezierPresets: Record<string, [number, number, number, number]> = {
    linear: [0, 0, 1, 1],
    ease: [0.25, 0.1, 0.25, 1],
    'ease-in': [0.42, 0, 1, 1],
    'ease-out': [0, 0, 0.58, 1],
    'ease-in-out': [0.42, 0, 0.58, 1],
}

const clamp01 = (value: number) => Math.max(0, Math.min(1, value))
const bezierYMin = -1
const bezierYMax = 2
const bezierYRange = bezierYMax - bezierYMin
const mapYToEditor = (y: number) => clamp01((y - bezierYMin) / bezierYRange)
const mapYFromEditor = (y: number) => y * bezierYRange + bezierYMin

const defaultBezierPoints: Point[] = [
    { x: 0, y: mapYToEditor(0) },
    { x: 0.25, y: mapYToEditor(0.25) },
    { x: 0.75, y: mapYToEditor(0.75) },
    { x: 1, y: mapYToEditor(1) },
]

const normalizeBezierPoints = (points: Point[] | undefined | null): Point[] => {
    if (!points || points.length < 4) return [...defaultBezierPoints]
    const inner = points.slice(1, -1)
    const control1 = inner[0] ?? defaultBezierPoints[1]
    const control2 = inner[inner.length - 1] ?? defaultBezierPoints[2]
    return [
        { x: 0, y: mapYToEditor(0) },
        { x: clamp01(control1.x), y: clamp01(control1.y) },
        { x: clamp01(control2.x), y: clamp01(control2.y) },
        { x: 1, y: mapYToEditor(1) },
    ]
}

const parseTimingFunction = (value: string) => {
    const trimmed = value.trim()
    if (!trimmed) return [...defaultBezierPoints]
    const lower = trimmed.toLowerCase()
    const keywordMatch = lower.match(/^(linear|ease-in-out|ease-in|ease-out|ease)\b/)
    if (keywordMatch) {
        const coords = bezierPresets[keywordMatch[1]]
        return normalizeBezierPoints([
            { x: 0, y: mapYToEditor(0) },
            { x: coords[0], y: mapYToEditor(coords[1]) },
            { x: coords[2], y: mapYToEditor(coords[3]) },
            { x: 1, y: mapYToEditor(1) },
        ])
    }
    const cubicMatch = lower.match(/cubic-bezier\(([^)]+)\)/i)
    if (cubicMatch) {
        const parts = cubicMatch[1]
            .split(',')
            .map(part => Number.parseFloat(part.trim()))
            .filter(part => Number.isFinite(part))
        if (parts.length >= 4) {
            return normalizeBezierPoints([
                { x: 0, y: mapYToEditor(0) },
                { x: parts[0], y: mapYToEditor(parts[1]) },
                { x: parts[2], y: mapYToEditor(parts[3]) },
                { x: 1, y: mapYToEditor(1) },
            ])
        }
    }
    return [...defaultBezierPoints]
}

const formatTimingFunction = (points: Point[]) => {
    const normalized = normalizeBezierPoints(points)
    const control1 = normalized[1]
    const control2 = normalized[2]
    const actual1Y = mapYFromEditor(control1.y)
    const actual2Y = mapYFromEditor(control2.y)
    return `cubic-bezier(${formatNumber(control1.x, 3)}, ${formatNumber(actual1Y, 3)}, ${formatNumber(
        control2.x,
        3,
    )}, ${formatNumber(actual2Y, 3)})`
}

const parseTransform = (value: string) => {
    const next: TransformState = { ...transformDefaults }
    if (!value) return next

    const regex = /(\w+)\(([^)]+)\)/g
    let match: RegExpExecArray | null
    while ((match = regex.exec(value))) {
        const fn = match[1]
        const raw = match[2].trim()
        if (fn === 'matrix') {
            next.matrix = raw
            continue
        }
        const num = Number.parseFloat(raw)
        if (Number.isNaN(num)) continue

        switch (fn) {
            case 'translateX':
                next.translateX = num
                break
            case 'translateY':
                next.translateY = num
                break
            case 'translateZ':
                next.translateZ = num
                break
            case 'rotate':
                next.rotate = num
                break
            case 'rotateX':
                next.rotateX = num
                break
            case 'rotateY':
                next.rotateY = num
                break
            case 'rotateZ':
                next.rotateZ = num
                break
            case 'scaleX':
                next.scaleX = num
                break
            case 'scaleY':
                next.scaleY = num
                break
            case 'scaleZ':
                next.scaleZ = num
                break
            case 'scale':
                next.scaleX = num
                next.scaleY = num
                break
            case 'skewX':
                next.skewX = num
                break
            case 'skewY':
                next.skewY = num
                break
            case 'perspective':
                next.perspective = num
                break
            default:
                break
        }
    }

    return next
}

const buildTransform = (state: TransformState) => {
    const parts: string[] = []
    if (state.matrix) return `matrix(${state.matrix})`
    if (state.translateX) parts.push(`translateX(${formatNumber(state.translateX)}px)`)
    if (state.translateY) parts.push(`translateY(${formatNumber(state.translateY)}px)`)
    if (state.translateZ) parts.push(`translateZ(${formatNumber(state.translateZ)}px)`)
    if (state.rotate) parts.push(`rotate(${formatNumber(state.rotate)}deg)`)
    if (state.rotateX) parts.push(`rotateX(${formatNumber(state.rotateX)}deg)`)
    if (state.rotateY) parts.push(`rotateY(${formatNumber(state.rotateY)}deg)`)
    if (state.rotateZ) parts.push(`rotateZ(${formatNumber(state.rotateZ)}deg)`)
    if (state.skewX) parts.push(`skewX(${formatNumber(state.skewX)}deg)`)
    if (state.skewY) parts.push(`skewY(${formatNumber(state.skewY)}deg)`)
    if (state.scaleX !== 1 || state.scaleY !== 1) {
        if (state.scaleX === state.scaleY) {
            parts.push(`scale(${formatNumber(state.scaleX, 3)})`)
        } else {
            parts.push(`scale(${formatNumber(state.scaleX, 3)}, ${formatNumber(state.scaleY, 3)})`)
        }
    }
    if (state.scaleZ !== 1) parts.push(`scaleZ(${formatNumber(state.scaleZ, 3)})`)
    if (state.perspective) parts.push(`perspective(${formatNumber(state.perspective)}px)`)
    return parts.join(' ')
}

export const CssEditor = React.forwardRef<CssEditorHandle, CssEditorProps>(function CssEditor(
    { element, props, tokens, status, hostApi, onSaveStyles, onStateChange }: CssEditorProps,
    ref,
) {
    const [group, setGroup] = React.useState('layout')
    const [search, setSearch] = React.useState('')
    const [sidebarPinned, setSidebarPinned] = React.useState(() => {
        if (typeof window === 'undefined') return false
        try {
            return window.localStorage.getItem(SIDEBAR_PIN_STORAGE_KEY) === 'true'
        } catch {
            return false
        }
    })
    const [sidebarHover, setSidebarHover] = React.useState(false)
    const [saving, setSaving] = React.useState(false)
    const baseStyleTextRef = React.useRef('')
    const defaultUnit = hostApi?.unit ?? 'px'

    const [overflowMode, setOverflowMode] = React.useState<'shorthand' | 'axis'>('shorthand')
    const [backgroundMode, setBackgroundMode] = React.useState<'shorthand' | 'detailed'>('detailed')
    const [transitionMode, setTransitionMode] = React.useState<'shorthand' | 'detailed'>('shorthand')
    const [animationMode, setAnimationMode] = React.useState<'shorthand' | 'detailed'>('shorthand')
    const [bezierTarget, setBezierTarget] = React.useState<BezierTarget | null>(null)
    const [bezierPoints, setBezierPoints] = React.useState<Point[]>(() => [...defaultBezierPoints])
    const bezierWrapRef = React.useRef<HTMLDivElement | null>(null)
    const [bezierSize, setBezierSize] = React.useState({ width: 360, height: 220 })

    const initialValues = React.useMemo(() => {
        const values: Record<string, string> = {}
        for (const prop of props) {
            const name = prop.path[0]
            if (!name) continue
            if (!isCssProperty(name)) continue
            values[toDashCase(name)] = prop.value
        }
        if (element) {
            const inline = parseInlineStyles(element.getAttribute('style') ?? '')
            for (const [prop, value] of Object.entries(inline)) {
                if (!values[prop]) values[prop] = value
            }
        }
        return values
    }, [props, element])

    const [state, dispatch] = React.useReducer(reducer, {
        initial: initialValues,
        draft: initialValues,
        history: [initialValues],
        historyIndex: 0,
    })
    const overflowAxisRef = React.useRef({ x: '', y: '' })
    const overflowShorthandRef = React.useRef('')
    const backgroundLonghandRef = React.useRef<Record<string, string>>({})
    const backgroundShorthandRef = React.useRef('')
    const transitionLonghandRef = React.useRef<Record<string, string>>({})
    const transitionShorthandRef = React.useRef('')
    const animationLonghandRef = React.useRef<Record<string, string>>({})
    const animationShorthandRef = React.useRef('')

    React.useEffect(() => {
        if (typeof window === 'undefined') return
        try {
            window.localStorage.setItem(SIDEBAR_PIN_STORAGE_KEY, sidebarPinned ? 'true' : 'false')
        } catch {
            // Ignore storage write failures (e.g. privacy mode).
        }
    }, [sidebarPinned])

    React.useEffect(() => {
        dispatch({ type: 'init', values: initialValues })
    }, [initialValues])

    const getCurrentValue = React.useCallback(
        (prop: string) => state.draft[prop] ?? state.initial[prop] ?? '',
        [state.draft, state.initial],
    )

    const setValue = React.useCallback(
        (prop: string, value: string, commit = false) => {
            dispatch({ type: 'set', prop, value, commit })
        },
        [dispatch],
    )

    const setValues = React.useCallback(
        (values: Record<string, string>, commit = false) => {
            dispatch({ type: 'batch', values, commit })
        },
        [dispatch],
    )

    const handleOverflowModeChange = React.useCallback(
        (next: 'shorthand' | 'axis') => {
            if (next === overflowMode) return
            if (next === 'axis') {
                const overflowValue = getCurrentValue('overflow')
                const saved = overflowAxisRef.current
                overflowShorthandRef.current = overflowValue
                const nextX = saved.x || overflowValue
                const nextY = saved.y || overflowValue
                setValues(
                    {
                        overflow: '',
                        'overflow-x': nextX,
                        'overflow-y': nextY,
                    },
                    true,
                )
            } else {
                const overflowValue = getCurrentValue('overflow')
                const currentX = getCurrentValue('overflow-x')
                const currentY = getCurrentValue('overflow-y')
                overflowAxisRef.current = { x: currentX, y: currentY }
                const nextOverflow = overflowValue || currentX || currentY || overflowShorthandRef.current
                setValues(
                    {
                        overflow: nextOverflow,
                        'overflow-x': '',
                        'overflow-y': '',
                    },
                    true,
                )
            }
            setOverflowMode(next)
        },
        [getCurrentValue, overflowMode, setValues],
    )

    const handleBackgroundModeChange = React.useCallback(
        (next: 'shorthand' | 'detailed') => {
            if (next === backgroundMode) return
            if (next === 'shorthand') {
                const currentBackground = getCurrentValue('background')
                const longhandValues: Record<string, string> = {}
                for (const prop of backgroundLonghandProps) {
                    longhandValues[prop] = getCurrentValue(prop)
                }
                backgroundLonghandRef.current = longhandValues
                backgroundShorthandRef.current = currentBackground
                const fallbackPieces = [longhandValues['background-image'], longhandValues['background-color']].filter(
                    Boolean,
                )
                const nextBackground = currentBackground || fallbackPieces.join(' ')
                setValues(
                    Object.fromEntries([
                        ['background', nextBackground],
                        ...backgroundLonghandProps.map(prop => [prop, '']),
                    ]),
                    true,
                )
            } else {
                const currentBackground = getCurrentValue('background')
                backgroundShorthandRef.current = currentBackground
                const longhandValues = backgroundLonghandRef.current
                const updates = Object.fromEntries(
                    backgroundLonghandProps.map(prop => [prop, longhandValues[prop] || '']),
                )
                updates['background'] = ''
                setValues(updates, true)
            }
            setBackgroundMode(next)
        },
        [backgroundMode, getCurrentValue, setValues],
    )

    const handleTransitionModeChange = React.useCallback(
        (next: 'shorthand' | 'detailed') => {
            if (next === transitionMode) return
            if (next === 'shorthand') {
                const currentTransition = getCurrentValue('transition')
                const longhandValues: Record<string, string> = {}
                for (const prop of transitionLonghandProps) {
                    longhandValues[prop] = getCurrentValue(prop)
                }
                transitionLonghandRef.current = longhandValues
                transitionShorthandRef.current = currentTransition
                const nextTransition = currentTransition || transitionShorthandRef.current
                setValues(
                    Object.fromEntries([
                        ['transition', nextTransition],
                        ...transitionLonghandProps.map(prop => [prop, '']),
                    ]),
                    true,
                )
            } else {
                const currentTransition = getCurrentValue('transition')
                transitionShorthandRef.current = currentTransition
                const storedLonghand = transitionLonghandRef.current
                const updates = Object.fromEntries([
                    ['transition', ''],
                    ...transitionLonghandProps.map(prop => [prop, storedLonghand[prop] || getCurrentValue(prop) || '']),
                ])
                setValues(updates, true)
            }
            setTransitionMode(next)
        },
        [getCurrentValue, setValues, transitionMode],
    )

    const handleAnimationModeChange = React.useCallback(
        (next: 'shorthand' | 'detailed') => {
            if (next === animationMode) return
            if (next === 'shorthand') {
                const currentAnimation = getCurrentValue('animation')
                const longhandValues: Record<string, string> = {}
                for (const prop of animationLonghandProps) {
                    longhandValues[prop] = getCurrentValue(prop)
                }
                animationLonghandRef.current = longhandValues
                animationShorthandRef.current = currentAnimation
                const nextAnimation = currentAnimation || animationShorthandRef.current
                setValues(
                    Object.fromEntries([
                        ['animation', nextAnimation],
                        ...animationLonghandProps.map(prop => [prop, '']),
                    ]),
                    true,
                )
            } else {
                const currentAnimation = getCurrentValue('animation')
                animationShorthandRef.current = currentAnimation
                const storedLonghand = animationLonghandRef.current
                const updates = Object.fromEntries([
                    ['animation', ''],
                    ...animationLonghandProps.map(prop => [prop, storedLonghand[prop] || getCurrentValue(prop) || '']),
                ])
                setValues(updates, true)
            }
            setAnimationMode(next)
        },
        [animationMode, getCurrentValue, setValues],
    )

    React.useEffect(() => {
        const hasAxis = Boolean(initialValues['overflow-x'] || initialValues['overflow-y'])
        setOverflowMode(hasAxis ? 'axis' : 'shorthand')
    }, [initialValues])

    React.useEffect(() => {
        const hasBackground = Boolean(initialValues.background)
        setBackgroundMode(hasBackground ? 'shorthand' : 'detailed')
    }, [initialValues.background])

    React.useEffect(() => {
        const hasTransitionLonghand = transitionLonghandProps.some(prop => Boolean(initialValues[prop]))
        const hasTransitionShorthand = Boolean(initialValues.transition)
        setTransitionMode(hasTransitionLonghand && !hasTransitionShorthand ? 'detailed' : 'shorthand')
    }, [initialValues])

    React.useEffect(() => {
        const hasAnimationLonghand = animationLonghandProps.some(prop => Boolean(initialValues[prop]))
        const hasAnimationShorthand = Boolean(initialValues.animation)
        setAnimationMode(hasAnimationLonghand && !hasAnimationShorthand ? 'detailed' : 'shorthand')
    }, [initialValues])

    React.useEffect(() => {
        if (!element) return
        const raw = element.getAttribute('style') ?? ''
        baseStyleTextRef.current = raw
        return () => {
            if (!element) return
            if (baseStyleTextRef.current) {
                element.setAttribute('style', baseStyleTextRef.current)
            } else {
                element.removeAttribute('style')
            }
        }
    }, [element])

    React.useEffect(() => {
        if (!element || !(element instanceof HTMLElement)) return
        element.style.cssText = baseStyleTextRef.current
        for (const [prop, value] of Object.entries(state.draft)) {
            if (!value) continue
            const preview = resolvePreviewValue(prop, value, tokens, hostApi ?? undefined)
            if (!preview) continue
            element.style.setProperty(prop, preview)
        }
    }, [element, hostApi, state.draft, tokens])

    const dirty = React.useMemo(() => {
        const keys = new Set([...Object.keys(state.draft), ...Object.keys(state.initial)])
        for (const key of keys) {
            if ((state.draft[key] ?? '') !== (state.initial[key] ?? '')) return true
        }
        return false
    }, [state.draft, state.initial])

    const canUndo = state.historyIndex > 0
    const canRedo = state.historyIndex < state.history.length - 1

    const handleSave = React.useCallback(async () => {
        if (!dirty || saving) return
        const keys = new Set([...Object.keys(state.draft), ...Object.keys(state.initial)])
        const changes = Array.from(keys)
            .map(prop => ({ prop, value: state.draft[prop] ?? '' }))
            .filter(({ prop, value }) => (state.initial[prop] ?? '') !== value)

        setSaving(true)
        try {
            await onSaveStyles(changes)
        } finally {
            setSaving(false)
        }
    }, [dirty, onSaveStyles, saving, state.draft, state.initial])

    React.useEffect(() => {
        onStateChange?.({ dirty, canUndo, canRedo, saving })
    }, [canRedo, canUndo, dirty, onStateChange, saving])

    React.useImperativeHandle(
        ref,
        () => ({
            undo: () => dispatch({ type: 'undo' }),
            redo: () => dispatch({ type: 'redo' }),
            reset: () => dispatch({ type: 'reset' }),
            save: () => void handleSave(),
        }),
        [handleSave],
    )

    const displayValue = resolvePreviewValue(
        'display',
        state.draft.display ?? state.initial.display ?? '',
        tokens,
        hostApi ?? undefined,
    )
    const isFlex = displayValue.includes('flex')
    const isGrid = displayValue.includes('grid')
    const toNumber = React.useCallback((value: string, fallback: number) => asNumber(value, fallback), [])
    const activeTimingProp = bezierTarget ? timingTargetProps[bezierTarget] : null
    const activeTimingValue = activeTimingProp ? getCurrentValue(activeTimingProp) : ''

    const handleBezierToggle = React.useCallback(
        (target: BezierTarget) => {
            const nextValue = getCurrentValue(timingTargetProps[target])
            setBezierPoints(parseTimingFunction(nextValue))
            setBezierTarget(current => (current === target ? null : target))
        },
        [getCurrentValue],
    )

    const handleBezierPointsChange = React.useCallback(
        (nextPoints: Point[]) => {
            if (!bezierTarget) return
            const normalized = normalizeBezierPoints(nextPoints)
            setBezierPoints(normalized)
            setValue(timingTargetProps[bezierTarget], formatTimingFunction(normalized), true)
        },
        [bezierTarget, setValue],
    )

    React.useEffect(() => {
        if (!bezierTarget) return
        setBezierPoints(parseTimingFunction(activeTimingValue))
    }, [activeTimingValue, bezierTarget])

    React.useEffect(() => {
        if (!bezierTarget) return
        const element = bezierWrapRef.current
        if (!element || typeof ResizeObserver === 'undefined') return
        const updateSize = () => {
            const rect = element.getBoundingClientRect()
            const nextWidth = Math.max(240, Math.min(420, Math.floor(rect.width)))
            const nextHeight = nextWidth
            setBezierSize(current =>
                current.width === nextWidth && current.height === nextHeight
                    ? current
                    : { width: nextWidth, height: nextHeight },
            )
        }
        updateSize()
        const observer = new ResizeObserver(updateSize)
        observer.observe(element)
        return () => observer.disconnect()
    }, [bezierTarget])

    const renderBezierButton = (target: BezierTarget) => (
        <button
            className={cx(
                'height:100% display:flex align-items:center justify-content:center padding:0_6px border:none background:transparent color:#b7c2d4 cursor:pointer',
                bezierTarget === target && 'color:primary-soft',
            )}
            onClick={() => handleBezierToggle(target)}
            aria-label="Edit timing curve"
            title="Edit timing curve"
            type="button"
        >
            <BezierCurve size={12} weight={bezierTarget === target ? 'fill' : 'regular'} />
        </button>
    )

    const transformState = React.useMemo(
        () => parseTransform(state.draft.transform ?? state.initial.transform ?? ''),
        [state.draft.transform, state.initial.transform],
    )

    const miscProps = React.useMemo(() => {
        const term = search.trim().toLowerCase()
        const filtered = cssProperties.filter(prop => !miscExcludedProps.has(prop))
        if (!term) return filtered.slice(0, 80)
        return filtered.filter(prop => prop.includes(term)).slice(0, 120)
    }, [search])

    const sidebarExpanded = sidebarPinned || sidebarHover
    const sidebarCollapsedWidth = 56
    const sidebarExpandedWidth = 180

    return (
        <DefaultUnitContext.Provider value={defaultUnit}>
            <div className="display:flex width:100% flex:1 min-height:0 position:relative">
                <div
                    className={cx(
                        'position:absolute left:0 top:0 bottom:0 z-index:5 border-right:1px_solid_rgba(84,96,116,0.28) background:linear-gradient(180deg,rgba(18,22,30,0.9),rgba(10,12,18,0.94)) display:flex flex-direction:column gap:10px box-sizing:border-box transition:width_160ms_ease padding:12px_10px',
                    )}
                    style={{ width: sidebarExpanded ? sidebarExpandedWidth : sidebarCollapsedWidth }}
                    onPointerEnter={() => setSidebarHover(true)}
                    onPointerLeave={() => setSidebarHover(false)}
                >
                    <div className="display:flex align-items:center gap:8px padding:6px_8px border-radius:10px background-color:rgba(9,12,18,0.8) border:1px_solid_rgba(88,102,128,0.3) overflow:hidden">
                        <MagnifyingGlass size={14} className="color:#8c98ad flex-shrink:0" />
                        <input
                            className={cx(
                                'background:transparent border:none outline:none color:#dfe7f4 font-size:11px transition:opacity_120ms_ease,width_120ms_ease',
                                sidebarExpanded
                                    ? 'flex:1 min-width:0 opacity:1'
                                    : 'width:0 opacity:0 pointer-events:none',
                            )}
                            value={search}
                            onChange={event => setSearch(event.target.value)}
                            placeholder="Search"
                        />
                    </div>
                    <div className="display:flex flex-direction:column gap:4px width:100%">
                        {groupList.map(item => {
                            const active = item.id === group
                            const Icon = item.icon
                            return (
                                <button
                                    key={item.id}
                                    className={cx(
                                        'appearance:none border:0 outline:none background-color:transparent width:100% display:flex align-items:center min-height:30px border-radius:10px font-size:12px font-weight:600 cursor:pointer transition:background-color_120ms_ease,color_120ms_ease color:#ffffff gap:10px text-align:left padding:6px_10px justify-content:flex-start',
                                        active && 'background-color:primary',
                                    )}
                                    onClick={() => setGroup(item.id)}
                                    aria-label={item.label}
                                    title={item.label}
                                >
                                    <Icon size={16} className="color:#ffffff flex-shrink:0" />
                                    {sidebarExpanded ? item.label : null}
                                </button>
                            )
                        })}
                    </div>
                    {sidebarExpanded ? (
                        <button
                            className={cx(
                                'position:absolute right:8px bottom:8px width:26px height:26px border-radius:8px border:1px_solid_rgba(88,102,128,0.4) background-color:rgba(9,12,18,0.7) color:#c8d2e3 display:flex align-items:center justify-content:center cursor:pointer transition:background-color_120ms_ease,color_120ms_ease,border-color_120ms_ease',
                                sidebarPinned &&
                                    'background-color:primary-20 color:primary-soft border-color:primary-60',
                            )}
                            onClick={() => setSidebarPinned(current => !current)}
                            aria-label={sidebarPinned ? 'Unpin sidebar' : 'Pin sidebar'}
                            title={sidebarPinned ? 'Unpin sidebar' : 'Pin sidebar'}
                            type="button"
                        >
                            <PushPinSimple size={14} weight={sidebarPinned ? 'fill' : 'regular'} />
                        </button>
                    ) : null}
                </div>
                <div
                    className="flex:1 min-width:0 display:flex flex-direction:column"
                    style={{ paddingLeft: sidebarPinned ? sidebarExpandedWidth : sidebarCollapsedWidth }}
                >
                    <div className="flex:1 min-height:0 overflow:auto padding:16px  display:flex flex-direction:column gap:14px">
                        {group === 'layout' ? (
                        <SectionStack>
                            <Section title="Display" description="Layout primitives and flow" layout="grid">
                                <CompactDropdown
                                    label="Display"
                                    value={state.draft.display ?? state.initial.display ?? ''}
                                    options={displayOptions}
                                    onChange={value => setValue('display', value, true)}
                                    />
                                    <CompactDropdown
                                        label="Position"
                                        value={state.draft.position ?? state.initial.position ?? ''}
                                        options={positionOptions}
                                        onChange={value => setValue('position', value, true)}
                                    />
                                    <CompactDropdown
                                        label="Visibility"
                                        value={state.draft.visibility ?? state.initial.visibility ?? ''}
                                        options={['visible', 'hidden', 'collapse']}
                                        onChange={value => setValue('visibility', value, true)}
                                    />
                                    <CompactDropdown
                                        label="Box Sizing"
                                        value={state.draft['box-sizing'] ?? state.initial['box-sizing'] ?? ''}
                                        options={['border-box', 'content-box']}
                                        onChange={value => setValue('box-sizing', value, true)}
                                    />
                                    <SectionSpan>
                                        <div className="display:flex align-items:center gap:8px flex-wrap:wrap">
                                            <button
                                                className="height:32px width:30px border-radius:10px border:1px_solid_rgba(88,102,128,0.4) background-color:rgba(12,16,22,0.9) color:#b7c2d4 display:flex align-items:center justify-content:center cursor:pointer transition:background-color_120ms_ease,color_120ms_ease,border-color_120ms_ease"
                                                onClick={() =>
                                                    handleOverflowModeChange(
                                                        overflowMode === 'shorthand' ? 'axis' : 'shorthand',
                                                    )
                                                }
                                                aria-label={
                                                    overflowMode === 'shorthand' ? 'Split overflow' : 'Merge overflow'
                                                }
                                                title={
                                                    overflowMode === 'shorthand' ? 'Split overflow' : 'Merge overflow'
                                                }
                                                type="button"
                                            >
                                                <SplitHorizontal
                                                    size={14}
                                                    weight={overflowMode === 'axis' ? 'fill' : 'regular'}
                                                />
                                            </button>
                                            {overflowMode === 'shorthand' ? (
                                                <CompactDropdown
                                                    label="Overflow"
                                                    value={state.draft.overflow ?? state.initial.overflow ?? ''}
                                                    options={overflowOptions}
                                                    onChange={value => setValue('overflow', value, true)}
                                                />
                                            ) : (
                                                <>
                                                    <CompactDropdown
                                                        label="Overflow X"
                                                        value={
                                                            state.draft['overflow-x'] ??
                                                            state.initial['overflow-x'] ??
                                                            ''
                                                        }
                                                        options={overflowOptions}
                                                        onChange={value => setValue('overflow-x', value, true)}
                                                    />
                                                    <CompactDropdown
                                                        label="Overflow Y"
                                                        value={
                                                            state.draft['overflow-y'] ??
                                                            state.initial['overflow-y'] ??
                                                            ''
                                                        }
                                                        options={overflowOptions}
                                                        onChange={value => setValue('overflow-y', value, true)}
                                                    />
                                                </>
                                            )}
                                        </div>
                                    </SectionSpan>
                            </Section>
                            {isFlex ? (
                                <Section title="Flex" description="Flexbox layouts" layout="grid">
                                    <CompactDropdown
                                        label="Direction"
                                        value={state.draft['flex-direction'] ?? state.initial['flex-direction'] ?? ''}
                                        options={['row', 'row-reverse', 'column', 'column-reverse']}
                                        onChange={value => setValue('flex-direction', value, true)}
                                    />
                                    <CompactDropdown
                                        label="Wrap"
                                        value={state.draft['flex-wrap'] ?? state.initial['flex-wrap'] ?? ''}
                                        options={['nowrap', 'wrap', 'wrap-reverse']}
                                        onChange={value => setValue('flex-wrap', value, true)}
                                    />
                                    <CompactDropdown
                                        label="Justify"
                                        value={state.draft['justify-content'] ?? state.initial['justify-content'] ?? ''}
                                        options={justifyContentOptions}
                                        onChange={value => setValue('justify-content', value, true)}
                                    />
                                    <CompactDropdown
                                        label="Align Items"
                                        value={state.draft['align-items'] ?? state.initial['align-items'] ?? ''}
                                        options={alignItemsOptions}
                                        onChange={value => setValue('align-items', value, true)}
                                    />
                                    <CompactInputRow
                                        label="Gap"
                                        prop="gap"
                                        value={state.draft.gap ?? state.initial.gap ?? ''}
                                        onChange={value => setValue('gap', value, true)}
                                        tokens={tokens}
                                    />
                                </Section>
                            ) : null}
                            {isGrid ? (
                                <Section title="Grid" description="Grid templates" layout="grid">
                                    <CompactInputRow
                                        label="Columns"
                                        prop="grid-template-columns"
                                        value={
                                            state.draft['grid-template-columns'] ??
                                            state.initial['grid-template-columns'] ??
                                            ''
                                        }
                                        onChange={value => setValue('grid-template-columns', value, true)}
                                        tokens={tokens}
                                        mode="text"
                                    />
                                    <CompactInputRow
                                        label="Rows"
                                        prop="grid-template-rows"
                                        value={
                                            state.draft['grid-template-rows'] ??
                                            state.initial['grid-template-rows'] ??
                                            ''
                                        }
                                        onChange={value => setValue('grid-template-rows', value, true)}
                                        tokens={tokens}
                                        mode="text"
                                    />
                                    <CompactDropdown
                                        label="Auto Flow"
                                        value={state.draft['grid-auto-flow'] ?? state.initial['grid-auto-flow'] ?? ''}
                                        options={['row', 'column', 'dense', 'row dense', 'column dense']}
                                        onChange={value => setValue('grid-auto-flow', value, true)}
                                    />
                                    <CompactInputRow
                                        label="Gap"
                                        prop="gap"
                                        value={state.draft.gap ?? state.initial.gap ?? ''}
                                        onChange={value => setValue('gap', value, true)}
                                        tokens={tokens}
                                    />
                                </Section>
                            ) : null}
                            <Section title="Size" description="Dimensions and constraints" layout="grid">
                                <CompactInputRow
                                    label="Width"
                                    prop="width"
                                    value={state.draft.width ?? state.initial.width ?? ''}
                                    onChange={value => setValue('width', value, true)}
                                        tokens={tokens}
                                    />
                                    <CompactInputRow
                                        label="Height"
                                        prop="height"
                                        value={state.draft.height ?? state.initial.height ?? ''}
                                        onChange={value => setValue('height', value, true)}
                                        tokens={tokens}
                                    />
                                    <CompactInputRow
                                        label="Min Width"
                                        prop="min-width"
                                        value={state.draft['min-width'] ?? state.initial['min-width'] ?? ''}
                                        onChange={value => setValue('min-width', value, true)}
                                        tokens={tokens}
                                    />
                                    <CompactInputRow
                                        label="Min Height"
                                        prop="min-height"
                                        value={state.draft['min-height'] ?? state.initial['min-height'] ?? ''}
                                        onChange={value => setValue('min-height', value, true)}
                                        tokens={tokens}
                                    />
                                    <CompactInputRow
                                        label="Max Width"
                                        prop="max-width"
                                        value={state.draft['max-width'] ?? state.initial['max-width'] ?? ''}
                                        onChange={value => setValue('max-width', value, true)}
                                        tokens={tokens}
                                    />
                                    <CompactInputRow
                                        label="Max Height"
                                        prop="max-height"
                                        value={state.draft['max-height'] ?? state.initial['max-height'] ?? ''}
                                        onChange={value => setValue('max-height', value, true)}
                                        tokens={tokens}
                                    />
                                <CompactInputRow
                                    label="Aspect Ratio"
                                    prop="aspect-ratio"
                                    value={state.draft['aspect-ratio'] ?? state.initial['aspect-ratio'] ?? ''}
                                    onChange={value => setValue('aspect-ratio', value, true)}
                                    tokens={tokens}
                                    mode="text"
                                />
                            </Section>
                                <Section title="Spacing" description="Padding and margins" layout="grid">
                                    <SpacingControl
                                        label="Margin"
                                        props={spacingProps.margin}
                                        state={state}
                                        onChange={setValues}
                                        tokens={tokens}
                                    />
                                    <SpacingControl
                                        label="Padding"
                                        props={spacingProps.padding}
                                        state={state}
                                        onChange={setValues}
                                        tokens={tokens}
                                    />
                                    <SpacingControl
                                        label="Inset"
                                        props={spacingProps.inset}
                                        state={state}
                                        onChange={setValues}
                                        tokens={tokens}
                                    />
                                </Section>
                                <Section title="Position" description="Offsets and stacking" layout="grid">
                                    <CompactInputRow
                                        label="Z-Index"
                                        prop="z-index"
                                        value={state.draft['z-index'] ?? state.initial['z-index'] ?? ''}
                                        onChange={value => setValue('z-index', value, true)}
                                        tokens={tokens}
                                    />
                                </Section>
                            </SectionStack>
                        ) : null}
                        {group === 'type' ? (
                            <SectionStack>
                                <Section title="Typography" description="Font, spacing, and color" layout="grid">
                                    <CompactInputRow
                                        label="Font Family"
                                        prop="font-family"
                                        value={state.draft['font-family'] ?? state.initial['font-family'] ?? ''}
                                        onChange={value => setValue('font-family', value, true)}
                                        tokens={tokens}
                                        mode="text"
                                    />
                                    <CompactInputRow
                                        label="Font Size"
                                        prop="font-size"
                                        value={state.draft['font-size'] ?? state.initial['font-size'] ?? ''}
                                        onChange={value => setValue('font-size', value, true)}
                                        tokens={tokens}
                                    />
                                    <CompactDropdown
                                        label="Font Weight"
                                        value={state.draft['font-weight'] ?? state.initial['font-weight'] ?? ''}
                                        options={fontWeightOptions}
                                        onChange={value => setValue('font-weight', value, true)}
                                    />
                                    <CompactInputRow
                                        label="Line Height"
                                        prop="line-height"
                                        value={state.draft['line-height'] ?? state.initial['line-height'] ?? ''}
                                        onChange={value => setValue('line-height', value, true)}
                                        tokens={tokens}
                                    />
                                    <CompactInputRow
                                        label="Letter Spacing"
                                        prop="letter-spacing"
                                        value={state.draft['letter-spacing'] ?? state.initial['letter-spacing'] ?? ''}
                                        onChange={value => setValue('letter-spacing', value, true)}
                                        tokens={tokens}
                                    />
                                    <CompactDropdown
                                        label="Text Wrap"
                                        value={state.draft['text-wrap'] ?? state.initial['text-wrap'] ?? ''}
                                        options={textWrapOptions}
                                        onChange={value => setValue('text-wrap', value, true)}
                                    />
                                    <CompactDropdown
                                        label="Text Align"
                                        value={state.draft['text-align'] ?? state.initial['text-align'] ?? ''}
                                        options={textAlignIconOptions}
                                        onChange={value => setValue('text-align', value, true)}
                                    />
                                    <CompactDropdown
                                        label="Text Transform"
                                        value={state.draft['text-transform'] ?? state.initial['text-transform'] ?? ''}
                                        options={textTransformOptions}
                                        onChange={value => setValue('text-transform', value, true)}
                                    />
                                    <CompactDropdown
                                        label="Text Overflow"
                                        value={state.draft['text-overflow'] ?? state.initial['text-overflow'] ?? ''}
                                        options={textOverflowOptions}
                                        onChange={value => setValue('text-overflow', value, true)}
                                    />
                                    <CompactInputRow
                                        label="Text Indent"
                                        prop="text-indent"
                                        value={state.draft['text-indent'] ?? state.initial['text-indent'] ?? ''}
                                        onChange={value => setValue('text-indent', value, true)}
                                        tokens={tokens}
                                    />
                                    <CompactInputRow
                                        label="Line Clamp"
                                        prop="line-clamp"
                                        value={state.draft['line-clamp'] ?? state.initial['line-clamp'] ?? ''}
                                        onChange={value => setValue('line-clamp', value, true)}
                                        tokens={tokens}
                                    />
                                    <CompactDropdown
                                        label="Text Box Trim"
                                        value={state.draft['text-box-trim'] ?? state.initial['text-box-trim'] ?? ''}
                                        options={textBoxTrimOptions}
                                        onChange={value => setValue('text-box-trim', value, true)}
                                    />
                                    <CompactDropdown
                                        label="Text Box Edge"
                                        value={state.draft['text-box-edge'] ?? state.initial['text-box-edge'] ?? ''}
                                        options={textBoxEdgeOptions}
                                        onChange={value => setValue('text-box-edge', value, true)}
                                    />
                                    <CompactDropdown
                                        label="Text Spacing Trim"
                                        value={
                                            state.draft['text-spacing-trim'] ?? state.initial['text-spacing-trim'] ?? ''
                                        }
                                        options={textSpacingTrimOptions}
                                        onChange={value => setValue('text-spacing-trim', value, true)}
                                    />
                                    <CompactDropdown
                                        label="Text Decoration Line"
                                        value={
                                            state.draft['text-decoration-line'] ??
                                            state.initial['text-decoration-line'] ??
                                            ''
                                        }
                                        options={textDecorationLineOptions}
                                        onChange={value => setValue('text-decoration-line', value, true)}
                                    />
                                    <CompactDropdown
                                        label="Text Decoration Style"
                                        value={
                                            state.draft['text-decoration-style'] ??
                                            state.initial['text-decoration-style'] ??
                                            ''
                                        }
                                        options={textDecorationStyleOptions}
                                        onChange={value => setValue('text-decoration-style', value, true)}
                                    />
                                    <CompactInputRow
                                        label="Text Decoration Thickness"
                                        prop="text-decoration-thickness"
                                        value={
                                            state.draft['text-decoration-thickness'] ??
                                            state.initial['text-decoration-thickness'] ??
                                            ''
                                        }
                                        onChange={value => setValue('text-decoration-thickness', value, true)}
                                        tokens={tokens}
                                    />
                                    <CompactInputRow
                                        label="Underline Offset"
                                        prop="text-underline-offset"
                                        value={
                                            state.draft['text-underline-offset'] ??
                                            state.initial['text-underline-offset'] ??
                                            ''
                                        }
                                        onChange={value => setValue('text-underline-offset', value, true)}
                                        tokens={tokens}
                                    />
                                    <CompactDropdown
                                        label="Underline Position"
                                        value={
                                            state.draft['text-underline-position'] ??
                                            state.initial['text-underline-position'] ??
                                            ''
                                        }
                                        options={textUnderlinePositionOptions}
                                        onChange={value => setValue('text-underline-position', value, true)}
                                    />
                                    <SectionSpan>
                                        <ColorRow
                                            label="Text Decoration Color"
                                            prop="text-decoration-color"
                                            value={
                                                state.draft['text-decoration-color'] ??
                                                state.initial['text-decoration-color'] ??
                                                ''
                                            }
                                            onChange={value => setValue('text-decoration-color', value, true)}
                                            tokens={tokens}
                                        />
                                    </SectionSpan>
                                    <SectionSpan>
                                        <ColorRow
                                            label="Text Color"
                                            prop="color"
                                            value={state.draft.color ?? state.initial.color ?? ''}
                                            onChange={value => setValue('color', value, true)}
                                            tokens={tokens}
                                        />
                                    </SectionSpan>
                                </Section>
                            </SectionStack>
                        ) : null}
                        {group === 'background' ? (
                            <SectionStack>
                                <Section title="Background" description="Color and imagery" layout="grid">
                                    <SectionSpan>
                                        <ControlRow label="Edit Mode">
                                            <OptionGroup
                                                value={backgroundMode}
                                                options={backgroundModeOptions}
                                                onChange={value =>
                                                    handleBackgroundModeChange(value as 'shorthand' | 'detailed')
                                                }
                                            />
                                        </ControlRow>
                                    </SectionSpan>
                                    {backgroundMode === 'shorthand' ? (
                                        <SectionSpan>
                                            <CompactInputRow
                                                label="Background"
                                                prop="background"
                                                value={state.draft.background ?? state.initial.background ?? ''}
                                                onChange={value => setValue('background', value, true)}
                                                tokens={tokens}
                                                mode="text"
                                            />
                                        </SectionSpan>
                                    ) : (
                                        <>
                                            <SectionSpan>
                                                <ColorRow
                                                    label="Background Color"
                                                    prop="background-color"
                                                    value={
                                                        state.draft['background-color'] ??
                                                        state.initial['background-color'] ??
                                                        ''
                                                    }
                                                    onChange={value => setValue('background-color', value, true)}
                                                    tokens={tokens}
                                                />
                                            </SectionSpan>
                                            <SectionSpan>
                                                <GradientRow
                                                    label="Background Image"
                                                    prop="background-image"
                                                    value={
                                                        state.draft['background-image'] ??
                                                        state.initial['background-image'] ??
                                                        ''
                                                    }
                                                    onChange={value => setValue('background-image', value, true)}
                                                />
                                            </SectionSpan>
                                            <CompactDropdown
                                                label="Background Size"
                                                value={
                                                    state.draft['background-size'] ??
                                                    state.initial['background-size'] ??
                                                    ''
                                                }
                                                options={['auto', 'cover', 'contain']}
                                                onChange={value => setValue('background-size', value, true)}
                                            />
                                            <CompactInputRow
                                                label="Background Position"
                                                prop="background-position"
                                                value={
                                                    state.draft['background-position'] ??
                                                    state.initial['background-position'] ??
                                                    ''
                                                }
                                                onChange={value => setValue('background-position', value, true)}
                                                tokens={tokens}
                                                mode="text"
                                            />
                                            <CompactDropdown
                                                label="Background Repeat"
                                                value={
                                                    state.draft['background-repeat'] ??
                                                    state.initial['background-repeat'] ??
                                                    ''
                                                }
                                                options={[
                                                    'repeat',
                                                    'no-repeat',
                                                    'repeat-x',
                                                    'repeat-y',
                                                    'space',
                                                    'round',
                                                ]}
                                                onChange={value => setValue('background-repeat', value, true)}
                                            />
                                            <CompactDropdown
                                                label="Blend Mode"
                                                value={
                                                    state.draft['background-blend-mode'] ??
                                                    state.initial['background-blend-mode'] ??
                                                    ''
                                                }
                                                options={blendModeOptions}
                                                onChange={value => setValue('background-blend-mode', value, true)}
                                            />
                                        </>
                                    )}
                                </Section>
                            </SectionStack>
                        ) : null}
                        {group === 'border' ? (
                            <SectionStack>
                                <Section title="Border" description="Stroke and radius" layout="grid">
                                    <CompactInputRow
                                        label="Border Width"
                                        prop="border-width"
                                        value={state.draft['border-width'] ?? state.initial['border-width'] ?? ''}
                                        onChange={value => setValue('border-width', value, true)}
                                        tokens={tokens}
                                    />
                                    <CompactDropdown
                                        label="Border Style"
                                        value={state.draft['border-style'] ?? state.initial['border-style'] ?? ''}
                                        options={borderStyleOptions}
                                        onChange={value => setValue('border-style', value, true)}
                                    />
                                    <SectionSpan>
                                        <ColorRow
                                            label="Border Color"
                                            prop="border-color"
                                            value={state.draft['border-color'] ?? state.initial['border-color'] ?? ''}
                                            onChange={value => setValue('border-color', value, true)}
                                            tokens={tokens}
                                        />
                                    </SectionSpan>
                                    <CompactInputRow
                                        label="Radius"
                                        prop="border-radius"
                                        value={state.draft['border-radius'] ?? state.initial['border-radius'] ?? ''}
                                        onChange={value => setValue('border-radius', value, true)}
                                        tokens={tokens}
                                    />
                                </Section>
                                <Section title="Outline" description="Focus rings and outlines" layout="grid">
                                    <CompactInputRow
                                        label="Outline Width"
                                        prop="outline-width"
                                        value={state.draft['outline-width'] ?? state.initial['outline-width'] ?? ''}
                                        onChange={value => setValue('outline-width', value, true)}
                                        tokens={tokens}
                                    />
                                    <CompactDropdown
                                        label="Outline Style"
                                        value={state.draft['outline-style'] ?? state.initial['outline-style'] ?? ''}
                                        options={borderStyleOptions}
                                        onChange={value => setValue('outline-style', value, true)}
                                    />
                                    <SectionSpan>
                                        <ColorRow
                                            label="Outline Color"
                                            prop="outline-color"
                                            value={state.draft['outline-color'] ?? state.initial['outline-color'] ?? ''}
                                            onChange={value => setValue('outline-color', value, true)}
                                            tokens={tokens}
                                        />
                                    </SectionSpan>
                                </Section>
                            </SectionStack>
                        ) : null}
                        {group === 'effects' ? (
                            <SectionStack>
                                <Section title="Shadows" description="Depth and glow" layout="grid">
                                    <CompactInputRow
                                        label="Box Shadow"
                                        prop="box-shadow"
                                        value={state.draft['box-shadow'] ?? state.initial['box-shadow'] ?? ''}
                                        onChange={value => setValue('box-shadow', value, true)}
                                        tokens={tokens}
                                        mode="text"
                                    />
                                    <CompactInputRow
                                        label="Text Shadow"
                                        prop="text-shadow"
                                        value={state.draft['text-shadow'] ?? state.initial['text-shadow'] ?? ''}
                                        onChange={value => setValue('text-shadow', value, true)}
                                        tokens={tokens}
                                        mode="text"
                                    />
                                </Section>
                                <Section title="Filters" description="Optics and blur" layout="grid">
                                    <CompactInputRow
                                        label="Filter"
                                        prop="filter"
                                        value={state.draft.filter ?? state.initial.filter ?? ''}
                                        onChange={value => setValue('filter', value, true)}
                                        tokens={tokens}
                                        mode="text"
                                    />
                                    <CompactInputRow
                                        label="Backdrop Filter"
                                        prop="backdrop-filter"
                                        value={state.draft['backdrop-filter'] ?? state.initial['backdrop-filter'] ?? ''}
                                        onChange={value => setValue('backdrop-filter', value, true)}
                                        tokens={tokens}
                                        mode="text"
                                    />
                                </Section>
                                <Section title="Blending" description="Opacity and blend">
                                    <CompactInputRow
                                        label="Opacity"
                                        prop="opacity"
                                        value={state.draft.opacity ?? state.initial.opacity ?? ''}
                                        onChange={value => setValue('opacity', value, true)}
                                        tokens={tokens}
                                        min={0}
                                        max={1}
                                        step={0.01}
                                    />
                                    <CompactDropdown
                                        label="Mix Blend"
                                        value={state.draft['mix-blend-mode'] ?? state.initial['mix-blend-mode'] ?? ''}
                                        options={blendModeOptions}
                                        onChange={value => setValue('mix-blend-mode', value, true)}
                                    />
                                </Section>
                            </SectionStack>
                        ) : null}
                        {group === 'transform' ? (
                            <SectionStack>
                                <Section title="Translate" description="X, Y, Z offsets">
                                    <CompactInputRow
                                        label="Translate X"
                                        prop="transform"
                                        value={String(transformState.translateX)}
                                        onChange={value =>
                                            updateTransform(
                                                transformState,
                                                { translateX: toNumber(value, transformState.translateX) },
                                                setValue,
                                                true,
                                            )
                                        }
                                        tokens={tokens}
                                        unitlessOverride
                                    />
                                    <CompactInputRow
                                        label="Translate Y"
                                        prop="transform"
                                        value={String(transformState.translateY)}
                                        onChange={value =>
                                            updateTransform(
                                                transformState,
                                                { translateY: toNumber(value, transformState.translateY) },
                                                setValue,
                                                true,
                                            )
                                        }
                                        tokens={tokens}
                                        unitlessOverride
                                    />
                                    <CompactInputRow
                                        label="Translate Z"
                                        prop="transform"
                                        value={String(transformState.translateZ)}
                                        onChange={value =>
                                            updateTransform(
                                                transformState,
                                                { translateZ: toNumber(value, transformState.translateZ) },
                                                setValue,
                                                true,
                                            )
                                        }
                                        tokens={tokens}
                                        unitlessOverride
                                    />
                                </Section>
                                <Section title="Rotate" description="2D + 3D rotations">
                                    <CompactInputRow
                                        label="Rotate"
                                        prop="transform"
                                        value={String(transformState.rotate)}
                                        onChange={value =>
                                            updateTransform(
                                                transformState,
                                                { rotate: toNumber(value, transformState.rotate) },
                                                setValue,
                                                true,
                                            )
                                        }
                                        tokens={tokens}
                                        unitlessOverride
                                    />
                                    <CompactInputRow
                                        label="Rotate X"
                                        prop="transform"
                                        value={String(transformState.rotateX)}
                                        onChange={value =>
                                            updateTransform(
                                                transformState,
                                                { rotateX: toNumber(value, transformState.rotateX) },
                                                setValue,
                                                true,
                                            )
                                        }
                                        tokens={tokens}
                                        unitlessOverride
                                    />
                                    <CompactInputRow
                                        label="Rotate Y"
                                        prop="transform"
                                        value={String(transformState.rotateY)}
                                        onChange={value =>
                                            updateTransform(
                                                transformState,
                                                { rotateY: toNumber(value, transformState.rotateY) },
                                                setValue,
                                                true,
                                            )
                                        }
                                        tokens={tokens}
                                        unitlessOverride
                                    />
                                    <CompactInputRow
                                        label="Rotate Z"
                                        prop="transform"
                                        value={String(transformState.rotateZ)}
                                        onChange={value =>
                                            updateTransform(
                                                transformState,
                                                { rotateZ: toNumber(value, transformState.rotateZ) },
                                                setValue,
                                                true,
                                            )
                                        }
                                        tokens={tokens}
                                        unitlessOverride
                                    />
                                </Section>
                                <Section title="Scale" description="Uniform + Z">
                                    <CompactInputRow
                                        label="Scale"
                                        prop="transform"
                                        value={String(transformState.scaleX)}
                                        onChange={value => {
                                            const nextScale = toNumber(value, transformState.scaleX)
                                            updateTransform(
                                                transformState,
                                                { scaleX: nextScale, scaleY: nextScale },
                                                setValue,
                                                true,
                                            )
                                        }}
                                        tokens={tokens}
                                        unitlessOverride
                                    />
                                    <CompactInputRow
                                        label="Scale Z"
                                        prop="transform"
                                        value={String(transformState.scaleZ)}
                                        onChange={value =>
                                            updateTransform(
                                                transformState,
                                                { scaleZ: toNumber(value, transformState.scaleZ) },
                                                setValue,
                                                true,
                                            )
                                        }
                                        tokens={tokens}
                                        unitlessOverride
                                    />
                                </Section>
                                <Section title="Skew" description="X and Y">
                                    <CompactInputRow
                                        label="Skew X"
                                        prop="transform"
                                        value={String(transformState.skewX)}
                                        onChange={value =>
                                            updateTransform(
                                                transformState,
                                                { skewX: toNumber(value, transformState.skewX) },
                                                setValue,
                                                true,
                                            )
                                        }
                                        tokens={tokens}
                                        unitlessOverride
                                    />
                                    <CompactInputRow
                                        label="Skew Y"
                                        prop="transform"
                                        value={String(transformState.skewY)}
                                        onChange={value =>
                                            updateTransform(
                                                transformState,
                                                { skewY: toNumber(value, transformState.skewY) },
                                                setValue,
                                                true,
                                            )
                                        }
                                        tokens={tokens}
                                        unitlessOverride
                                    />
                                </Section>
                                <Section title="Perspective" description="Depth">
                                    <CompactInputRow
                                        label="Perspective"
                                        prop="transform"
                                        value={String(transformState.perspective)}
                                        onChange={value =>
                                            updateTransform(
                                                transformState,
                                                { perspective: toNumber(value, transformState.perspective) },
                                                setValue,
                                                true,
                                            )
                                        }
                                        tokens={tokens}
                                        unitlessOverride
                                    />
                                </Section>
                                <Section title="Matrix" description="2D matrix transform">
                                    <CompactInputRow
                                        label="Matrix"
                                        prop="transform"
                                        value={transformState.matrix}
                                        onChange={value =>
                                            updateTransform(transformState, { matrix: value }, setValue, true)
                                        }
                                        tokens={tokens}
                                        mode="text"
                                    />
                                </Section>
                            </SectionStack>
                        ) : null}
                        {group === 'transition' ? (
                            <SectionStack>
                                <Section title="Transition" description="Timing and easing">
                                    <SectionSpan>
                                        <div
                                            className={cx(
                                                'display:flex align-items:center gap:8px flex-wrap:wrap',
                                                transitionMode === 'detailed' && 'width:100% flex:0_0_100%',
                                            )}
                                        >
                                            <button
                                                className="height:32px width:30px border-radius:10px border:1px_solid_rgba(88,102,128,0.4) background-color:rgba(12,16,22,0.9) color:#b7c2d4 display:flex align-items:center justify-content:center cursor:pointer transition:background-color_120ms_ease,color_120ms_ease,border-color_120ms_ease"
                                                onClick={() =>
                                                    handleTransitionModeChange(
                                                        transitionMode === 'shorthand' ? 'detailed' : 'shorthand',
                                                    )
                                                }
                                                aria-label={
                                                    transitionMode === 'shorthand'
                                                        ? 'Split transition'
                                                        : 'Merge transition'
                                                }
                                                title={
                                                    transitionMode === 'shorthand'
                                                        ? 'Split transition'
                                                        : 'Merge transition'
                                                }
                                                type="button"
                                            >
                                                <BoundingBox
                                                    size={14}
                                                    weight={transitionMode === 'detailed' ? 'fill' : 'regular'}
                                                />
                                            </button>
                                            {transitionMode === 'shorthand' ? (
                                                <CompactInputRow
                                                    label="Transition"
                                                    prop="transition"
                                                    value={state.draft.transition ?? state.initial.transition ?? ''}
                                                    onChange={value => setValue('transition', value, true)}
                                                    tokens={tokens}
                                                    mode="text"
                                                />
                                            ) : (
                                                <>
                                                    <CompactInputRow
                                                        label="transition-property"
                                                        prop="transition-property"
                                                        value={
                                                            state.draft['transition-property'] ??
                                                            state.initial['transition-property'] ??
                                                            ''
                                                        }
                                                        onChange={value => setValue('transition-property', value, true)}
                                                        tokens={tokens}
                                                        mode="text"
                                                    />
                                                    <CompactInputRow
                                                        label="transition-duration"
                                                        prop="transition-duration"
                                                        value={
                                                            state.draft['transition-duration'] ??
                                                            state.initial['transition-duration'] ??
                                                            ''
                                                        }
                                                        onChange={value => setValue('transition-duration', value, true)}
                                                        tokens={tokens}
                                                        defaultUnit="ms"
                                                        min={0}
                                                        unitOptions={['ms', 's']}
                                                    />
                                                    <CompactInputRow
                                                        label="transition-timing-function"
                                                        prop="transition-timing-function"
                                                        value={
                                                            state.draft['transition-timing-function'] ??
                                                            state.initial['transition-timing-function'] ??
                                                            ''
                                                        }
                                                        onChange={value =>
                                                            setValue('transition-timing-function', value, true)
                                                        }
                                                        tokens={tokens}
                                                        mode="text"
                                                        renderAfter={renderBezierButton('transition')}
                                                    />
                                                    <CompactInputRow
                                                        label="transition-delay"
                                                        prop="transition-delay"
                                                        value={
                                                            state.draft['transition-delay'] ??
                                                            state.initial['transition-delay'] ??
                                                            ''
                                                        }
                                                        onChange={value => setValue('transition-delay', value, true)}
                                                        tokens={tokens}
                                                        defaultUnit="ms"
                                                        min={0}
                                                        unitOptions={['ms', 's']}
                                                    />
                                                </>
                                            )}
                                        </div>
                                    </SectionSpan>
                                </Section>
                            </SectionStack>
                        ) : null}
                        {group === 'animation' ? (
                            <SectionStack>
                                <Section title="Animation" description="Keyframes and timing">
                                    <SectionSpan>
                                        <div
                                            className={cx(
                                                'display:flex align-items:center gap:8px flex-wrap:wrap',
                                                animationMode === 'detailed' && 'width:100% flex:0_0_100%',
                                            )}
                                        >
                                            <button
                                                className="height:32px width:30px border-radius:10px border:1px_solid_rgba(88,102,128,0.4) background-color:rgba(12,16,22,0.9) color:#b7c2d4 display:flex align-items:center justify-content:center cursor:pointer transition:background-color_120ms_ease,color_120ms_ease,border-color_120ms_ease"
                                                onClick={() =>
                                                    handleAnimationModeChange(
                                                        animationMode === 'shorthand' ? 'detailed' : 'shorthand',
                                                    )
                                                }
                                                aria-label={
                                                    animationMode === 'shorthand'
                                                        ? 'Split animation'
                                                        : 'Merge animation'
                                                }
                                                title={
                                                    animationMode === 'shorthand'
                                                        ? 'Split animation'
                                                        : 'Merge animation'
                                                }
                                                type="button"
                                            >
                                                <BoundingBox
                                                    size={14}
                                                    weight={animationMode === 'detailed' ? 'fill' : 'regular'}
                                                />
                                            </button>
                                            {animationMode === 'shorthand' ? (
                                                <CompactInputRow
                                                    label="Animation"
                                                    prop="animation"
                                                    value={state.draft.animation ?? state.initial.animation ?? ''}
                                                    onChange={value => setValue('animation', value, true)}
                                                    tokens={tokens}
                                                    mode="text"
                                                />
                                            ) : (
                                                <>
                                                    <CompactInputRow
                                                        label="animation-name"
                                                        prop="animation-name"
                                                        value={
                                                            state.draft['animation-name'] ??
                                                            state.initial['animation-name'] ??
                                                            ''
                                                        }
                                                        onChange={value => setValue('animation-name', value, true)}
                                                        tokens={tokens}
                                                        mode="text"
                                                    />
                                                    <CompactInputRow
                                                        label="animation-duration"
                                                        prop="animation-duration"
                                                        value={
                                                            state.draft['animation-duration'] ??
                                                            state.initial['animation-duration'] ??
                                                            ''
                                                        }
                                                        onChange={value => setValue('animation-duration', value, true)}
                                                        tokens={tokens}
                                                        defaultUnit="ms"
                                                        min={0}
                                                        unitOptions={['ms', 's']}
                                                    />
                                                    <CompactInputRow
                                                        label="animation-timing-function"
                                                        prop="animation-timing-function"
                                                        value={
                                                            state.draft['animation-timing-function'] ??
                                                            state.initial['animation-timing-function'] ??
                                                            ''
                                                        }
                                                        onChange={value =>
                                                            setValue('animation-timing-function', value, true)
                                                        }
                                                        tokens={tokens}
                                                        mode="text"
                                                        renderAfter={renderBezierButton('animation')}
                                                    />
                                                    <CompactInputRow
                                                        label="animation-delay"
                                                        prop="animation-delay"
                                                        value={
                                                            state.draft['animation-delay'] ??
                                                            state.initial['animation-delay'] ??
                                                            ''
                                                        }
                                                        onChange={value => setValue('animation-delay', value, true)}
                                                        tokens={tokens}
                                                        defaultUnit="ms"
                                                        min={0}
                                                        unitOptions={['ms', 's']}
                                                    />
                                                    <CompactInputRow
                                                        label="animation-iteration-count"
                                                        prop="animation-iteration-count"
                                                        value={
                                                            state.draft['animation-iteration-count'] ??
                                                            state.initial['animation-iteration-count'] ??
                                                            ''
                                                        }
                                                        onChange={value =>
                                                            setValue('animation-iteration-count', value, true)
                                                        }
                                                        tokens={tokens}
                                                        unitlessOverride
                                                    />
                                                    <CompactInputRow
                                                        label="animation-direction"
                                                        prop="animation-direction"
                                                        value={
                                                            state.draft['animation-direction'] ??
                                                            state.initial['animation-direction'] ??
                                                            ''
                                                        }
                                                        onChange={value => setValue('animation-direction', value, true)}
                                                        tokens={tokens}
                                                        mode="text"
                                                    />
                                                    <CompactInputRow
                                                        label="animation-fill-mode"
                                                        prop="animation-fill-mode"
                                                        value={
                                                            state.draft['animation-fill-mode'] ??
                                                            state.initial['animation-fill-mode'] ??
                                                            ''
                                                        }
                                                        onChange={value => setValue('animation-fill-mode', value, true)}
                                                        tokens={tokens}
                                                        mode="text"
                                                    />
                                                    <CompactInputRow
                                                        label="animation-play-state"
                                                        prop="animation-play-state"
                                                        value={
                                                            state.draft['animation-play-state'] ??
                                                            state.initial['animation-play-state'] ??
                                                            ''
                                                        }
                                                        onChange={value => setValue('animation-play-state', value, true)}
                                                        tokens={tokens}
                                                        mode="text"
                                                    />
                                                </>
                                            )}
                                        </div>
                                    </SectionSpan>
                                </Section>
                            </SectionStack>
                        ) : null}
                        {group === 'interaction' ? (
                            <SectionStack>
                                <Section
                                    title="Interaction"
                                    description="Pointer, cursor, and scroll behavior"
                                    layout="grid"
                                >
                                    <CompactDropdown
                                        label="Cursor"
                                        value={state.draft.cursor ?? state.initial.cursor ?? ''}
                                        options={cursorOptions}
                                        onChange={value => setValue('cursor', value, true)}
                                    />
                                    <CompactDropdown
                                        label="Pointer Events"
                                        value={state.draft['pointer-events'] ?? state.initial['pointer-events'] ?? ''}
                                        options={pointerEventsOptions}
                                        onChange={value => setValue('pointer-events', value, true)}
                                    />
                                    <CompactDropdown
                                        label="User Select"
                                        value={state.draft['user-select'] ?? state.initial['user-select'] ?? ''}
                                        options={userSelectOptions}
                                        onChange={value => setValue('user-select', value, true)}
                                    />
                                    <CompactDropdown
                                        label="Touch Action"
                                        value={state.draft['touch-action'] ?? state.initial['touch-action'] ?? ''}
                                        options={touchActionOptions}
                                        onChange={value => setValue('touch-action', value, true)}
                                    />
                                    <CompactDropdown
                                        label="Scroll Behavior"
                                        value={state.draft['scroll-behavior'] ?? state.initial['scroll-behavior'] ?? ''}
                                        options={scrollBehaviorOptions}
                                        onChange={value => setValue('scroll-behavior', value, true)}
                                    />
                                    <CompactDropdown
                                        label="Overscroll"
                                        value={
                                            state.draft['overscroll-behavior'] ??
                                            state.initial['overscroll-behavior'] ??
                                            ''
                                        }
                                        options={overscrollBehaviorOptions}
                                        onChange={value => setValue('overscroll-behavior', value, true)}
                                    />
                                    <SectionSpan>
                                        <ColorRow
                                            label="Caret Color"
                                            prop="caret-color"
                                            value={state.draft['caret-color'] ?? state.initial['caret-color'] ?? ''}
                                            onChange={value => setValue('caret-color', value, true)}
                                            tokens={tokens}
                                        />
                                    </SectionSpan>
                                </Section>
                            </SectionStack>
                        ) : null}
                        {group === 'svg' ? (
                            <SectionStack>
                                <Section title="SVG" description="Vector styling and strokes" layout="grid">
                                    <SectionSpan>
                                        <ColorRow
                                            label="Fill"
                                            prop="fill"
                                            value={state.draft.fill ?? state.initial.fill ?? ''}
                                            onChange={value => setValue('fill', value, true)}
                                            tokens={tokens}
                                        />
                                    </SectionSpan>
                                    <CompactInputRow
                                        label="Fill Opacity"
                                        prop="fill-opacity"
                                        value={state.draft['fill-opacity'] ?? state.initial['fill-opacity'] ?? ''}
                                        onChange={value => setValue('fill-opacity', value, true)}
                                        tokens={tokens}
                                    />
                                    <CompactDropdown
                                        label="Fill Rule"
                                        value={state.draft['fill-rule'] ?? state.initial['fill-rule'] ?? ''}
                                        options={fillRuleOptions}
                                        onChange={value => setValue('fill-rule', value, true)}
                                    />
                                    <SectionSpan>
                                        <ColorRow
                                            label="Stroke"
                                            prop="stroke"
                                            value={state.draft.stroke ?? state.initial.stroke ?? ''}
                                            onChange={value => setValue('stroke', value, true)}
                                            tokens={tokens}
                                        />
                                    </SectionSpan>
                                    <CompactInputRow
                                        label="Stroke Width"
                                        prop="stroke-width"
                                        value={state.draft['stroke-width'] ?? state.initial['stroke-width'] ?? ''}
                                        onChange={value => setValue('stroke-width', value, true)}
                                        tokens={tokens}
                                    />
                                    <CompactInputRow
                                        label="Stroke Opacity"
                                        prop="stroke-opacity"
                                        value={state.draft['stroke-opacity'] ?? state.initial['stroke-opacity'] ?? ''}
                                        onChange={value => setValue('stroke-opacity', value, true)}
                                        tokens={tokens}
                                    />
                                    <CompactDropdown
                                        label="Line Cap"
                                        value={state.draft['stroke-linecap'] ?? state.initial['stroke-linecap'] ?? ''}
                                        options={strokeLinecapOptions}
                                        onChange={value => setValue('stroke-linecap', value, true)}
                                    />
                                    <CompactDropdown
                                        label="Line Join"
                                        value={state.draft['stroke-linejoin'] ?? state.initial['stroke-linejoin'] ?? ''}
                                        options={strokeLinejoinOptions}
                                        onChange={value => setValue('stroke-linejoin', value, true)}
                                    />
                                    <CompactInputRow
                                        label="Dash Array"
                                        prop="stroke-dasharray"
                                        value={
                                            state.draft['stroke-dasharray'] ?? state.initial['stroke-dasharray'] ?? ''
                                        }
                                        onChange={value => setValue('stroke-dasharray', value, true)}
                                        tokens={tokens}
                                        mode="text"
                                    />
                                    <CompactInputRow
                                        label="Dash Offset"
                                        prop="stroke-dashoffset"
                                        value={
                                            state.draft['stroke-dashoffset'] ?? state.initial['stroke-dashoffset'] ?? ''
                                        }
                                        onChange={value => setValue('stroke-dashoffset', value, true)}
                                        tokens={tokens}
                                    />
                                    <CompactInputRow
                                        label="Miter Limit"
                                        prop="stroke-miterlimit"
                                        value={
                                            state.draft['stroke-miterlimit'] ?? state.initial['stroke-miterlimit'] ?? ''
                                        }
                                        onChange={value => setValue('stroke-miterlimit', value, true)}
                                        tokens={tokens}
                                    />
                                    <CompactDropdown
                                        label="Vector Effect"
                                        value={state.draft['vector-effect'] ?? state.initial['vector-effect'] ?? ''}
                                        options={vectorEffectOptions}
                                        onChange={value => setValue('vector-effect', value, true)}
                                    />
                                    {svgExtraRows.map(row => {
                                        const content =
                                            row.type === 'color' ? (
                                                <ColorRow
                                                    label={row.label}
                                                    prop={row.prop}
                                                    value={state.draft[row.prop] ?? state.initial[row.prop] ?? ''}
                                                    onChange={value => setValue(row.prop, value, true)}
                                                    tokens={tokens}
                                                />
                                            ) : row.type === 'number' ? (
                                                <CompactInputRow
                                                    label={row.label}
                                                    prop={row.prop}
                                                    value={state.draft[row.prop] ?? state.initial[row.prop] ?? ''}
                                                    onChange={value => setValue(row.prop, value, true)}
                                                    tokens={tokens}
                                                />
                                    ) : row.type === 'options' ? (
                                        <CompactDropdown
                                            label={row.label}
                                            value={state.draft[row.prop] ?? state.initial[row.prop] ?? ''}
                                            options={row.options ?? []}
                                            onChange={value => setValue(row.prop, value, true)}
                                        />
                                    ) : row.type === 'text' ? (
                                        <CompactInputRow
                                            label={row.label}
                                            prop={row.prop}
                                            value={state.draft[row.prop] ?? state.initial[row.prop] ?? ''}
                                            onChange={value => setValue(row.prop, value, true)}
                                            tokens={tokens}
                                            mode="text"
                                        />
                                    ) : (
                                        <PropertyRow
                                            label={row.label}
                                            prop={row.prop}
                                            value={state.draft[row.prop] ?? state.initial[row.prop] ?? ''}
                                                    type={row.type}
                                                    options={row.options}
                                                    onChange={value => setValue(row.prop, value, true)}
                                                    tokens={tokens}
                                                />
                                            )

                                        return row.full && row.type !== 'options' ? (
                                            <SectionSpan key={row.prop}>{content}</SectionSpan>
                                        ) : (
                                            <React.Fragment key={row.prop}>{content}</React.Fragment>
                                        )
                                    })}
                                </Section>
                            </SectionStack>
                        ) : null}
                        {group === 'misc' ? (
                            <SectionStack>
                            <Section title="Misc" description="Every CSS property on tap" layout="grid">
                                {miscProps.map(prop =>
                                    isColorProp(prop) ? (
                                        <ColorRow
                                            key={prop}
                                            label={prop}
                                            prop={prop}
                                            value={state.draft[prop] ?? state.initial[prop] ?? ''}
                                            onChange={value => setValue(prop, value, true)}
                                            tokens={tokens}
                                        />
                                    ) : (
                                        <CompactInputRow
                                            key={prop}
                                            label={prop}
                                            prop={prop}
                                            value={state.draft[prop] ?? state.initial[prop] ?? ''}
                                            onChange={value => setValue(prop, value, true)}
                                            tokens={tokens}
                                            mode="text"
                                        />
                                    ),
                                )}
                            </Section>
                            </SectionStack>
                        ) : null}
                        {bezierTarget ? (
                            <div className="position:sticky bottom:0 z-index:2">
                                <div className="margin-top:12px padding:12px border-radius:12px border:1px_solid_rgba(86,98,120,0.4) background-color:rgba(9,12,18,0.92) box-shadow:0_18px_28px_rgba(0,0,0,0.45)">
                                    <div className="display:flex align-items:center justify-content:space-between gap:8px">
                                        <div className="font-size:12px color:#c3cddd font-weight:600">
                                            {bezierTarget === 'transition'
                                                ? 'Transition timing curve'
                                                : 'Animation timing curve'}
                                        </div>
                                        <button
                                            className="height:28px width:28px border-radius:8px border:1px_solid_rgba(88,102,128,0.4) background-color:rgba(12,16,22,0.9) color:#b7c2d4 display:flex align-items:center justify-content:center cursor:pointer transition:background-color_120ms_ease,color_120ms_ease,border-color_120ms_ease"
                                            onClick={() => setBezierTarget(null)}
                                            aria-label="Close timing editor"
                                            title="Close timing editor"
                                            type="button"
                                        >
                                            <X size={12} />
                                        </button>
                                    </div>
                                    <div className="margin-top:10px">
                                        <div className="padding:10px border-radius:12px border:1px_solid_rgba(86,98,120,0.4) background-color:rgba(12,16,22,0.9)">
                                            <div ref={bezierWrapRef} className="width:100% display:flex justify-content:center">
                                                <div
                                                    className="position:relative"
                                                    style={{
                                                        width: bezierSize.width,
                                                        height: bezierSize.height,
                                                    }}
                                                >
                                                    <div
                                                        className="position:absolute left:0 right:0 height:1px background-color:rgba(88,102,128,0.35) pointer-events:none"
                                                        style={{
                                                            top:
                                                                (1 - mapYToEditor(1)) * bezierSize.height,
                                                        }}
                                                    />
                                                    <div
                                                        className="position:absolute left:0 right:0 height:1px background-color:rgba(88,102,128,0.35) pointer-events:none"
                                                        style={{
                                                            top:
                                                                (1 - mapYToEditor(0)) * bezierSize.height,
                                                        }}
                                                    />
                                                    <BezierSplineEditor
                                                        width={bezierSize.width}
                                                        height={bezierSize.height}
                                                        points={bezierPoints}
                                                        onPointsChange={handleBezierPointsChange}
                                                        showPoints={false}
                                                        backgroundLineProps={{
                                                            stroke: 'transparent',
                                                        }}
                                                        indicatorProps={{
                                                            fill: 'var(--color-primary-60, rgba(237,75,155,0.6))',
                                                        }}
                                                        curveProps={{
                                                            stroke: 'var(--color-primary-60, rgba(237,75,155,0.6))',
                                                            strokeWidth: 2,
                                                            fill: 'none',
                                                        }}
                                                        controlPointLineProps={{
                                                            stroke: 'rgba(120,134,160,0.7)',
                                                            strokeDasharray: '5 5',
                                                        }}
                                                        containerProps={{
                                                            className: 'display:block width:100% height:100%',
                                                        }}
                                                        anchorPointProps={{
                                                            r: 6,
                                                            fill: 'transparent',
                                                            stroke: 'rgba(152,164,186,0.7)',
                                                            strokeWidth: 2,
                                                        }}
                                                        controlPointProps={{
                                                            r: 7,
                                                            fill: 'var(--color-primary, #ed4b9b)',
                                                            stroke: 'var(--color-primary-60, rgba(237,75,155,0.6))',
                                                            strokeWidth: 2,
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : null}
                    </div>
                </div>
            </div>
        </DefaultUnitContext.Provider>
    )
})

const updateTransform = (
    current: TransformState,
    partial: Partial<TransformState>,
    setValue: (prop: string, value: string, commit?: boolean) => void,
    commit = false,
) => {
    const next = { ...current, ...partial }
    if (!Object.prototype.hasOwnProperty.call(partial, 'matrix')) {
        next.matrix = ''
    }
    const value = buildTransform(next)
    setValue('transform', value, commit)
}
