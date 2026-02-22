import { describe, expect, it, beforeEach, vi } from 'vitest'

const startDevServer = vi.hoisted(() => vi.fn(async () => ({ server: { close: vi.fn() }, port: 4010 })))

vi.mock('@/dev/server', () => ({ startDevServer }))

const loadPlugin = async () => {
    const mod = await import('@/dev/plugin/server')
    return mod
}

describe('devtools plugin auto-start', () => {
    beforeEach(() => {
        vi.resetModules()
        startDevServer.mockClear()
        process.env.NODE_ENV = 'test'
    })

    it('skips auto-start when devServer.autoStart is false', async () => {
        const { onSession } = await loadPlugin()
        await onSession(
            { devServer: { autoStart: false } } as unknown as import('@/types').BossServerApi,
            { phase: 'start', kind: 'watch', baseDir: process.cwd(), configPath: null, runtimePath: null },
        )
        expect(startDevServer).not.toHaveBeenCalled()
    })

    it('auto-starts when enabled', async () => {
        const { onSession } = await loadPlugin()
        await onSession(
            { devServer: { autoStart: true } } as unknown as import('@/types').BossServerApi,
            { phase: 'start', kind: 'watch', baseDir: process.cwd(), configPath: null, runtimePath: null },
        )
        expect(startDevServer).toHaveBeenCalledTimes(1)
    })
})
