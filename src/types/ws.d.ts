declare module 'ws' {
    export type RawData = string | ArrayBuffer | Buffer

    export class WebSocket {
        on(event: string, listener: (...args: any[]) => void): this
        send(data: RawData): void
        close(): void
        readyState: number
    }

    export class WebSocketServer {
        constructor(options?: { port?: number; host?: string })
        on(event: string, listener: (...args: any[]) => void): this
        once(event: string, listener: (...args: any[]) => void): this
        removeListener(event: string, listener: (...args: any[]) => void): this
        close(): void
    }
}
