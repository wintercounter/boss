import * as React from 'react'
import { Button } from '@base-ui/react/button'
import { Input } from '@base-ui/react/input'
import { Tabs } from '@base-ui/react/tabs'
import { Popover } from '@base-ui/react/popover'
import { ArrowCounterClockwise, ArrowClockwise, Check, GearSix, SlidersHorizontal, X } from '@phosphor-icons/react'
import { cx } from 'boss-css/variants'

import type { PropRow, SelectionState, TokenSnapshot, UiStatus } from '../types'
import type { CssEditorFooterState, CssEditorHandle } from './CssEditor'
import { CssEditor } from './CssEditor'
import { SourceEditor } from './SourceEditor'
import { ButtonGroup, ButtonGroupItem, ButtonGroupSeparator } from './components/ButtonGroup'

type DevtoolsPanelProps = {
    open: boolean
    props: PropRow[]
    propsBaseline: Record<string, string>
    status: UiStatus
    selection: SelectionState | null
    tokens: TokenSnapshot | null
    bossTypes: string | null
    sourceText: string
    sourceDirty: boolean
    sourceStatus: 'idle' | 'loading' | 'saving'
    onClose: () => void
    onChange: (key: string, value: string) => void
    onSave: (key: string) => void
    onAddProp: (name: string, value: string, kind: AddKind) => void
    onSourceChange: (value: string) => void
    onSaveSource: () => void
    onSaveStyles: (changes: Array<{ prop: string; value: string }>) => Promise<void>
    hostApi?: { dictionary?: { toValue?: (value: unknown, prop?: string) => unknown } } | null
}

type AddKind = 'string' | 'number' | 'boolean' | 'array'

type TokenOption = {
    key: string
    value: string
}

type PanelState = {
    offset: { x: number; y: number }
    size: { width: number; height: number }
    tab: string
    addName: string
    addValue: string
    addKind: AddKind
}

const PANEL_STATE_KEY = '__bossDevtoolsPanelState'

