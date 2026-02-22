import path from 'node:path'
import fs from 'node:fs/promises'
import os from 'node:os'

import { describe, expect, it, vi } from 'vitest'

const subscribe = vi.hoisted(() =>
    vi.fn(async () => ({
        unsubscribe: vi.fn(async () => {}),
    })),
)

vi.mock('@parcel/watcher', () => ({
    default: { subscribe },
}))

import { runWatch } from '@/tasks/watch'
import type { SessionPayload } from '@/tasks/session'
import type { BossApi } from '@/types'

describe('runWatch sessions', () => {
    it('emits onSession start/run/stop', async () => {
        const root = await fs.mkdtemp(path.join(os.tmpdir(), 'boss-watch-'))
        const sourceDir = path.join(root, 'src')
        const sourceFile = path.join(sourceDir, 'app.tsx')

        await fs.mkdir(sourceDir, { recursive: true })
        await fs.writeFile(sourceFile, 'export const App = () => null', 'utf8')

        const sessions: Array<{ phase: string; kind: string }> = []
        const sessionPlugin = {
            name: 'session-spy',
            onSession: (_api: BossApi, session: SessionPayload) => {
                sessions.push({ phase: session.phase, kind: session.kind })
            },
        }

        let resolveBuild!: (value: unknown) => void
        let rejectBuild!: (reason?: unknown) => void
        const buildPromise = new Promise((resolve, reject) => {
            resolveBuild = resolve
            rejectBuild = reject
        })

        const watcher = await runWatch(
            {
                folder: path.join(root, '.bo$$'),
                content: [sourceFile],
                plugins: [sessionPlugin],
            },
            {
                baseDir: root,
                debounceMs: 0,
                onBuild: result => resolveBuild(result),
                onError: error => rejectBuild(error),
            },
        )

        await buildPromise
        await watcher.close()

        const phases = sessions
            .filter(entry => entry.kind === 'watch')
            .map(entry => entry.phase)
        expect(phases).toContain('start')
        expect(phases).toContain('run')
        expect(phases).toContain('stop')
    })
})
