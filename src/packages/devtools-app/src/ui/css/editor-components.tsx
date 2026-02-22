import * as React from 'react'
import { Input } from '@base-ui/react/input'
import { Autocomplete } from '@base-ui/react/autocomplete'
import { Popover } from '@base-ui/react/popover'
import { Select } from '@base-ui/react/select'
import { Slider } from '@base-ui/react/slider'
import { mergeProps } from '@base-ui/react/merge-props'
import ColorPicker from 'react-best-gradient-color-picker'
import { cx } from 'boss-css/variants'
import { BoundingBox, CaretDown, Sparkle } from '@phosphor-icons/react'

import type { TokenSnapshot } from '../../types'
import { ButtonGroup, ButtonGroupItem, ButtonGroupSeparator } from '../components/ButtonGroup'
import { Tooltip, TooltipContent, TooltipTrigger } from '../components/Tooltip'
import { splitCssSyntaxKeywords } from './properties'
import {
    asNumber,
    formatNumber,
    getAllTokenOptions,
    getTokenOptionsForProp,
    isTokenValue,
    isUnitlessProp,
    resolveTokenValue,
    toInputValue,
} from './utils'

export type OptionItem = {
    value: string
    label?: string
    icon?: React.ComponentType<{ size?: number; className?: string }>
    tooltip?: string
}

export type StyleState = {
    initial: Record<string, string>
    draft: Record<string, string>
    history: Record<string, string>[]
    historyIndex: number
}

export const DefaultUnitContext = React.createContext('px')

const unitOptions = ['px', '%', 'rem', 'em', 'vw', 'vh']
const parseNumericValue = (value: string, defaultUnit: string) => {
    const trimmed = value.trim()
    if (!trimmed) {
        return { isNumeric: false, number: 0, unit: defaultUnit }
    }
    const match = trimmed.match(/^(-?\d*\.?\d+)([a-z%]*)$/i)
    if (!match) {
        return { isNumeric: false, number: 0, unit: defaultUnit }
    }
    const [, rawNumber, rawUnit] = match
    const parsed = Number(rawNumber)
    if (!Number.isFinite(parsed)) {
        return { isNumeric: false, number: 0, unit: defaultUnit }
    }
    return { isNumeric: true, number: parsed, unit: rawUnit || defaultUnit }
}

const clampNumber = (value: number, min?: number, max?: number) => {
    if (min !== undefined && value < min) return min
    if (max !== undefined && value > max) return max
    return value
}

type ColorPickerConfig = {
    hidePresets?: boolean
    hideAdvancedSliders?: boolean
    hideEyeDrop?: boolean
    hideColorGuide?: boolean
    hideInputType?: boolean
    hideInputs?: boolean
    hideColorTypeBtns?: boolean
    hideGradientControls?: boolean
    hideGradientType?: boolean
    hideGradientAngle?: boolean
    hideGradientStop?: boolean
}

const defaultGradientPreview = 'linear-gradient(135deg, #1f68ff 0%, #12d4ff 100%)'
const defaultSolidPreview = 'rgba(255,255,255,1)'
const gradientPickerProps: ColorPickerConfig = {
    hidePresets: true,
    hideAdvancedSliders: true,
    hideEyeDrop: true,
    hideColorGuide: true,
    hideInputType: true,
    hideInputs: true,
}
const solidPickerProps: ColorPickerConfig = {
    hideColorTypeBtns: true,
    hideGradientControls: true,
    hideGradientType: true,
    hideGradientAngle: true,
    hideGradientStop: true,
}