export function DevtoolsPanel({
    open,
    props,
    propsBaseline,
    status,
    selection,
    tokens,
    bossTypes,
    sourceText,
    sourceDirty,
    sourceStatus,
    onClose,
    onChange,
    onSave,
    onAddProp,
    onSourceChange,
    onSaveSource,
    onSaveStyles,
    hostApi,
}: DevtoolsPanelProps) {
    const [tab, setTab] = React.useState('css')
    const [addName, setAddName] = React.useState('')
    const [addValue, setAddValue] = React.useState('')
    const [addKind, setAddKind] = React.useState<AddKind>('string')
    const [panelOffset, setPanelOffset] = React.useState({ x: 0, y: 0 })
    const [panelSize, setPanelSize] = React.useState({ width: 760, height: 560 })
    const [cssFooterState, setCssFooterState] = React.useState<CssEditorFooterState>({
        dirty: false,
        canUndo: false,
        canRedo: false,
        saving: false,
    })

    const propsDirtyKeys = React.useMemo(() => {
        const baselineKeys = Object.keys(propsBaseline)
        if (baselineKeys.length === 0) return []
        return props.filter(prop => prop.editable && propsBaseline[prop.key] !== prop.value).map(prop => prop.key)
    }, [props, propsBaseline])

    const propsDirty = propsDirtyKeys.length > 0

    const handleResetProps = React.useCallback(() => {
        if (!propsDirty) return
        for (const prop of props) {
            const original = propsBaseline[prop.key]
            if (original === undefined || original === prop.value) continue
            onChange(prop.key, original)
        }
    }, [onChange, props, propsBaseline, propsDirty])

    const handleSaveAllProps = React.useCallback(() => {
        if (!propsDirty) return
        for (const key of propsDirtyKeys) {
            onSave(key)
        }
    }, [onSave, propsDirty, propsDirtyKeys])

    const handleCssUndo = React.useCallback(() => {
        cssEditorRef.current?.undo()
    }, [])

    const handleCssRedo = React.useCallback(() => {
        cssEditorRef.current?.redo()
    }, [])

    const handleCssReset = React.useCallback(() => {
        cssEditorRef.current?.reset()
    }, [])

    const handleCssSave = React.useCallback(() => {
        cssEditorRef.current?.save()
    }, [])

    const panelRef = React.useRef<HTMLDivElement | null>(null)
    const cssEditorRef = React.useRef<CssEditorHandle | null>(null)
    const interactionRef = React.useRef(false)
    const dragRef = React.useRef<{
        startX: number
        startY: number
        originX: number
        originY: number
    } | null>(null)
    const resizeRef = React.useRef<{
        startX: number
        startY: number
        width: number
        height: number
    } | null>(null)

    React.useEffect(() => {
        if (!open) return
        const storedState = readPanelState(selection?.element)
        if (storedState) {
            setPanelOffset(storedState.offset)
            setPanelSize(storedState.size)
            setTab(storedState.tab)
            setAddName(storedState.addName)
            setAddValue(storedState.addValue)
            setAddKind(storedState.addKind)
            return
        }
        setTab('css')
        setAddName('')
        setAddValue('')
        setAddKind('string')
        setPanelOffset({ x: 0, y: 0 })
        setPanelSize({ width: 760, height: 560 })
    }, [open, selection?.element])

    React.useEffect(() => {
        if (addKind === 'boolean' && addValue === '') {
            setAddValue('true')
        }
    }, [addKind, addValue])

    React.useLayoutEffect(() => {
        const panel = panelRef.current
        if (!panel) return
        const rect = panel.getBoundingClientRect()
        const padding = 12
        let dx = 0
        let dy = 0

        if (rect.left < padding) dx = padding - rect.left
        if (rect.top < padding) dy = padding - rect.top
        if (rect.right > window.innerWidth - padding) dx = window.innerWidth - padding - rect.right
        if (rect.bottom > window.innerHeight - padding) dy = window.innerHeight - padding - rect.bottom

        if (dx || dy) {
            setPanelOffset(current => ({ x: current.x + dx, y: current.y + dy }))
        }
    }, [panelOffset, panelSize, open])

    React.useEffect(() => {
        if (!open) return
        if (!selection?.element) return
        writePanelState(selection.element, {
            offset: panelOffset,
            size: panelSize,
            tab,
            addName,
            addValue,
            addKind,
        })
    }, [open, panelOffset, panelSize, selection?.element, tab, addName, addValue, addKind])

    if (!open || !selection?.element) return null

    const tokenGroupForAdd = getTokenGroup(addName, tokens)
    const addTokenOptions = tokenGroupForAdd
        ? flattenTokens(tokens?.tokens[tokenGroupForAdd])
        : flattenAllTokens(tokens)
    const addTokenPrefix = tokenGroupForAdd ? '' : '$$.token.'
    const addIsColor = addKind === 'string' && (tokenGroupForAdd === 'color' || isColorProp(addName))
    const addHexValue = addIsColor ? normalizeHex(addValue) : null
    const selectionLabel = selection?.source.fileName
        ? `${shortenPath(selection.source.fileName)}:${selection.source.lineNumber}`
        : 'No selection'

    const onDragStart = (event: React.PointerEvent) => {
        if (event.button !== 0) return
        event.preventDefault()
        event.stopPropagation()
        interactionRef.current = true
        dragRef.current = {
            startX: event.clientX,
            startY: event.clientY,
            originX: panelOffset.x,
            originY: panelOffset.y,
        }
        window.addEventListener('pointermove', onDragMove, true)
        window.addEventListener('pointerup', onDragEnd, true)
    }

    const onDragMove = (event: PointerEvent) => {
        const state = dragRef.current
        if (!state) return
        const dx = event.clientX - state.startX
        const dy = event.clientY - state.startY
        setPanelOffset({ x: state.originX + dx, y: state.originY + dy })
    }

    const onDragEnd = () => {
        dragRef.current = null
        interactionRef.current = false
        document.body.dataset.bossDevtoolsOutsidePressUntil = String(Date.now() + 250)
        window.removeEventListener('pointermove', onDragMove, true)
        window.removeEventListener('pointerup', onDragEnd, true)
    }

    const onResizeStart = (event: React.PointerEvent) => {
        if (event.button !== 0) return
        event.preventDefault()
        event.stopPropagation()
        interactionRef.current = true
        resizeRef.current = {
            startX: event.clientX,
            startY: event.clientY,
            width: panelSize.width,
            height: panelSize.height,
        }
        window.addEventListener('pointermove', onResizeMove, true)
        window.addEventListener('pointerup', onResizeEnd, true)
    }

    const onResizeMove = (event: PointerEvent) => {
        const state = resizeRef.current
        if (!state) return
        const dx = event.clientX - state.startX
        const dy = event.clientY - state.startY
        const maxWidth = Math.min(960, window.innerWidth - 24)
        const maxHeight = Math.min(820, window.innerHeight - 24)
        const width = clamp(state.width + dx, 520, maxWidth)
        const height = clamp(state.height + dy, 360, maxHeight)
        setPanelSize({ width, height })
    }

    const onResizeEnd = () => {
        resizeRef.current = null
        interactionRef.current = false
        document.body.dataset.bossDevtoolsOutsidePressUntil = String(Date.now() + 250)
        window.removeEventListener('pointermove', onResizeMove, true)
        window.removeEventListener('pointerup', onResizeEnd, true)
    }

    return (
        <Popover.Root
            open={open}
            onOpenChange={(next, eventDetails) => {
                if (next) return
                const isScrubbing = document.body.dataset.bossDevtoolsScrub === 'true'
                const outsidePressUntil = Number(document.body.dataset.bossDevtoolsOutsidePressUntil ?? 0)
                const ignoreOutsidePress = Date.now() < outsidePressUntil
                if (
                    eventDetails?.reason === 'outside-press' &&
                    (interactionRef.current || isScrubbing || ignoreOutsidePress)
                ) {
                    eventDetails.cancel()
                    return
                }
                onClose()
            }}
        >
            <Popover.Portal>
                <Popover.Positioner
                    anchor={selection.element}
                    side="bottom"
                    align="start"
                    sideOffset={10 + panelOffset.y}
                    alignOffset={panelOffset.x}
                    positionMethod="fixed"
                    collisionPadding={12}
                    disableAnchorTracking
                >
                    <Popover.Popup
                        className="z-index:2147483647 width:760px max-height:80vh display:flex flex-direction:column border-radius:18px border:1px_solid_rgba(88,102,128,0.32) background:linear-gradient(160deg,rgba(16,20,30,0.96),rgba(8,10,16,0.98)) box-shadow:0_30px_80px_rgba(4,6,10,0.65) backdrop-filter:blur(14px) color:#eef2f7 font-family:IBM_Plex_Sans,Space_Grotesk,ui-sans-serif,system-ui font-size:12px pointer-events:auto overflow:hidden"
                        data-boss-devtools="true"
                        ref={panelRef}
                        style={{
                            width: panelSize.width,
                            height: panelSize.height,
                        }}
                    >
                        <Tabs.Root
                            value={tab}
                            onValueChange={setTab}
                            className="display:flex flex-direction:column flex:1 min-height:0"
                        >
                            <div
                                className="display:grid grid-template-columns:1fr_auto_1fr align-items:center gap:12px padding:14px_18px border-bottom:1px_solid_rgba(88,102,128,0.24) background:linear-gradient(135deg,rgba(22,26,36,0.95),rgba(12,15,20,0.95)) cursor:grab user-select:none"
                                onPointerDown={onDragStart}
                            >
                                <div className="display:flex flex-direction:column gap:4px align-items:flex-start">
                                    <div className="font-size:13px font-weight:600 letter-spacing:0.02em">
                                        {selectionLabel?.split('/')?.pop()}
                                    </div>
                                    <div className="color:#96a0b5 font-size:11px">
                                        {selectionLabel?.split('/')?.slice(0, -1)?.join('/')}/
                                    </div>
                                </div>
                                <div className="display:flex align-items:center justify-content:center">
                                    <ButtonGroup as={Tabs.List} size="md">
                                        <ButtonGroupItem as={Tabs.Tab} value="css" active={tab === 'css'}>
                                            CSS
                                        </ButtonGroupItem>
                                        <ButtonGroupSeparator />
                                        <ButtonGroupItem as={Tabs.Tab} value="props" active={tab === 'props'}>
                                            Props
                                        </ButtonGroupItem>
                                        <ButtonGroupSeparator />
                                        <ButtonGroupItem as={Tabs.Tab} value="source" active={tab === 'source'}>
                                            Code
                                        </ButtonGroupItem>
                                    </ButtonGroup>
                                </div>
                                <div className="display:flex align-items:center justify-content:flex-end gap:8px">
                                    <div
                                        className={cx(
                                            'padding:3px_8px border-radius:999px font-size:10px text-transform:uppercase',
                                            statusClass(status),
                                        )}
                                    >
                                        {status}
                                    </div>
                                    <IconButton label="Settings">
                                        <GearSix size={16} />
                                    </IconButton>
                                    <IconButton label="Close" onClick={onClose}>
                                        <X size={16} />
                                    </IconButton>
                                </div>
                            </div>
                            <div className="flex:1 min-height:0 display:flex width:100%">
                                <Tabs.Panel value="css" className="flex:1 min-height:0 display:flex width:100%">
                                    <CssEditor
                                        ref={cssEditorRef}
                                        element={selection.element}
                                        props={props}
                                        tokens={tokens}
                                        status={status}
                                        hostApi={hostApi}
                                        onSaveStyles={onSaveStyles}
                                        onStateChange={setCssFooterState}
                                    />
                                </Tabs.Panel>
                                <Tabs.Panel
                                    value="props"
                                    className="flex:1 min-height:0 overflow:auto padding:12px_14px"
                                >
                                    <div className="display:flex flex-direction:column gap:16px">
                                        {props.length === 0 ? (
                                            <EmptyState
                                                title="No props yet"
                                                body="Select a $$ element and press Control to inspect props."
                                            />
                                        ) : (
                                            <div className="display:flex flex-direction:column gap:12px">
                                                {props.map(prop => (
                                                    <PropEditorRow
                                                        key={prop.key}
                                                        prop={prop}
                                                        tokens={tokens}
                                                        disabled={!prop.editable || status !== 'connected'}
                                                        onChange={onChange}
                                                        onSave={onSave}
                                                    />
                                                ))}
                                            </div>
                                        )}
                                        <div className="padding:12px border-radius:12px border:1px_solid_rgba(88,102,128,0.26) background:rgba(16,20,28,0.8) display:flex flex-direction:column gap:12px">
                                            <div className="font-size:12px font-weight:600 color:#e6edf7">Add prop</div>
                                            <div className="display:flex flex-direction:column gap:8px">
                                                <div className="color:#b8c4d8 font-size:11px text-transform:uppercase letter-spacing:0.08em">
                                                    Prop name
                                                </div>
                                                <Input
                                                    className="flex:1 background-color:rgba(9,12,18,0.8) border:1px_solid_rgba(88,102,128,0.35) border-radius:8px color:#eef2f7 padding:6px_8px font-size:12px"
                                                    value={addName}
                                                    onChange={event => setAddName(event.target.value)}
                                                    placeholder="e.g. color, padding, border-radius"
                                                />
                                            </div>
                                            <div className="display:flex flex-direction:column gap:8px">
                                                <div className="color:#b8c4d8 font-size:11px text-transform:uppercase letter-spacing:0.08em">
                                                    Value
                                                </div>
                                                {addKind === 'boolean' ? (
                                                    <div className="display:flex gap:8px flex-wrap:wrap">
                                                        <Button
                                                            className={toggleButtonClass(addValue !== 'false')}
                                                            onClick={() => setAddValue('true')}
                                                        >
                                                            True
                                                        </Button>
                                                        <Button
                                                            className={toggleButtonClass(addValue === 'false')}
                                                            onClick={() => setAddValue('false')}
                                                        >
                                                            False
                                                        </Button>
                                                    </div>
                                                ) : addIsColor ? (
                                                    <div className="display:flex align-items:center gap:8px flex:1">
                                                        <div
                                                            className="width:18px height:18px border-radius:6px border:1px_solid_rgba(255,255,255,0.16)"
                                                            style={{ background: addHexValue ?? '#0f1115' }}
                                                        />
                                                        <Input
                                                            className="flex:1 background-color:rgba(9,12,18,0.8) border:1px_solid_rgba(88,102,128,0.35) border-radius:8px color:#eef2f7 padding:6px_8px font-size:12px"
                                                            value={addValue}
                                                            onChange={event => setAddValue(event.target.value)}
                                                            placeholder="e.g. #3a8bff"
                                                        />
                                                        <input
                                                            className="width:28px height:28px padding:0 border:1px_solid_rgba(88,102,128,0.4) background-color:transparent border-radius:8px"
                                                            type="color"
                                                            value={addHexValue ?? '#000000'}
                                                            onChange={event => setAddValue(event.target.value)}
                                                        />
                                                    </div>
                                                ) : (
                                                    <Input
                                                        className="flex:1 background-color:rgba(9,12,18,0.8) border:1px_solid_rgba(88,102,128,0.35) border-radius:8px color:#eef2f7 padding:6px_8px font-size:12px"
                                                        value={addValue}
                                                        onChange={event => setAddValue(event.target.value)}
                                                        placeholder={
                                                            addKind === 'array' ? '["8", "16"]' : 'Enter value'
                                                        }
                                                    />
                                                )}
                                                {addTokenOptions.length > 0 ? (
                                                    <TokenPopover
                                                        label={
                                                            tokenGroupForAdd
                                                                ? `Tokens: ${tokenGroupForAdd}`
                                                                : 'All tokens'
                                                        }
                                                        tokens={addTokenOptions}
                                                        onSelect={value =>
                                                            setAddValue(
                                                                addTokenPrefix ? `${addTokenPrefix}${value}` : value,
                                                            )
                                                        }
                                                    />
                                                ) : null}
                                            </div>
                                            <div className="display:flex flex-direction:column gap:8px">
                                                <div className="color:#b8c4d8 font-size:11px text-transform:uppercase letter-spacing:0.08em">
                                                    Type
                                                </div>
                                                <div className="display:flex gap:8px flex-wrap:wrap">
                                                    {(['string', 'number', 'boolean', 'array'] as AddKind[]).map(
                                                        kind => (
                                                            <Button
                                                                key={kind}
                                                                className={toggleButtonClass(addKind === kind)}
                                                                onClick={() => setAddKind(kind)}
                                                            >
                                                                {kind}
                                                            </Button>
                                                        ),
                                                    )}
                                                </div>
                                            </div>
                                            <div className="display:flex flex-direction:column gap:8px">
                                                <Button
                                                    className="background-color:primary-20 border:1px_solid border-color:primary-60 color:primary-soft border-radius:10px padding:6px_12px cursor:pointer"
                                                    onClick={() => onAddProp(addName, addValue, addKind)}
                                                    disabled={status !== 'connected'}
                                                >
                                                    Add prop
                                                </Button>
                                                <div className="color:#7a8599 font-size:11px">
                                                    Tip: tokens can be used by name (e.g. primary, neutral.100).
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </Tabs.Panel>
                                <Tabs.Panel
                                    value="source"
                                    className="flex:1 min-height:0 overflow:auto padding:12px_14px"
                                >
                                    <SourceEditor
                                        className="width:100% min-height:220px height:260px background-color:#0b0f15 border:1px_solid_rgba(88,102,128,0.35) border-radius:12px overflow:hidden"
                                        value={sourceText}
                                        fileName={selection?.source.fileName}
                                        bossTypes={bossTypes}
                                        onChange={onSourceChange}
                                    />
                                </Tabs.Panel>
                            </div>
                            <div className="padding:12px_16px border-top:1px_solid_rgba(84,96,116,0.28) background:linear-gradient(180deg,rgba(10,12,16,0.96),rgba(7,9,12,0.98)) display:flex align-items:center justify-content:space-between gap:12px">
                                {tab === 'css' ? (
                                    <>
                                        <div className="display:flex align-items:center gap:8px color:#8a96ab font-size:11px">
                                            <SlidersHorizontal size={14} />
                                            {cssFooterState.dirty ? 'Unsaved changes' : 'Synced'}
                                        </div>
                                        <div className="display:flex align-items:center gap:8px">
                                            <IconButton
                                                label="Undo"
                                                onClick={handleCssUndo}
                                                disabled={!cssFooterState.canUndo}
                                            >
                                                <ArrowCounterClockwise size={16} />
                                            </IconButton>
                                            <IconButton
                                                label="Redo"
                                                onClick={handleCssRedo}
                                                disabled={!cssFooterState.canRedo}
                                            >
                                                <ArrowClockwise size={16} />
                                            </IconButton>
                                            <Button
                                                className="background-color:rgba(20,24,32,0.6) border:1px_solid_rgba(80,92,112,0.4) color:#9aa5b6 border-radius:10px padding:6px_12px font-size:11px cursor:pointer"
                                                onClick={handleCssReset}
                                                disabled={!cssFooterState.dirty}
                                            >
                                                Reset
                                            </Button>
                                            <Button
                                                className={cx(
                                                    'display:flex align-items:center gap:6px border-radius:10px padding:6px_12px font-size:11px font-weight:600 cursor:pointer',
                                                    cssFooterState.dirty
                                                        ? 'background-color:primary-20 border:1px_solid border-color:primary-70 color:primary-soft'
                                                        : 'background-color:rgba(20,24,32,0.6) border:1px_solid_rgba(80,92,112,0.4) color:#75829a',
                                                )}
                                                onClick={handleCssSave}
                                                disabled={
                                                    !cssFooterState.dirty ||
                                                    cssFooterState.saving ||
                                                    status !== 'connected'
                                                }
                                            >
                                                <Check size={14} />
                                                Save
                                            </Button>
                                        </div>
                                    </>
                                ) : null}
                                {tab === 'props' ? (
                                    <>
                                        <div className="display:flex align-items:center gap:8px color:#8a96ab font-size:11px">
                                            <SlidersHorizontal size={14} />
                                            {propsDirty ? `${propsDirtyKeys.length} pending` : 'Synced'}
                                        </div>
                                        <div className="display:flex align-items:center gap:8px">
                                            <Button
                                                className="background-color:rgba(20,24,32,0.6) border:1px_solid_rgba(80,92,112,0.4) color:#9aa5b6 border-radius:10px padding:6px_12px font-size:11px cursor:pointer"
                                                onClick={handleResetProps}
                                                disabled={!propsDirty}
                                            >
                                                Reset
                                            </Button>
                                            <Button
                                                className={cx(
                                                    'display:flex align-items:center gap:6px border-radius:10px padding:6px_12px font-size:11px font-weight:600 cursor:pointer',
                                                    propsDirty
                                                        ? 'background-color:primary-20 border:1px_solid border-color:primary-70 color:primary-soft'
                                                        : 'background-color:rgba(20,24,32,0.6) border:1px_solid_rgba(80,92,112,0.4) color:#75829a',
                                                )}
                                                onClick={handleSaveAllProps}
                                                disabled={!propsDirty || status !== 'connected'}
                                            >
                                                Save all
                                            </Button>
                                        </div>
                                    </>
                                ) : null}
                                {tab === 'source' ? (
                                    <>
                                        <div className="display:flex align-items:center gap:8px color:#8a96ab font-size:11px">
                                            <SlidersHorizontal size={14} />
                                            <span className="color:#b8c4d8">{selectionLabel}</span>
                                        </div>
                                        <div className="display:flex align-items:center gap:8px">
                                            <div
                                                className={cx(
                                                    'padding:3px_8px border-radius:999px font-size:10px text-transform:uppercase',
                                                    sourceStatusClass(sourceStatus),
                                                )}
                                            >
                                                {sourceStatus}
                                            </div>
                                            <Button
                                                className={cx(
                                                    'display:flex align-items:center gap:6px border-radius:10px padding:6px_12px font-size:11px font-weight:600 cursor:pointer',
                                                    sourceDirty
                                                        ? 'background-color:primary-20 border:1px_solid border-color:primary-70 color:primary-soft'
                                                        : 'background-color:rgba(20,24,32,0.6) border:1px_solid_rgba(80,92,112,0.4) color:#75829a',
                                                )}
                                                onClick={onSaveSource}
                                                disabled={
                                                    status !== 'connected' || !sourceDirty || sourceStatus === 'saving'
                                                }
                                            >
                                                Save file
                                            </Button>
                                        </div>
                                    </>
                                ) : null}
                            </div>
                        </Tabs.Root>
                        <div
                            className="position:absolute right:10px bottom:10px width:12px height:12px border-right:2px_solid_rgba(130,150,190,0.65) border-bottom:2px_solid_rgba(130,150,190,0.65) cursor:se-resize opacity:0.6"
                            onPointerDown={onResizeStart}
                        />
                    </Popover.Popup>
                </Popover.Positioner>
            </Popover.Portal>
        </Popover.Root>
    )
}

