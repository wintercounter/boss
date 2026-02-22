import { useCallback, useEffect, useRef, useState } from 'react'
import type { UiStatus } from './types'

type PendingRequest = {
    resolve: (value: any) => void
    reject: (error: Error) => void
}

type DevSocketState = {
    status: UiStatus
    ensureConnected: () => Promise<WebSocket | null>
    sendRequest: (payload: any) => Promise<any>
}

type DevSocketOptions = {
    onConnect?: (socket: WebSocket) => void
    onMessage?: (message: any, socket: WebSocket) => void
}

export function useDevSocket(
    port: number | null,
    onToast: (message: string) => void,
    options: DevSocketOptions = {},
): DevSocketState {
    const [status, setStatusState] = useState<UiStatus>('idle')
    const socketRef = useRef<WebSocket | null>(null)
    const portRef = useRef<number | null>(port)
    const socketTokenRef = useRef(0)
    const pendingRef = useRef(new Map<number, PendingRequest>())
    const requestIdRef = useRef(0)
    const optionsRef = useRef(options)
    optionsRef.current = options

    const setStatus = useCallback((next: UiStatus) => {
        setStatusState(next)
    }, [])

    const clearPending = useCallback((errorMessage: string) => {
        const error = new Error(errorMessage)
        for (const handler of pendingRef.current.values()) {
            handler.reject(error)
        }
        pendingRef.current.clear()
    }, [])

    const disconnect = useCallback(() => {
        if (socketRef.current) {
            socketTokenRef.current += 1
            socketRef.current.close()
            socketRef.current = null
        }
        clearPending('Dev server disconnected.')
        setStatus('idle')
    }, [clearPending, setStatus])

    const connect = useCallback(async () => {
        const activePort = portRef.current
        if (!activePort) return null

        const existing = socketRef.current
        if (existing && existing.readyState === WebSocket.OPEN) return existing
        if (existing && existing.readyState === WebSocket.CONNECTING) return existing

        setStatus('connecting')

        try {
            const socket = await connectToServer(activePort)
            const token = ++socketTokenRef.current
            socketRef.current = socket
            setStatus('connected')
            optionsRef.current.onConnect?.(socket)

            socket.addEventListener('message', event => {
                let message: any
                try {
                    message = JSON.parse(event.data)
                } catch {
                    return
                }

                if (message?.id && pendingRef.current.has(message.id)) {
                    const handler = pendingRef.current.get(message.id)
                    pendingRef.current.delete(message.id)

                    if (message.type === 'error') {
                        handler?.reject(new Error(message.message || 'Unknown error'))
                    } else {
                        handler?.resolve(message)
                    }
                    return
                }

                optionsRef.current.onMessage?.(message, socket)
            })

            socket.addEventListener('close', () => {
                if (token !== socketTokenRef.current) return
                socketRef.current = null
                setStatus('error')
                clearPending('Dev server disconnected.')
            })

            return socket
        } catch {
            socketRef.current = null
            setStatus('error')
            onToast('Boss dev server not found. Run `boss dev`.')
            return null
        }
    }, [clearPending, onToast, setStatus])

    const ensureConnected = useCallback(async () => {
        const existing = socketRef.current
        if (existing && existing.readyState === WebSocket.OPEN) return existing
        return connect()
    }, [connect])

    const sendRequest = useCallback(
        async (payload: any) => {
            const socket = await ensureConnected()
            if (!socket || socket.readyState !== WebSocket.OPEN) {
                throw new Error('No dev server connection. Run `boss dev`.')
            }

            const id = ++requestIdRef.current
            const message = { id, ...payload }
            const promise = new Promise((resolve, reject) => {
                pendingRef.current.set(id, { resolve, reject })
            })

            socket.send(JSON.stringify(message))

            return promise
        },
        [ensureConnected],
    )

    useEffect(() => {
        portRef.current = port
        disconnect()
        if (port) {
            void ensureConnected()
        }
        return () => {
            disconnect()
        }
    }, [port, disconnect, ensureConnected])

    return { status, ensureConnected, sendRequest }
}

const connectToServer = (port: number) => {
    return new Promise<WebSocket>((resolve, reject) => {
        let settled = false
        const socket = new WebSocket(`ws://localhost:${port}`)
        const timeout = window.setTimeout(() => {
            if (settled) return
            settled = true
            socket.close()
            reject(new Error('Connection timed out'))
        }, 800)

        socket.addEventListener('open', () => {
            if (settled) return
            settled = true
            window.clearTimeout(timeout)
            resolve(socket)
        })

        socket.addEventListener('error', () => {
            if (settled) return
            settled = true
            window.clearTimeout(timeout)
            reject(new Error('Unable to connect'))
        })
    })
}
