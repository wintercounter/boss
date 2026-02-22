import * as React from 'react'

import { CanvasOverlay } from './canvas/CanvasOverlay'
import { DevtoolsPanel } from './ui/DevtoolsPanel'
import { Toast } from './ui/Toast'
import { BOSS_ATTR, DEVTOOLS_ATTR } from './constants'
import { createSourceResolver } from './source'
import { findBossFiber, getBossElement, getFiberForElement, getHostElement, parseBossData } from './dom'
import { useDevSocket } from './ws'
import type { PropEntry, PropRow, SelectionState, SourceLocation, TokenSnapshot } from './types'
import { toCamelCase, toDashCase } from './ui/css/properties'

type DevtoolsAppProps = {
    port: number
}

export function DevtoolsApp({ port }: DevtoolsAppProps) {
    const [props, setProps] = React.useState<PropRow[]>([])
    const [propsBaseline, setPropsBaseline] = React.useState<Record<string, string>>({})
    const [open, setOpen] = React.useState(false)
    const [toast, setToast] = React.useState<string | null>(null)
    const [hoverRects, setHoverRects] = React.useState<DOMRect[]>([])
    const [selectedRects, setSelectedRects] = React.useState<DOMRect[]>([])
    const [selection, setSelection] = React.useState<SelectionState | null>(null)
    const [tokens, setTokens] = React.useState<TokenSnapshot | null>(null)
    const [bossTypes, setBossTypes] = React.useState<string | null>(null)
    const [sourceText, setSourceText] = React.useState('')
    const [sourceDirty, setSourceDirty] = React.useState(false)
    const [sourceStatus, setSourceStatus] = React.useState<'idle' | 'loading' | 'saving'>('idle')
    const [hostApi, setHostApi] = React.useState<{
        dictionary?: { toValue?: (value: unknown, prop?: string) => unknown }
    } | null>(null)

    const selectionRef = React.useRef<SelectionState | null>(null)
    const hoverElementRef = React.useRef<Element | null>(null)
    const selectedElementRef = React.useRef<Element | null>(null)
    const ctrlDownRef = React.useRef(false)
    const toastTimeoutRef = React.useRef<number | null>(null)
    const bossTypesLoadedRef = React.useRef(false)

    const showToast = React.useCallback((message: string) => {
        setToast(message)
        if (toastTimeoutRef.current) {
            window.clearTimeout(toastTimeoutRef.current)
        }
        toastTimeoutRef.current = window.setTimeout(() => {
            setToast(null)
        }, 8000)
    }, [])

    const handleDevMessage = React.useCallback((message: any, socket: WebSocket) => {
        if (!message || message.type !== 'eval-client') return
        const id = typeof message.id === 'number' ? message.id : null
        const code = typeof message.code === 'string' ? message.code : ''
        if (id === null || !code) {
            socket.send(JSON.stringify({ type: 'eval-client-result', id, ok: false, error: 'Missing code.' }))
            return
        }
        const run = async () => {
            try {
                const fn = new Function(code) as () => unknown
                const result = await Promise.resolve(fn())
                socket.send(JSON.stringify({ type: 'eval-client-result', id, ok: true, result }))
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error)
                socket.send(JSON.stringify({ type: 'eval-client-result', id, ok: false, error: message }))
            }
        }
        void run()
    }, [])

    const { status, ensureConnected, sendRequest } = useDevSocket(port, showToast, {
        onConnect: socket => {
            socket.send(JSON.stringify({ type: 'hello', role: 'devtools', page: window.location.href }))
        },
        onMessage: handleDevMessage,
    })

    const readFile = React.useCallback(
        async (path: string) => {
            try {
                const response = await sendRequest({ type: 'read-file', path })
                return typeof response?.content === 'string' ? response.content : null
            } catch {
                return null
            }
        },
        [sendRequest],
    )

    const resolver = React.useMemo(() => createSourceResolver(readFile), [readFile])

    const refreshProps = React.useCallback(
        async (source: SourceLocation) => {
            const response = await sendRequest({ type: 'select', source })
            const entries = (response?.props as PropEntry[]) ?? []
            return buildPropRows(entries)
        },
        [sendRequest],
    )

    const setPropsFromServer = React.useCallback((rows: PropRow[]) => {
        setProps(rows)
        setPropsBaseline(buildPropsBaseline(rows))
    }, [])

    const loadTokens = React.useCallback(async () => {
        try {
            const response = await sendRequest({ type: 'tokens' })
            const snapshot = response?.tokens as TokenSnapshot | undefined
            if (snapshot) setTokens(snapshot)
        } catch {
            setTokens(null)
        }
    }, [sendRequest])

    const loadBossTypes = React.useCallback(async () => {
        if (bossTypesLoadedRef.current) return
        try {
            const response = await sendRequest({ type: 'boss-types' })
            const content = typeof response?.content === 'string' ? response.content : null
            setBossTypes(content)
            bossTypesLoadedRef.current = true
        } catch {
            bossTypesLoadedRef.current = false
        }
    }, [sendRequest])

    const loadSourceText = React.useCallback(
        async (source: SourceLocation) => {
            setSourceStatus('loading')
            try {
                const response = await sendRequest({ type: 'read-file', path: source.fileName })
                const content = typeof response?.content === 'string' ? response.content : ''
                if (selectionRef.current?.source.fileName === source.fileName) {
                    setSourceText(content)
                    setSourceDirty(false)
                }
            } finally {
                setSourceStatus('idle')
            }
        },
        [sendRequest],
    )

    const syncSelection = React.useCallback(
        async ({
            refreshSource,
            refreshProps: shouldRefreshProps,
        }: {
            refreshSource?: boolean
            refreshProps?: boolean
        }) => {
            const activeSelection = selectionRef.current
            if (!activeSelection) return

            if (refreshSource && !sourceDirty) {
                await loadSourceText(activeSelection.source)
            }

            if (shouldRefreshProps) {
                try {
                    const rows = await refreshProps(activeSelection.source)
                    if (selectionRef.current?.source === activeSelection.source) {
                        setPropsFromServer(rows)
                    }
                } catch (error) {
                    const message = error instanceof Error ? error.message : 'Failed to read props for this element.'
                    showToast(message)
                }
            }
        },
        [loadSourceText, refreshProps, setPropsFromServer, showToast, sourceDirty],
    )

    const updateSelectionVisuals = React.useCallback((element: Element | null) => {
        if (!element) {
            selectedElementRef.current = null
            setSelectedRects([])
            return
        }
        selectedElementRef.current = element
        setSelectedRects(getElementRects(element))
    }, [])

    const updateHoverVisuals = React.useCallback((element: Element | null) => {
        if (!element) {
            hoverElementRef.current = null
            setHoverRects([])
            return
        }
        hoverElementRef.current = element
        setHoverRects(getElementRects(element))
    }, [])

    const refreshOverlay = React.useCallback(() => {
        if (selectedElementRef.current) {
            updateSelectionVisuals(selectedElementRef.current)
        }
        if (hoverElementRef.current) {
            updateHoverVisuals(hoverElementRef.current)
        }
    }, [updateSelectionVisuals, updateHoverVisuals])

    const onChange = React.useCallback((key: string, value: string) => {
        setProps(current =>
            current.map(prop =>
                prop.key === key
                    ? {
                          ...prop,
                          value,
                      }
                    : prop,
            ),
        )
    }, [])

    const onClose = React.useCallback(() => {
        setOpen(false)
    }, [])

    const onSave = React.useCallback(
        (key: string) => {
            const activeSelection = selectionRef.current
            if (!activeSelection) return
            const prop = props.find(item => item.key === key)
            if (!prop) return
            void submitEdit(activeSelection, prop, sendRequest, showToast).then(() => {
                void syncSelection({ refreshSource: true, refreshProps: true })
            })
        },
        [props, sendRequest, showToast, syncSelection],
    )

    const onSaveStyles = React.useCallback(
        async (changes: Array<{ prop: string; value: string }>) => {
            const activeSelection = selectionRef.current
            if (!activeSelection || changes.length === 0) return

            try {
                const propIndex = new Map<string, PropRow>()
                for (const prop of props) {
                    const name = prop.path[0]
                    if (!name) continue
                    propIndex.set(toDashCase(name), prop)
                    propIndex.set(name, prop)
                }

                for (const change of changes) {
                    const normalized = toDashCase(change.prop)
                    const existing = propIndex.get(normalized) ?? propIndex.get(change.prop)
                    if (!existing && change.value === '') continue
                    const path = existing?.path ?? [toCamelCase(normalized)]
                    const kind = existing?.kind === 'string' ? inferKind(change.value) : existing?.kind ?? inferKind(change.value)
                    const type = existing ? 'edit' : 'add-prop'
                    await sendRequest({
                        type,
                        source: activeSelection.source,
                        path,
                        value: change.value,
                        kind,
                    })
                }

                void syncSelection({ refreshSource: true, refreshProps: true })
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Failed to save CSS changes.'
                showToast(message)
            }
        },
        [props, sendRequest, showToast, syncSelection],
    )

    const onAddProp = React.useCallback(
        async (name: string, value: string, kind: string) => {
            const activeSelection = selectionRef.current
            if (!activeSelection) return
            const trimmed = name.trim()
            if (!trimmed) return
            if (trimmed.includes('.')) {
                showToast('Nested props are not supported yet.')
                return
            }

            try {
                await sendRequest({
                    type: 'add-prop',
                    source: activeSelection.source,
                    path: [trimmed],
                    value,
                    kind,
                })
                void syncSelection({ refreshSource: true, refreshProps: true })
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Failed to add prop.'
                showToast(message)
            }
        },
        [sendRequest, showToast, syncSelection],
    )

    const onSourceChange = React.useCallback((next: string) => {
        setSourceText(next)
        setSourceDirty(true)
    }, [])

    const onSaveSource = React.useCallback(async () => {
        const activeSelection = selectionRef.current
        if (!activeSelection) return
        setSourceStatus('saving')
        try {
            await sendRequest({
                type: 'write-file',
                path: activeSelection.source.fileName,
                content: sourceText,
            })
            setSourceDirty(false)
            void syncSelection({ refreshProps: true })
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to write file.'
            showToast(message)
        } finally {
            setSourceStatus('idle')
        }
    }, [sendRequest, showToast, sourceText])

    const resolveSource = React.useCallback(
        async (selectionElement: Element, bossData: any): Promise<SourceLocation | null> => {
            let candidates: SourceLocation[] = []
            if (bossData?.source) {
                candidates = [bossData.source]
            } else {
                const fiber = getFiberForElement(selectionElement)
                const bossFiber = findBossFiber(fiber)
                candidates = resolver.collectSourceCandidates(bossFiber ?? fiber)
                if (bossFiber && bossFiber !== fiber) {
                    candidates = candidates.concat(resolver.collectSourceCandidates(bossFiber))
                }
            }

            const resolved = await resolver.resolveSourceFromCandidates(candidates)
            if (resolved) return resolved

            const fiber = getFiberForElement(selectionElement)
            const bossFiber = findBossFiber(fiber)
            console.log('boss devtools: missing source', {
                bossData,
                selectionTag: selectionElement.tagName,
                fiber: resolver.describeFiber(fiber),
                bossFiber: resolver.describeFiber(bossFiber),
                stacks: resolver.collectStackSamples(fiber, bossFiber),
            })
            showToast('Boss devtools needs React dev source maps.')
            return null
        },
        [resolver, showToast],
    )

    React.useEffect(() => {
        if (status !== 'connected') return
        void loadBossTypes()
    }, [loadBossTypes, status])

    React.useEffect(() => {
        if (!open) return
        const host = (globalThis as typeof globalThis & {
            host$$?: unknown
        }).host$$
        if (host && typeof host === 'object') {
            if ('dictionary' in host) {
                setHostApi(host as { dictionary?: { toValue?: (value: unknown, prop?: string) => unknown } })
                return
            }
            if ('api' in host && (host as { api?: unknown }).api && typeof (host as { api?: unknown }).api === 'object') {
                setHostApi(
                    (host as { api?: { dictionary?: { toValue?: (value: unknown, prop?: string) => unknown } } }).api ??
                        null,
                )
                return
            }
        }
        setHostApi(null)
    }, [open, status])

    React.useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Control') return
            if (ctrlDownRef.current) return
            ctrlDownRef.current = true
            void ensureConnected()
        }

        const onKeyUp = (event: KeyboardEvent) => {
            if (event.key !== 'Control') return
            ctrlDownRef.current = false
            updateHoverVisuals(null)
        }

        window.addEventListener('keydown', onKeyDown, true)
        window.addEventListener('keyup', onKeyUp, true)
        return () => {
            window.removeEventListener('keydown', onKeyDown, true)
            window.removeEventListener('keyup', onKeyUp, true)
        }
    }, [ensureConnected, updateHoverVisuals])

    React.useEffect(() => {
        const onPointerMove = (event: PointerEvent) => {
            if (!ctrlDownRef.current && !event.ctrlKey) return
            if (event.ctrlKey && !ctrlDownRef.current) ctrlDownRef.current = true

            const target = document.elementFromPoint(event.clientX, event.clientY)
            if (!target || isDevtoolsElement(target)) {
                updateHoverVisuals(null)
                return
            }

            const bossElement = getBossElement(target)
            if (bossElement) {
                updateHoverVisuals(bossElement)
                return
            }

            const fiber = getFiberForElement(target)
            const bossFiber = findBossFiber(fiber)
            if (!bossFiber) {
                updateHoverVisuals(null)
                return
            }

            const hostElement = getHostElement(bossFiber) ?? target
            updateHoverVisuals(hostElement)
        }

        const onPointerDown = async (event: PointerEvent) => {
            if (!ctrlDownRef.current && !event.ctrlKey) return

            const target = event.target as Element | null
            if (!target || isDevtoolsElement(target)) return

            const bossElement = getBossElement(target)
            let selectionElement = bossElement

            if (!selectionElement) {
                const fiber = getFiberForElement(target)
                const bossFiber = findBossFiber(fiber)
                if (!bossFiber) return
                selectionElement = getHostElement(bossFiber) ?? target
            }
            if (!selectionElement) return

            event.preventDefault()
            event.stopPropagation()

            const bossData = parseBossData(selectionElement.getAttribute(BOSS_ATTR))
            const source = await resolveSource(selectionElement, bossData)
            if (!source) return

            const nextSelection = { element: selectionElement, source }
            selectionRef.current = nextSelection
            setOpen(true)
            setProps([])
            setPropsBaseline({})
            setSelection(nextSelection)
            updateSelectionVisuals(selectionElement)
            void loadBossTypes()
            void loadTokens()
            void loadSourceText(source)

            try {
                const rows = await refreshProps(source)
                if (selectionRef.current?.source !== source) return
                setPropsFromServer(rows)
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Failed to read props for this element.'
                showToast(message)
            }
        }

        const onContextMenu = (event: MouseEvent) => {
            if (!ctrlDownRef.current && !event.ctrlKey) return
            event.preventDefault()
            event.stopPropagation()
        }

        const onScroll = () => {
            if (!selectionRef.current && !hoverElementRef.current) return
            refreshOverlay()
        }

        const onResize = () => {
            refreshOverlay()
        }

        window.addEventListener('pointermove', onPointerMove, true)
        window.addEventListener('pointerdown', onPointerDown, true)
        window.addEventListener('contextmenu', onContextMenu, true)
        window.addEventListener('scroll', onScroll, true)
        window.addEventListener('resize', onResize)

        return () => {
            window.removeEventListener('pointermove', onPointerMove, true)
            window.removeEventListener('pointerdown', onPointerDown, true)
            window.removeEventListener('contextmenu', onContextMenu, true)
            window.removeEventListener('scroll', onScroll, true)
            window.removeEventListener('resize', onResize)
        }
    }, [refreshOverlay, resolveSource, sendRequest, showToast, updateHoverVisuals, updateSelectionVisuals])

    return (
        <div
            data-boss-devtools="true"
            style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 2147483645 }}
        >
            <CanvasOverlay hoverRects={hoverRects} selectedRects={selectedRects} />
            <DevtoolsPanel
                open={open}
                props={props}
                propsBaseline={propsBaseline}
                status={status}
                selection={selection}
                tokens={tokens}
                bossTypes={bossTypes}
                sourceText={sourceText}
                sourceDirty={sourceDirty}
                sourceStatus={sourceStatus}
                onClose={onClose}
                onChange={onChange}
                onSave={onSave}
                onAddProp={onAddProp}
                onSourceChange={onSourceChange}
                onSaveSource={onSaveSource}
                onSaveStyles={onSaveStyles}
                hostApi={hostApi}
            />
            <Toast message={toast} />
        </div>
    )
}