function PropEditorRow({
    prop,
    tokens,
    disabled,
    onChange,
    onSave,
}: {
    prop: PropRow
    tokens: TokenSnapshot | null
    disabled: boolean
    onChange: (key: string, value: string) => void
    onSave: (key: string) => void
}) {
    const propName = prop.path[0] ?? prop.label
    const tokenGroup = getTokenGroup(propName, tokens)
    const tokenOptions = tokenGroup ? flattenTokens(tokens?.tokens[tokenGroup]) : flattenAllTokens(tokens)
    const tokenPrefix = tokenGroup ? '' : '$$.token.'
    const isColor = tokenGroup === 'color' || isColorProp(propName)
    const hexValue = isColor ? normalizeHex(prop.value) : null

    return (
        <div className="display:flex flex-direction:column gap:8px padding:10px border-radius:12px background-color:rgba(18,22,30,0.8) border:1px_solid_rgba(88,102,128,0.2)">
            <div className="display:flex justify-content:space-between align-items:center">
                <div className="font-weight:600 color:#e8edf6">{prop.label}</div>
                <div className="color:#7f8aa0 font-size:10px text-transform:uppercase">{prop.kind}</div>
            </div>
            {!prop.editable ? (
                <div className="color:#6e7b8f font-size:11px">{prop.hint ?? 'Expression not editable yet.'}</div>
            ) : (
                <div className="display:flex gap:8px align-items:center">
                    {isColor ? (
                        <div className="display:flex align-items:center gap:8px flex:1">
                            <div
                                className="width:18px height:18px border-radius:6px border:1px_solid_rgba(255,255,255,0.16)"
                                style={{ background: hexValue ?? '#0f1115' }}
                            />
                            <Input
                                className="flex:1 background-color:rgba(9,12,18,0.8) border:1px_solid_rgba(88,102,128,0.35) border-radius:8px color:#eef2f7 padding:6px_8px font-size:12px"
                                value={prop.value}
                                onChange={event => onChange(prop.key, event.target.value)}
                                disabled={disabled}
                            />
                            <input
                                className="width:28px height:28px padding:0 border:1px_solid_rgba(88,102,128,0.4) background-color:transparent border-radius:8px"
                                type="color"
                                value={hexValue ?? '#000000'}
                                onChange={event => onChange(prop.key, event.target.value)}
                                disabled={disabled}
                            />
                        </div>
                    ) : (
                        <Input
                            className="flex:1 background-color:rgba(9,12,18,0.8) border:1px_solid_rgba(88,102,128,0.35) border-radius:8px color:#eef2f7 padding:6px_8px font-size:12px"
                            value={prop.value}
                            onChange={event => onChange(prop.key, event.target.value)}
                            disabled={disabled}
                        />
                    )}
                    {tokenOptions.length > 0 ? (
                        <TokenPopover
                            label="Tokens"
                            tokens={tokenOptions}
                            onSelect={value => onChange(prop.key, tokenPrefix ? `${tokenPrefix}${value}` : value)}
                        />
                    ) : null}
                    <Button
                        className="background-color:primary-20 border:1px_solid border-color:primary-60 color:primary-soft border-radius:10px padding:6px_12px cursor:pointer"
                        onClick={() => onSave(prop.key)}
                        disabled={disabled}
                    >
                        Save
                    </Button>
                </div>
            )}
        </div>
    )
}