const isGradientValue = (value: string) => /gradient\(/i.test(value)
const isSupportedGradientName = (value: string) =>
    /^(repeating-)?(linear|radial)-gradient$/i.test(value.trim())
const hasStopPosition = (value: string) => /-?\d*\.?\d+(%|px|em)\b/i.test(value)
const hasUnsafeGradientToken = (value: string) => /\bvar\(|\$\$\.token\./i.test(value)
const isSafeGradientColor = (value: string) => {
    const trimmed = value.trim()
    if (!trimmed) return false
    if (/nan\b/i.test(trimmed)) return false
    if (/#([0-9a-f]{3,8})/i.test(trimmed)) return true
    if (/(rgba?|hsla?|hsva?|hsv|hsl)\(/i.test(trimmed)) return true
    if (/\btransparent\b/i.test(trimmed)) return true
    if (/\bcurrentcolor\b/i.test(trimmed)) return true
    if (/^[a-zA-Z]+$/.test(trimmed)) return true
    return false
}
const isGradientOrientation = (value: string) =>
    /\bto\s|\bdeg\b|\brad\b|\bturn\b|\bgrad\b|circle\b|ellipse\b|closest-|farthest-|\bat\b/i.test(value)
const splitGradientArgs = (value: string) => {
    const result: string[] = []
    let current = ''
    let depth = 0
    for (let index = 0; index < value.length; index += 1) {
        const char = value[index]
        if (char === '(') depth += 1
        if (char === ')') depth = Math.max(0, depth - 1)
        if (char === ',' && depth === 0) {
            result.push(current.trim())
            current = ''
            continue
        }
        current += char
    }
    if (current.trim()) {
        result.push(current.trim())
    }
    return result
}

const normalizeGradientStops = (value: string) => {
    if (!isGradientValue(value)) return null
    if (hasUnsafeGradientToken(value)) return null
    if (/\bnan\b/i.test(value)) return null
    const openIndex = value.indexOf('(')
    const closeIndex = value.lastIndexOf(')')
    if (openIndex === -1 || closeIndex === -1 || closeIndex <= openIndex) return null
    const name = value.slice(0, openIndex).trim()
    if (!isSupportedGradientName(name)) return null
    const body = value.slice(openIndex + 1, closeIndex)
    const parts = splitGradientArgs(body)
    if (!name || parts.length < 2) return null
    const [first, ...rest] = parts
    const orientation = isGradientOrientation(first) ? first : null
    const stops = orientation ? rest : parts
    if (stops.length < 2) return null

    const strippedStops = stops.map(stop => stop.replace(/\s+-?\d*\.?\d+(%|px|em)\b\s*$/i, '').trim())
    if (strippedStops.some(stop => !isSafeGradientColor(stop))) return null

    const parsedStops = stops.map(stop => {
        const match = stop.match(/^(.*?)(?:\s+(-?\d*\.?\d+)(%|px|em))?\s*$/i)
        if (!match) return null
        const color = match[1].trim()
        if (!isSafeGradientColor(color)) return null
        const rawNumber = match[2]
        const unit = match[3]
        if (!rawNumber || !unit) {
            return { color, position: null as string | null }
        }
        const number = Number(rawNumber)
        if (!Number.isFinite(number)) {
            return { color, position: null as string | null }
        }
        return { color, position: `${number}${unit}` }
    })

    if (parsedStops.some(stop => !stop)) return null

    const needsPositions = parsedStops.some(stop => !stop?.position)
    const spacedStops = parsedStops.map((stop, index) => {
        const ratio = parsedStops.length > 1 ? index / (parsedStops.length - 1) : 0
        const position = needsPositions ? `${Math.round(ratio * 100)}%` : stop?.position ?? '0%'
        return `${stop?.color} ${position}`
    })

    const nextParts = orientation ? [orientation, ...spacedStops] : spacedStops
    return `${name}(${nextParts.join(', ')})`
}

const startScrub = ({
    event,
    value,
    onChange,
    onCommit,
    step = 1,
    min,
    max,
}: {
    event: React.PointerEvent
    value: number
    onChange: (value: number) => void
    onCommit?: (value: number) => void
    step?: number
    min?: number
    max?: number
}) => {
    if (event.button !== 0) return
    event.preventDefault()
    event.stopPropagation()

    const startX = event.clientX
    const startValue = value
    const speed = event.shiftKey ? 10 : event.altKey ? 0.1 : 1
    let latestValue = value
    const previousCursor = document.body.style.cursor
    const previousSelect = document.body.style.userSelect
    const previousScrubFlag = document.body.dataset.bossDevtoolsScrub
    document.body.style.cursor = 'ew-resize'
    document.body.style.userSelect = 'none'
    document.body.dataset.bossDevtoolsScrub = 'true'

    const handleMove = (moveEvent: PointerEvent) => {
        const delta = moveEvent.clientX - startX
        const next = clampNumber(startValue + delta * step * speed, min, max)
        latestValue = next
        onChange(next)
    }

    const handleUp = () => {
        window.removeEventListener('pointermove', handleMove, true)
        window.removeEventListener('pointerup', handleUp, true)
        document.body.style.cursor = previousCursor
        document.body.style.userSelect = previousSelect
        document.body.dataset.bossDevtoolsOutsidePressUntil = String(Date.now() + 250)
        if (previousScrubFlag === undefined) {
            delete document.body.dataset.bossDevtoolsScrub
        } else {
            document.body.dataset.bossDevtoolsScrub = previousScrubFlag
        }
        onCommit?.(latestValue)
    }

    window.addEventListener('pointermove', handleMove, true)
    window.addEventListener('pointerup', handleUp, true)
}

export function Section({
    title: _title,
    description: _description,
    children,
    dim,
    layout = 'stack',
}: {
    title: string
    description: string
    children: React.ReactNode
    dim?: boolean
    layout?: 'stack' | 'grid'
}) {
    const bodyClass = 'display:flex flex-wrap:wrap gap:10px align-items:flex-start'
    return <div className={cx(bodyClass, dim && 'opacity:0.55')}>{children}</div>
}

export function SectionSpan({ children }: { children: React.ReactNode }) {
    return <div className="width:100% flex:0_0_100%">{children}</div>
}

export function SectionStack({ children }: { children: React.ReactNode }) {
    const items = React.Children.toArray(children).filter(Boolean)
    return (
        <div className="display:flex flex-direction:column gap:14px">
            {items.map((item, index) => (
                <React.Fragment key={index}>
                    {item}
                    {index < items.length - 1 ? (
                        <div className="height:1px background-color:rgba(88,102,128,0.24)" />
                    ) : null}
                </React.Fragment>
            ))}
        </div>
    )
}

export function ControlRow({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="display:flex align-items:flex-start gap:12px flex-wrap:wrap row-gap:6px">
            <div className="font-size:11px color:#b9c4d8 width:110px flex:0_0_110px line-height:1.2 word-break:break-word">
                {label}
            </div>
            <div className="flex:1 min-width:180px display:flex align-items:flex-start flex-wrap:wrap gap:8px row-gap:6px">
                {children}
            </div>
        </div>
    )
}

export function OptionGroup({
    value,
    options,
    onChange,
    disabled,
    kind = 'text',
    size = 'sm',
    wrap,
}: {
    value: string
    options: Array<string | OptionItem>
    onChange: (value: string) => void
    disabled?: boolean
    kind?: 'text' | 'icon'
    size?: 'sm' | 'md' | 'lg'
    wrap?: boolean
}) {
    const normalized = options.map(option => (typeof option === 'string' ? { value: option, label: option } : option))
    const labels = normalized.map(option => option.label ?? option.value)
    const longestLabel = labels.reduce((max, label) => Math.max(max, label.length), 0)
    const iconOnly = kind === 'icon'
    const shouldWrap = wrap ?? (iconOnly ? normalized.length >= 7 : normalized.length >= 6 || longestLabel >= 12)

    return (
        <ButtonGroup size={size} wrap={shouldWrap} className={cx(shouldWrap && 'flex:1 min-width:0')}>
            {normalized.map((option, index) => {
                const Icon = option.icon
                const isActive = option.value === value
                const label = option.label ?? option.value
                const buttonProps = {
                    type: 'button' as const,
                    active: isActive,
                    disabled,
                    onClick: () => {
                        if (disabled) return
                        onChange(option.value)
                    },
                    className: cx(
                        iconOnly ? 'padding:4px width:30px height:26px' : 'padding:4px_10px',
                        disabled && 'opacity:0.75 cursor:default',
                    ),
                }

                const withTooltip = iconOnly ? (
                    <Tooltip>
                        <TooltipTrigger
                            render={triggerProps => (
                                <ButtonGroupItem {...mergeProps(triggerProps, buttonProps)}>
                                    {Icon ? <Icon size={14} className="color:inherit" /> : label}
                                </ButtonGroupItem>
                            )}
                        />
                        <TooltipContent>{option.tooltip ?? label}</TooltipContent>
                    </Tooltip>
                ) : (
                    <ButtonGroupItem {...buttonProps}>
                        {Icon ? <Icon size={14} className="color:inherit" /> : label}
                    </ButtonGroupItem>
                )

                return (
                    <React.Fragment key={option.value}>
                        {withTooltip}
                        {!shouldWrap && index < normalized.length - 1 ? <ButtonGroupSeparator /> : null}
                    </React.Fragment>
                )
            })}
        </ButtonGroup>
    )
}

export function PropertyRow({
    label,
    prop,
    value,
    type,
    options,
    optionKind,
    onChange,
    tokens,
    disabled,
    defaultUnit,
    wrapOptions,
}: {
    label: string
    prop: string
    value: string
    type: 'text' | 'number' | 'select' | 'color' | 'options'
    options?: Array<string | OptionItem>
    optionKind?: 'text' | 'icon'
    onChange: (value: string) => void
    tokens?: TokenSnapshot | null
    disabled?: boolean
    defaultUnit?: string
    wrapOptions?: boolean
}) {
    if (type === 'color') {
        return (
            <CompactInputRow
                label={label}
                prop={prop}
                value={value}
                onChange={onChange}
                tokens={tokens}
                disabled={disabled}
                mode="text"
                renderAfter={<ColorPickerButton prop={prop} value={value} onChange={onChange} tokens={tokens} mode="solid" />}
            />
        )
    }
    const resolvedDefaultUnit = defaultUnit ?? React.useContext(DefaultUnitContext)
    const propTokens = getTokenOptionsForProp(prop, tokens ?? null)
    const tokenOptions = propTokens.length ? propTokens : getAllTokenOptions(tokens ?? null)
    const tokenPrefix = propTokens.length ? '' : '$$.token.'
    const isToken = isTokenValue(prop, value, tokens ?? null)
    const unitless = isUnitlessProp(prop)
    const parsed = type === 'number' ? parseNumericValue(value, resolvedDefaultUnit) : null
    const canScrub = type === 'number' && !disabled && !isToken && parsed?.isNumeric

    const handleScrubStart = (event: React.PointerEvent) => {
        if (!canScrub || !parsed) return
        const step = value.includes('.') ? 0.1 : 1
        startScrub({
            event,
            value: parsed.number,
            step,
            onChange: next => {
                const formatted = formatNumber(next, 2)
                onChange(unitless ? formatted : `${formatted}${parsed.unit}`)
            },
        })
    }

    return (
        <div className="display:flex align-items:flex-start gap:12px flex-wrap:wrap row-gap:6px">
            <div
                className={cx(
                    'font-size:11px color:#b9c4d8 width:110px flex:0_0_110px line-height:1.2 word-break:break-word',
                    canScrub && 'cursor:ew-resize color:#dfe7f4',
                )}
                onPointerDown={handleScrubStart}
            >
                {label}
            </div>
            <div className="flex:1 min-width:180px display:flex align-items:flex-start flex-wrap:wrap gap:8px row-gap:6px">
                {type === 'options' && options ? (
                    <OptionGroup
                        value={value}
                        options={options}
                        onChange={onChange}
                        disabled={disabled}
                        kind={optionKind}
                        wrap={wrapOptions}
                    />
                ) : type === 'select' && options ? (
                    <Select.Root
                        value={value}
                        onValueChange={nextValue => {
                            if (nextValue != null) onChange(nextValue)
                        }}
                        disabled={disabled}
                    >
                        <Select.Trigger className="width:100% background-color:rgba(10,14,20,0.86) border:1px_solid_rgba(86,98,120,0.4) border-radius:10px padding:6px_10px font-size:11px color:#e8eef8">
                            <Select.Value {...({ placeholder: 'Select' } as any)} />
                        </Select.Trigger>
                        <Select.Portal>
                            <Select.Positioner sideOffset={6}>
                                <Select.Popup className="background-color:#0e121a border:1px_solid_rgba(86,98,120,0.45) border-radius:12px padding:8px box-shadow:0_16px_30px_rgba(0,0,0,0.45)">
                                    {(options ?? [])
                                        .map(option => (typeof option === 'string' ? { value: option, label: option } : option))
                                        .map(option => (
                                        <Select.Item
                                            key={option.value}
                                            value={option.value}
                                            className="padding:6px_8px border-radius:8px cursor:pointer color:#d8e2f1 font-size:11px"
                                        >
                                            <Select.ItemText>{option.label ?? option.value}</Select.ItemText>
                                        </Select.Item>
                                    ))}
                                </Select.Popup>
                            </Select.Positioner>
                        </Select.Portal>
                    </Select.Root>
                ) : type === 'number' ? (
                    <NumberField
                        value={value}
                        onChange={onChange}
                        prop={prop}
                        tokens={tokens}
                        disabled={disabled}
                        defaultUnit={resolvedDefaultUnit}
                    />
                ) : (
                    <Input
                        className="flex:1 background-color:rgba(10,14,20,0.86) border:1px_solid_rgba(86,98,120,0.4) border-radius:10px color:#eef2f7 padding:6px_8px font-size:11px"
                        value={toInputValue(value)}
                        onChange={event => onChange(event.target.value)}
                        disabled={disabled}
                    />
                )}
                {tokenOptions.length > 0 ? (
                    <TokenPopover
                        label="Tokens"
                        tokens={tokenOptions}
                        onSelect={value => onChange(tokenPrefix ? `${tokenPrefix}${value}` : value)}
                    />
                ) : null}
            </div>
        </div>
    )
}

export function CompactInputRow({
    label,
    prop,
    value,
    onChange,
    tokens,
    disabled,
    defaultUnit,
    mode = 'number',
    unitlessOverride,
    min,
    max,
    step: scrubStep,
    unitOptions: unitOptionsOverride,
    renderBefore,
    renderAfter,
}: {
    label: string
    prop: string
    value: string
    onChange: (value: string) => void
    tokens?: TokenSnapshot | null
    disabled?: boolean
    defaultUnit?: string
    mode?: 'number' | 'text'
    unitlessOverride?: boolean
    min?: number
    max?: number
    step?: number
    unitOptions?: string[]
    renderBefore?: React.ReactNode
    renderAfter?: React.ReactNode
}) {
    const resolvedDefaultUnit = defaultUnit ?? React.useContext(DefaultUnitContext)
    const supportsNumeric = mode === 'number'
    const propTokens = getTokenOptionsForProp(prop, tokens ?? null)
    const tokenOptions = propTokens.length ? propTokens : getAllTokenOptions(tokens ?? null)
    const tokenPrefix = propTokens.length ? '' : '$$.token.'
    const isToken = isTokenValue(prop, value, tokens ?? null)
    const unitless = unitlessOverride ?? isUnitlessProp(prop)
    const parsed = supportsNumeric ? parseNumericValue(value, resolvedDefaultUnit) : null
    const inputValue = supportsNumeric && parsed?.isNumeric ? formatNumber(parsed.number, 2) : value
    const displayValue = toInputValue(inputValue)
    const valueSize = Math.max(1, Math.min(4, displayValue.length))
    const showUnits = supportsNumeric && !unitless && !isToken
    const unitValue = parsed?.isNumeric ? parsed.unit : displayValue ? 'arb' : resolvedDefaultUnit
    const unitsDisabled = disabled || !showUnits
    const canScrub = supportsNumeric && !disabled && !isToken
    const compactUnitOptions = [...(unitOptionsOverride ?? unitOptions), 'arb']
    const comboboxFilter = Autocomplete.useFilter()
    const [comboOpen, setComboOpen] = React.useState(false)
    const [forceOpen, setForceOpen] = React.useState(false)
    const [focused, setFocused] = React.useState(false)

    type ComboItem = {
        value: string
        label: string
        kind: 'token' | 'native' | 'common'
        detail?: string
    }

    const { native: nativeValueOptions, common: commonValueOptions } = React.useMemo(
        () => splitCssSyntaxKeywords(prop),
        [prop],
    )

    const comboItems = React.useMemo(() => {
        const items: ComboItem[] = []
        const seen = new Set<string>()
        const pushItem = (item: ComboItem) => {
            if (!item.value || seen.has(item.value)) return
            seen.add(item.value)
            items.push(item)
        }

        for (const token of tokenOptions) {
            const tokenValue = tokenPrefix ? `${tokenPrefix}${token.key}` : token.key
            pushItem({ value: tokenValue, label: token.key, kind: 'token', detail: token.value })
        }

        for (const valueOption of nativeValueOptions) {
            pushItem({ value: valueOption, label: valueOption, kind: 'native' })
        }

        for (const valueOption of commonValueOptions) {
            pushItem({ value: valueOption, label: valueOption, kind: 'common' })
        }

        return items
    }, [tokenOptions, tokenPrefix, nativeValueOptions])

    const itemToStringLabel = React.useCallback(
        (item: ComboItem | string) => (typeof item === 'string' ? item : item.label),
        [],
    )
    const itemToStringValue = React.useCallback(
        (item: ComboItem | string) => (typeof item === 'string' ? item : item.value),
        [],
    )
    const hasMatch = React.useMemo(() => {
        const query = displayValue.trim()
        if (!query) return false
        return comboItems.some(item => comboboxFilter.contains(item, query, itemToStringLabel))
    }, [comboItems, comboboxFilter, displayValue, itemToStringLabel])

    const shouldOpen = comboOpen && (forceOpen || hasMatch)

    const handleScrubStart = (event: React.PointerEvent) => {
        setFocused(true)
        if (!canScrub || !parsed) return
        const startValue = parsed.number
        const startUnit = parsed.unit
        const step = scrubStep ?? 1
        startScrub({
            event,
            value: startValue,
            step,
            min,
            max,
            onChange: next => {
                const formatted = formatNumber(next, 0)
                onChange(unitless ? formatted : `${formatted}${startUnit}`)
            },
        })
    }

    const handleInputChange = (next: string) => {
        if (disabled) return
        if (!supportsNumeric) {
            onChange(next)
            return
        }
        if (isToken) {
            onChange(next)
            return
        }
        if (!next.trim()) {
            onChange('')
            return
        }
        if (!/^-?\d*\.?\d*$/.test(next)) {
            onChange(next)
            return
        }
        const nextParsed = parseNumericValue(next, resolvedDefaultUnit)
        if (!nextParsed.isNumeric) {
            onChange(next)
            return
        }
        const clampedValue = clampNumber(nextParsed.number, min, max)
        if (unitless) {
            onChange(clampedValue === nextParsed.number ? next : String(clampedValue))
            return
        }
        onChange(`${clampedValue === nextParsed.number ? next : clampedValue}${nextParsed.unit}`)
    }

    const handleUnitChange = (unit: string) => {
        if (!supportsNumeric || unitsDisabled) return
        if (unit === 'arb') {
            onChange(displayValue)
            return
        }
        const formatted = formatNumber(parsed?.isNumeric ? parsed.number : 0, 2)
        onChange(`${formatted}${unit}`)
    }

    const handleComboInputValueChange = (next: string, eventDetails: { reason: string }) => {
        handleInputChange(next)
        const shouldOpenOnInput =
            eventDetails.reason === 'input-change' ||
            eventDetails.reason === 'input-paste' ||
            eventDetails.reason === 'input-clear'
        if (!shouldOpenOnInput) return

        if (!next.trim()) {
            setComboOpen(false)
            setForceOpen(false)
            return
        }

        const hasMatch = comboItems.some(item => comboboxFilter.contains(item, next.trim(), itemToStringLabel))
        setForceOpen(false)
        setComboOpen(hasMatch)
    }

    const handleComboOpenChange = (nextOpen: boolean) => {
        if (nextOpen) return
        setComboOpen(false)
        setForceOpen(false)
    }

    const handleTokenTrigger = () => {
        if (!comboItems.length) return
        setForceOpen(true)
        setComboOpen(true)
    }

    const showInput = focused || displayValue

    return (
        <div className="display:flex align-items:center gap:8px flex-wrap:wrap">
            <Autocomplete.Root
                value={displayValue}
                onValueChange={handleComboInputValueChange}
                open={shouldOpen}
                onOpenChange={handleComboOpenChange}
                openOnInputClick={false}
                mode="list"
                items={comboItems}
                itemToStringValue={itemToStringValue}
            >
                <label
                    onFocus={() => setFocused(true)}
                    onPointerDown={() => setFocused(true)}
                    data-compact-input
                    className="height:32px display:flex align-items:center padding:0_8 background-color:rgba(12,16,22,0.9) border:1px_solid_rgba(88,102,128,0.4) border-radius:10px"
                >
                    <div className="display:flex gap:8 align-items:center height:100%">
                        {renderBefore}
                        <div
                            className={cx(
                                'display:flex align-items:center font-size:12px color:#c3cddd font-weight:600 white-space:nowrap',
                                canScrub ? 'cursor:ew-resize' : 'cursor:default',
                            )}
                            onPointerDown={handleScrubStart}
                        >
                            {label}
                        </div>
                        {showInput && (
                            <Autocomplete.Input
                                className="font-family:monospace flex:0_0_auto margin-right:2 min-width:1ch background:transparent border:none outline:none appearance:none color:#eef2f7 padding:0 font-size:12px font-weight:600 height:100% line-height:1 text-align:left font-variant-numeric:tabular-nums"
                                disabled={disabled}
                                size={valueSize}
                                style={{
                                    width: `${displayValue.length}ch`,
                                }}
                                autoComplete="off"
                            />
                        )}
                        {showUnits && showInput ? (
                            <Select.Root
                                value={unitValue}
                                onValueChange={nextValue => {
                                    if (nextValue != null) handleUnitChange(nextValue)
                                }}
                                disabled={unitsDisabled}
                            >
                                <Select.Trigger
                                    className={cx(
                                        'margin-left:-8 font-family:inherit height:100% display:flex align-items:center justify-content:center background:rgba(12,16,22,0.7) border:none padding:0 font-size:12px color:#b7c2d4 border-radius:0 line-height:1 appearance:none outline:none box-shadow:none',
                                        unitsDisabled &&
                                            'color:rgba(217,226,241,0.45) background:rgba(12,16,22,0.4) cursor:default',
                                    )}
                                >
                                    <Select.Value />
                                </Select.Trigger>
                                <Select.Portal>
                                    <Select.Positioner side="bottom" align="end" sideOffset={6}>
                                        <Select.Popup className="background-color:#0e121a border:1px_solid_rgba(86,98,120,0.45) border-radius:12px padding:8px box-shadow:0_16px_30px_rgba(0,0,0,0.45)">
                                            {compactUnitOptions.map(unit => (
                                                <Select.Item
                                                    key={unit}
                                                    value={unit}
                                                    className="padding:6px_8px border-radius:8px cursor:pointer color:#d8e2f1 font-size:11px"
                                                >
                                                    <Select.ItemText>{unit}</Select.ItemText>
                                                </Select.Item>
                                            ))}
                                        </Select.Popup>
                                    </Select.Positioner>
                                </Select.Portal>
                            </Select.Root>
                        ) : null}
                        {tokenOptions.length > 0 ? (
                            <Autocomplete.Trigger
                                className="height:100% display:flex align-items:center justify-content:center padding:0_6px border:none background:transparent color:#b7c2d4 cursor:pointer"
                                aria-label="Tokens"
                                onClick={handleTokenTrigger}
                            >
                                <Sparkle size={12} />
                            </Autocomplete.Trigger>
                        ) : null}
                        {renderAfter}
                    </div>
                </label>
                {shouldOpen ? (
                    <Autocomplete.Portal>
                        <Autocomplete.Positioner side="bottom" align="start" sideOffset={6}>
                            <Autocomplete.Popup className="background-color:#0e121a border:1px_solid_rgba(86,98,120,0.45) border-radius:12px padding:6px box-shadow:0_16px_30px_rgba(0,0,0,0.45) min-width:220px max-height:240px overflow:auto">
                                <Autocomplete.List className="display:flex flex-direction:column gap:4px">
                                    {(item: ComboItem) => (
                                        <Autocomplete.Item
                                            key={item.value}
                                            value={item}
                                            className="display:flex align-items:center justify-content:flex-start text-align:left gap:10px padding:6px_8px border-radius:8px cursor:pointer color:#d8e2f1 font-size:11px hover:background-color:rgba(20,24,32,0.9)"
                                        >
                                            <span className="color:#d8e2f1 font-size:11px">{item.label}</span>
                                            {item.kind === 'token' && item.detail ? (
                                                <span className="margin-left:auto color:#7d889d font-size:10px">
                                                    {item.detail}
                                                </span>
                                            ) : null}
                                        </Autocomplete.Item>
                                    )}
                                </Autocomplete.List>
                            </Autocomplete.Popup>
                        </Autocomplete.Positioner>
                    </Autocomplete.Portal>
                ) : null}
            </Autocomplete.Root>
        </div>
    )
}

export function CompactDropdown({
    label,
    value,
    options,
    onChange,
    disabled,
}: {
    label: string
    value: string
    options: Array<string | OptionItem>
    onChange: (value: string) => void
    disabled?: boolean
}) {
    const normalized = React.useMemo(
        () => options.map(option => (typeof option === 'string' ? { value: option, label: option } : option)),
        [options],
    )
    const showValue = Boolean(value)

    return (
        <div className="display:flex align-items:center gap:8px flex-wrap:wrap">
            <Select.Root
                value={value}
                onValueChange={nextValue => {
                    if (nextValue != null) onChange(nextValue)
                }}
                disabled={disabled}
            >
                <Select.Trigger
                    className={cx(
                        'display:flex align-items:center justify-content:flex-start text-align:left gap:8px padding:0_8 height:32px background-color:rgba(12,16,22,0.9) border:1px_solid_rgba(88,102,128,0.4) border-radius:10px overflow:hidden color:#eef2f7 font-size:12px font-weight:600 cursor:pointer',
                        disabled && 'opacity:0.75 cursor:default',
                    )}
                >
                    <span className="color:#c3cddd white-space:nowrap">{label}</span>
                    {showValue ? <Select.Value className="color:#eef2f7 white-space:nowrap" /> : null}
                    <span className="margin-left:auto display:flex align-items:center color:#b7c2d4">
                        <CaretDown size={12} />
                    </span>
                </Select.Trigger>
                <Select.Portal>
                    <Select.Positioner side="bottom" align="start" sideOffset={6}>
                        <Select.Popup className="background-color:#0e121a border:1px_solid_rgba(86,98,120,0.45) border-radius:12px padding:8px box-shadow:0_16px_30px_rgba(0,0,0,0.45)">
                            {normalized.map(option => {
                                const Icon = option.icon
                                return (
                                    <Select.Item
                                        key={option.value}
                                        value={option.value}
                                        className="display:flex align-items:center gap:8px padding:6px_8px border-radius:8px cursor:pointer color:#d8e2f1 font-size:11px"
                                        title={option.tooltip ?? option.label ?? option.value}
                                    >
                                        {Icon ? <Icon size={12} className="color:inherit" /> : null}
                                        <Select.ItemText>{option.label ?? option.value}</Select.ItemText>
                                    </Select.Item>
                                )
                            })}
                        </Select.Popup>
                    </Select.Positioner>
                </Select.Portal>
            </Select.Root>
        </div>
    )
}

function NumberField({
    value,
    onChange,
    prop,
    tokens,
    disabled,
    defaultUnit,
}: {
    value: string
    onChange: (value: string) => void
    prop: string
    tokens?: TokenSnapshot | null
    disabled?: boolean
    defaultUnit: string
}) {
    const isToken = isTokenValue(prop, value, tokens ?? null)
    const unitless = isUnitlessProp(prop)
    const parsed = parseNumericValue(value, defaultUnit)
    const inputValue = parsed.isNumeric ? formatNumber(parsed.number, 2) : value
    const showUnits = !unitless && !isToken
    const unitsDisabled = disabled || !parsed.isNumeric || !showUnits

    const handleInputChange = (next: string) => {
        if (disabled) return
        if (isToken) {
            onChange(next)
            return
        }
        if (!next.trim()) {
            onChange('')
            return
        }
        if (!/^-?\d*\.?\d*$/.test(next)) {
            onChange(next)
            return
        }
        if (unitless) {
            onChange(next)
            return
        }
        onChange(`${next}${parsed.unit}`)
    }

    const handleUnitChange = (unit: string) => {
        if (unitsDisabled) return
        const formatted = formatNumber(parsed.number, 2)
        onChange(`${formatted}${unit}`)
    }

    return (
        <div className="flex:1 display:flex align-items:center">
            <div className="flex:1 display:flex align-items:center height:26px box-sizing:border-box background-color:rgba(10,14,20,0.86) border:1px_solid_rgba(86,98,120,0.4) border-radius:10px overflow:hidden">
                <Input
                    className="flex:1 background:transparent border:none outline:none appearance:none color:#eef2f7 padding:0_8px font-size:11px height:100% line-height:1"
                    value={toInputValue(inputValue)}
                    onChange={event => handleInputChange(event.target.value)}
                    disabled={disabled}
                />
                {showUnits ? (
                    <Select.Root
                        value={parsed.unit}
                        onValueChange={nextValue => {
                            if (nextValue != null) handleUnitChange(nextValue)
                        }}
                        disabled={unitsDisabled}
                    >
                        <Select.Trigger
                            className={cx(
                                'height:100% width:48px display:flex align-items:center justify-content:center background:rgba(12,16,22,0.6) border-top:0 border-right:0 border-bottom:0 border-left:1px_solid_rgba(86,98,120,0.4) padding:0_10px font-size:10px color:#d9e2f1 border-radius:0 line-height:1 appearance:none outline:none box-shadow:none',
                                unitsDisabled &&
                                    'color:rgba(217,226,241,0.45) background:rgba(12,16,22,0.35) cursor:default',
                            )}
                        >
                            <Select.Value />
                        </Select.Trigger>
                        <Select.Portal>
                            <Select.Positioner side="bottom" align="end" sideOffset={6}>
                                <Select.Popup className="background-color:#0e121a border:1px_solid_rgba(86,98,120,0.45) border-radius:12px padding:8px box-shadow:0_16px_30px_rgba(0,0,0,0.45)">
                                    {unitOptions.map(unit => (
                                        <Select.Item
                                            key={unit}
                                            value={unit}
                                            className="padding:6px_8px border-radius:8px cursor:pointer color:#d8e2f1 font-size:11px"
                                        >
                                            <Select.ItemText>{unit}</Select.ItemText>
                                        </Select.Item>
                                    ))}
                                </Select.Popup>
                            </Select.Positioner>
                        </Select.Portal>
                    </Select.Root>
                ) : null}
            </div>
        </div>
    )
}

function ColorPickerButton({
    prop,
    value,
    onChange,
    tokens,
    previewOverride,
    mode = 'gradient',
}: {
    prop?: string
    value: string
    onChange: (value: string) => void
    tokens?: TokenSnapshot | null
    previewOverride?: string
    mode?: 'solid' | 'gradient'
}) {
    const [open, setOpen] = React.useState(false)
    const triggerRef = React.useRef<HTMLButtonElement | null>(null)
    const lastValidGradientRef = React.useRef(defaultGradientPreview)
    const resolved = prop ? resolveTokenValue(prop, value, tokens ?? null) ?? value : value
    const previewValue = previewOverride ?? resolved ?? ''
    const gradientEnabled = mode === 'gradient'
    const fallbackValue = gradientEnabled ? defaultGradientPreview : defaultSolidPreview
    const resolvedValue = previewValue || fallbackValue
    const isResolvedGradient = gradientEnabled && isGradientValue(resolvedValue)
    const normalizedGradientValue = isResolvedGradient ? normalizeGradientStops(resolvedValue) : null
    const safeGradientValue =
        normalizedGradientValue ??
        (isResolvedGradient ? resolvedValue : null) ??
        lastValidGradientRef.current ??
        defaultGradientPreview
    if (gradientEnabled && safeGradientValue) {
        lastValidGradientRef.current = safeGradientValue
    }
    const pickerValue = gradientEnabled
        ? safeGradientValue
        : isGradientValue(resolvedValue)
          ? defaultSolidPreview
          : resolvedValue
    const pickerProps = gradientEnabled ? gradientPickerProps : solidPickerProps
    const resolveAnchor = React.useCallback(() => {
        const trigger = triggerRef.current
        if (!trigger) return null
        return trigger.closest('[data-compact-input]') ?? trigger
    }, [])

    return (
        <Popover.Root open={open} onOpenChange={setOpen}>
            <Popover.Trigger
                className="height:100% display:flex align-items:center justify-content:center padding:0_6px border:none background:transparent cursor:pointer"
                type="button"
                aria-label="Edit color"
                title="Edit color"
                ref={triggerRef}
            >
                <div
                    className="width:14px height:14px border-radius:6px border:1px_solid_rgba(255,255,255,0.16)"
                    style={{ background: previewValue || '#0f1115' }}
                />
            </Popover.Trigger>
            <Popover.Portal>
                <Popover.Positioner side="bottom" align="start" sideOffset={8} anchor={resolveAnchor}>
                    <Popover.Popup className="background-color:#0e121a border:1px_solid_rgba(86,98,120,0.45) border-radius:14px padding:12px box-shadow:0_16px_30px_rgba(0,0,0,0.45)">
                        <ColorPicker
                            value={pickerValue}
                            onChange={nextValue => {
                                if (!gradientEnabled) {
                                    onChange(nextValue)
                                    return
                                }
                                const normalized = normalizeGradientStops(nextValue)
                                const nextGradient =
                                    normalized ??
                                    (isGradientValue(nextValue) && !/\bnan\b/i.test(nextValue)
                                        ? nextValue
                                        : null) ??
                                    lastValidGradientRef.current ??
                                    defaultGradientPreview
                                lastValidGradientRef.current = nextGradient
                                onChange(nextGradient)
                            }}
                            hidePresets={pickerProps.hidePresets}
                            hideAdvancedSliders={pickerProps.hideAdvancedSliders}
                            hideEyeDrop={pickerProps.hideEyeDrop}
                            hideColorGuide={pickerProps.hideColorGuide}
                            hideInputType={pickerProps.hideInputType}
                            hideInputs={pickerProps.hideInputs}
                            hideColorTypeBtns={pickerProps.hideColorTypeBtns}
                            hideGradientControls={pickerProps.hideGradientControls}
                            hideGradientType={pickerProps.hideGradientType}
                            hideGradientAngle={pickerProps.hideGradientAngle}
                            hideGradientStop={pickerProps.hideGradientStop}
                        />
                    </Popover.Popup>
                </Popover.Positioner>
            </Popover.Portal>
        </Popover.Root>
    )
}

export function ColorRow({
    label,
    prop,
    value,
    onChange,
    tokens,
}: {
    label: string
    prop: string
    value: string
    onChange: (value: string) => void
    tokens?: TokenSnapshot | null
}) {
    return (
        <CompactInputRow
            label={label}
            prop={prop}
            value={value}
            onChange={onChange}
            tokens={tokens}
            mode="text"
            renderAfter={<ColorPickerButton prop={prop} value={value} onChange={onChange} tokens={tokens} mode="solid" />}
        />
    )
}

export function GradientRow({
    label,
    prop,
    value,
    onChange,
}: {
    label: string
    prop: string
    value: string
    onChange: (value: string) => void
}) {
    return (
        <CompactInputRow
            label={label}
            prop={prop}
            value={value}
            onChange={onChange}
            mode="text"
            renderAfter={<ColorPickerButton value={value} onChange={onChange} mode="gradient" />}
        />
    )
}

export function SliderRow({
    label,
    prop,
    value,
    min,
    max,
    step,
    suffix,
    onChange,
    onCommit,
    tokens,
}: {
    label: string
    prop: string
    value: string
    min: number
    max: number
    step: number
    suffix?: string
    onChange: (value: string) => void
    onCommit?: (value: string) => void
    tokens?: TokenSnapshot | null
}) {
    const propTokens = getTokenOptionsForProp(prop, tokens ?? null)
    const tokenOptions = propTokens.length ? propTokens : getAllTokenOptions(tokens ?? null)
    const tokenPrefix = propTokens.length ? '' : '$$.token.'
    const numeric = asNumber(value, 0)
    const canScrub = Number.isFinite(numeric)

    const handleScrubStart = (event: React.PointerEvent) => {
        if (!canScrub) return
        startScrub({
            event,
            value: numeric,
            step,
            min,
            max,
            onChange: next => onChange(String(formatNumber(next, 3))),
            onCommit: next => onCommit?.(String(formatNumber(next, 3))),
        })
    }

    return (
        <div className="display:flex align-items:flex-start justify-content:space-between gap:12px flex-wrap:wrap row-gap:6px">
            <div
                className={cx(
                    'font-size:11px color:#b9c4d8 width:110px flex:0_0_110px line-height:1.2 word-break:break-word',
                    canScrub && 'cursor:ew-resize color:#dfe7f4',
                )}
                onPointerDown={handleScrubStart}
            >
                {label}
            </div>
            <div className="flex:1 min-width:180px display:flex align-items:center gap:8px">
                <Input
                    className="width:72px background-color:rgba(10,14,20,0.86) border:1px_solid_rgba(86,98,120,0.4) border-radius:10px color:#eef2f7 padding:6px_8px font-size:11px"
                    value={toInputValue(value)}
                    onChange={event => onChange(event.target.value)}
                />
                <div className="flex:1">
                    <Slider.Root
                        min={min}
                        max={max}
                        step={step}
                        value={[numeric]}
                        onValueChange={next => onChange(String(next[0]))}
                        onValueCommitted={next => onCommit?.(String(next[0]))}
                    >
                        <Slider.Control className="position:relative height:18px display:flex align-items:center">
                            <Slider.Track className="height:6px flex:1 border-radius:999px background-color:rgba(24,30,40,0.9) border:1px_solid_rgba(90,104,126,0.4)">
                                <Slider.Indicator className="height:100% border-radius:999px background:primary-gradient" />
                            </Slider.Track>
                            <Slider.Thumb className="width:14px height:14px border-radius:999px background-color:primary-soft-2 border:1px_solid_rgba(86,98,120,0.6) box-shadow:primary-ring" />
                        </Slider.Control>
                    </Slider.Root>
                </div>
                {suffix ? <div className="color:#7e8aa0 font-size:11px">{suffix}</div> : null}
                {tokenOptions.length > 0 ? (
                    <TokenPopover
                        label="Tokens"
                        tokens={tokenOptions}
                        onSelect={value => onChange(tokenPrefix ? `${tokenPrefix}${value}` : value)}
                    />
                ) : null}
            </div>
        </div>
    )
}

export function SpacingControl({
    label,
    props,
    state,
    onChange,
    tokens,
}: {
    label: string
    props: string[]
    state: StyleState
    onChange: (values: Record<string, string>, commit?: boolean) => void
    tokens?: TokenSnapshot | null
}) {
    const [split, setSplit] = React.useState(false)
    const values = props.map(prop => state.draft[prop] ?? state.initial[prop] ?? '')

    const shorthandValue = React.useMemo(() => {
        const first = values[0] ?? ''
        if (!first && values.every(value => !value)) return ''
        return values.every(value => value === first) ? first : ''
    }, [values])

    const updateAll = (next: string) => {
        const update: Record<string, string> = {}
        for (const prop of props) {
            update[prop] = next
        }
        onChange(update, true)
    }

    const updateSingle = (index: number, next: string) => {
        onChange({ [props[index]]: next }, true)
    }

    return (
        <div
            className={cx(
                'display:flex flex-direction:column gap:8px',
                split ? 'width:100% flex:0_0_100%' : 'flex:0_0_auto',
            )}
        >
            {!split ? (
                <div className="display:flex align-items:center gap:8px">
                    <button
                        className="height:32px width:30px border-radius:10px border:1px_solid_rgba(88,102,128,0.4) background-color:rgba(12,16,22,0.9) color:#b7c2d4 display:flex align-items:center justify-content:center cursor:pointer transition:background-color_120ms_ease,color_120ms_ease,border-color_120ms_ease"
                        onClick={() => setSplit(true)}
                        aria-label={`Split ${label}`}
                        title={`Split ${label}`}
                        type="button"
                    >
                        <BoundingBox size={14} />
                    </button>
                    <CompactInputRow
                        label={label}
                        prop={props[0]}
                        value={shorthandValue}
                        onChange={updateAll}
                        tokens={tokens}
                    />
                </div>
            ) : (
                <div className="display:flex align-items:center gap:8px width:100% flex-wrap:wrap">
                    <button
                        className="height:32px width:30px border-radius:10px border:1px_solid_rgba(88,102,128,0.4) background-color:rgba(12,16,22,0.9) color:#b7c2d4 display:flex align-items:center justify-content:center cursor:pointer transition:background-color_120ms_ease,color_120ms_ease,border-color_120ms_ease flex:0_0_auto"
                        onClick={() => setSplit(false)}
                        aria-label={`Collapse ${label}`}
                        title={`Collapse ${label}`}
                        type="button"
                    >
                        <BoundingBox size={14} weight="fill" />
                    </button>
                    {props.map((prop, index) => (
                        <div key={prop} className="flex:0_0_auto">
                            <CompactInputRow
                                label={prop}
                                prop={prop}
                                value={toInputValue(values[index])}
                                onChange={value => updateSingle(index, value)}
                                tokens={tokens}
                            />
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

export function TokenPopover({
    label,
    tokens,
    onSelect,
}: {
    label: string
    tokens: Array<{ key: string; value: string }>
    onSelect: (value: string) => void
}) {
    if (!tokens.length) return null
    return (
        <Popover.Root>
            <Popover.Trigger
                className="background-color:transparent border:1px_solid_rgba(86,98,120,0.4) color:#a6b2c9 border-radius:10px padding:6px_10px cursor:pointer font-size:10px"
                type="button"
            >
                {label}
            </Popover.Trigger>
            <Popover.Portal>
                <Popover.Positioner side="bottom" align="start" sideOffset={6}>
                    <Popover.Popup className="background-color:#0d1118 border:1px_solid_rgba(86,98,120,0.4) border-radius:12px padding:10px box-shadow:0_16px_30px_rgba(0,0,0,0.45) min-width:220px max-height:240px overflow:auto">
                        <div className="display:flex flex-direction:column gap:6px">
                            {tokens.map(token => (
                                <Popover.Close
                                    key={token.key}
                                    className="display:flex justify-content:space-between gap:8px padding:6px_8px border-radius:8px background-color:rgba(20,24,32,0.9) border:1px_solid_rgba(86,98,120,0.24) cursor:pointer"
                                    onClick={() => onSelect(token.key)}
                                    type="button"
                                >
                                    <span className="color:#d5deea font-size:11px">{token.key}</span>
                                    <span className="color:#7d889d font-size:11px">{token.value}</span>
                                </Popover.Close>
                            ))}
                        </div>
                    </Popover.Popup>
                </Popover.Positioner>
            </Popover.Portal>
        </Popover.Root>
    )
}