function isDevtoolsElement(element: Element) {
    return Boolean(element.closest(`[${DEVTOOLS_ATTR}]`))
}

function buildPropRows(props: PropEntry[]): PropRow[] {
    return props.map(prop => {
        const label = prop.path.join('.')
        const value = formatPropValue(prop)
        return {
            key: JSON.stringify(prop.path),
            path: prop.path,
            label,
            value,
            editable: prop.editable,
            kind: prop.kind,
            hint: prop.code,
        }
    })
}

function buildPropsBaseline(rows: PropRow[]) {
    const baseline: Record<string, string> = {}
    for (const row of rows) {
        baseline[row.key] = row.value
    }
    return baseline
}

function formatPropValue(prop: PropEntry) {
    if (Array.isArray(prop.value)) {
        return JSON.stringify(prop.value)
    }
    if (prop.value === null || prop.value === undefined) {
        return prop.code ?? ''
    }
    return String(prop.value)
}

function inferKind(value: string) {
    const trimmed = value.trim()
    if (trimmed === 'true' || trimmed === 'false') return 'boolean'
    if (/^-?\\d+(?:\\.\\d+)?$/.test(trimmed)) return 'number'
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) return 'array'
    return 'string'
}

async function submitEdit(
    activeSelection: SelectionState,
    prop: PropRow,
    sendRequest: (payload: any) => Promise<any>,
    showToast: (message: string) => void,
) {
    try {
        await sendRequest({
            type: 'edit',
            source: activeSelection.source,
            path: JSON.parse(prop.key),
            value: prop.value,
            kind: prop.kind,
        })
    } catch {
        showToast('Failed to update prop. Check dev server logs.')
    }
}

function getElementRects(element: Element) {
    return Array.from(element.getClientRects())
}