function TokenPopover({
    label,
    tokens,
    onSelect,
}: {
    label: string
    tokens: TokenOption[]
    onSelect: (value: string) => void
}) {
    if (!tokens.length) return null
    return (
        <Popover.Root>
            <Popover.Trigger
                className="background-color:transparent border:1px_solid_rgba(88,102,128,0.4) color:#a6b2c9 border-radius:10px padding:6px_10px cursor:pointer"
                type="button"
            >
                {label}
            </Popover.Trigger>
            <Popover.Portal>
                <Popover.Positioner side="bottom" align="start" sideOffset={6}>
                    <Popover.Popup className="background-color:#0d1118 border:1px_solid_rgba(88,102,128,0.4) border-radius:12px padding:10px box-shadow:0_16px_30px_rgba(0,0,0,0.45) min-width:220px max-height:240px overflow:auto">
                        <div className="display:flex flex-direction:column gap:6px">
                            {tokens.map(token => (
                                <Popover.Close
                                    key={token.key}
                                    className="display:flex justify-content:space-between gap:8px padding:6px_8px border-radius:8px background-color:rgba(20,24,32,0.9) border:1px_solid_rgba(88,102,128,0.24) cursor:pointer"
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

function EmptyState({ title, body }: { title: string; body: string }) {
    return (
        <div className="display:flex flex-direction:column gap:6px padding:16px border-radius:14px border:1px_dashed_rgba(88,102,128,0.4)">
            <div className="font-weight:600 color:#dbe3ef">{title}</div>
            <div className="color:#7f8aa0">{body}</div>
        </div>
    )
}

function IconButton({
    label,
    onClick,
    children,
    disabled,
}: {
    label: string
    onClick?: () => void
    children: React.ReactNode
    disabled?: boolean
}) {
    return (
        <button
            className={cx(
                'width:28px height:28px border-radius:10px border:1px_solid_rgba(112,128,156,0.4) color:#c7d1e3 display:flex align-items:center justify-content:center cursor:pointer background-color:rgba(16,20,28,0.8)',
                disabled && 'opacity:0.45 cursor:not-allowed',
            )}
            onClick={onClick}
            aria-label={label}
            disabled={disabled}
        >
            {children}
        </button>
    )
}

const statusClass = (status: UiStatus) =>
    cx(
        status === 'connected' && 'background-color:rgba(0,214,136,0.18) color:#6ef3b7',
        status === 'connecting' && 'background-color:rgba(245,179,1,0.2) color:#f8d36b',
        status === 'error' && 'background-color:rgba(255,84,112,0.2) color:#ff7b91',
        status === 'idle' && 'background-color:rgba(143,150,163,0.15) color:#8f96a3',
    )

const sourceStatusClass = (status: 'idle' | 'loading' | 'saving') =>
    cx(
        status === 'loading' && 'background-color:primary-20 color:primary-soft',
        status === 'saving' && 'background-color:rgba(245,179,1,0.2) color:#f8d36b',
        status === 'idle' && 'background-color:rgba(143,150,163,0.15) color:#8f96a3',
    )

const isColorProp = (name: string) => {
    const normalized = name.replace(/[A-Z]/g, match => `-${match.toLowerCase()}`).toLowerCase()
    return (
        normalized.includes('color') ||
        normalized.includes('fill') ||
        normalized.includes('stroke') ||
        normalized === 'background' ||
        normalized === 'box-shadow' ||
        normalized === 'text-shadow'
    )
}

const normalizeHex = (value: string) => {
    if (!value) return null
    const trimmed = value.trim()
    if (!trimmed.startsWith('#')) return null
    const hex = trimmed.toLowerCase()
    if (/^#[0-9a-f]{3}$/.test(hex)) {
        return `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
    }
    if (/^#[0-9a-f]{6}$/.test(hex)) return hex
    return null
}

const getTokenGroup = (name: string, tokens: TokenSnapshot | null) => {
    if (!name || !tokens?.propGroups) return null
    const normalized = name.replace(/[A-Z]/g, match => `-${match.toLowerCase()}`).toLowerCase()
    for (const [group, props] of Object.entries(tokens.propGroups)) {
        if (props.includes(name) || props.includes(normalized)) return group
    }
    return null
}

const flattenTokens = (values?: Record<string, any>, prefix = ''): TokenOption[] => {
    if (!values || typeof values !== 'object') return []
    const entries: TokenOption[] = []
    for (const [key, value] of Object.entries(values)) {
        const nextKey = prefix ? `${prefix}.${key}` : key
        if (value && typeof value === 'object') {
            const maybeValue = (value as { value?: unknown }).value
            if (typeof maybeValue === 'string' || typeof maybeValue === 'number') {
                entries.push({ key: nextKey, value: String(maybeValue) })
                continue
            }
            entries.push(...flattenTokens(value, nextKey))
        } else {
            entries.push({ key: nextKey, value: String(value) })
        }
    }
    return entries
}

const flattenAllTokens = (tokens: TokenSnapshot | null): TokenOption[] => {
    if (!tokens?.tokens) return []
    const entries: TokenOption[] = []
    for (const [group, values] of Object.entries(tokens.tokens)) {
        entries.push(...flattenTokens(values, group))
    }
    return entries
}

const shortenPath = (value: string) => {
    const parts = value.split(/[\\/]/)
    if (parts.length <= 2) return value
    return `${parts.at(-2)}/${parts.at(-1)}`
}

const toggleButtonClass = (active: boolean) =>
    cx(
        'padding:6px_10px border-radius:999px border:1px_solid_rgba(88,102,128,0.4) cursor:pointer',
        active ? 'background-color:primary-20 color:primary-soft' : 'background-color:rgba(18,22,30,0.8) color:#9aa5b6',
    )

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

const readPanelState = (element?: Element | null): PanelState | null => {
    if (!element) return null
    const state = (element as Element & { [PANEL_STATE_KEY]?: PanelState })[PANEL_STATE_KEY]
    if (!state) return null
    if (
        typeof state.offset?.x !== 'number' ||
        typeof state.offset?.y !== 'number' ||
        typeof state.size?.width !== 'number' ||
        typeof state.size?.height !== 'number'
    ) {
        return null
    }
    if (typeof state.tab !== 'string') return null
    if (!['css', 'props', 'source'].includes(state.tab)) return null
    if (typeof state.addName !== 'string') return null
    if (typeof state.addValue !== 'string') return null
    if (
        state.addKind !== 'string' &&
        state.addKind !== 'number' &&
        state.addKind !== 'boolean' &&
        state.addKind !== 'array'
    ) {
        return null
    }
    return state
}

const writePanelState = (element: Element, state: PanelState) => {
    ;(element as Element & { [PANEL_STATE_KEY]?: PanelState })[PANEL_STATE_KEY] = {
        ...state,
    }
}
