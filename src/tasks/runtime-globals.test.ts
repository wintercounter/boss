import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { runBuild } from '@/tasks/build'
import * as reset from '@/reset/server'
import * as runtime from '@/strategy/runtime/server'

const createTempProject = async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'boss-runtime-'))
    const srcDir = path.join(root, 'src')
    await fs.mkdir(srcDir, { recursive: true })
    const entry = path.join(srcDir, 'entry.tsx')
    await fs.writeFile(entry, 'export const noop = 1\n', 'utf8')
    return { root, entry }
}

const readFileIfExists = async (filePath: string) => {
    try {
        return await fs.readFile(filePath, 'utf8')
    } catch {
        return null
    }
}

const removeDir = async (dir: string) => {
    await fs.rm(dir, { recursive: true, force: true })
}

describe('runtime.globals output', () => {
    it('inlines globals into index.js by default', async () => {
        const { root, entry } = await createTempProject()
        try {
            await runBuild(
                {
                    content: [entry],
                    plugins: [reset, runtime],
                    runtime: { only: true, strategy: 'inline-first', globals: 'inline' },
                },
                { baseDir: root },
            )

            const indexPath = path.join(root, '.bo$$', 'index.js')
            const stylesPath = path.join(root, '.bo$$', 'styles.css')
            const indexText = await readFileIfExists(indexPath)
            const stylesText = await readFileIfExists(stylesPath)

            expect(indexText).toBeTruthy()
            expect(indexText).toContain('applyGlobals')
            expect(indexText).toContain('@layer reset')
            expect(stylesText).toBeNull()
        } finally {
            await removeDir(root)
        }
    })

    it('writes styles.css when runtime.globals is file', async () => {
        const { root, entry } = await createTempProject()
        try {
            const result = await runBuild(
                {
                    content: [entry],
                    plugins: [reset, runtime],
                    runtime: { only: true, strategy: 'inline-first', globals: 'file' },
                },
                { baseDir: root },
            )

            const indexPath = path.join(root, '.bo$$', 'index.js')
            const stylesPath = path.join(root, '.bo$$', 'styles.css')
            const indexText = await readFileIfExists(indexPath)
            const stylesText = await readFileIfExists(stylesPath)

            expect(result.cssPath).toBe(stylesPath)
            expect(indexText).toBeTruthy()
            expect(indexText).toContain('./styles.css')
            expect(indexText).not.toContain('applyGlobals')
            expect(stylesText).toContain('@layer reset')
        } finally {
            await removeDir(root)
        }
    })

    it('skips globals entirely when runtime.globals is none', async () => {
        const { root, entry } = await createTempProject()
        try {
            await runBuild(
                {
                    content: [entry],
                    plugins: [reset, runtime],
                    runtime: { only: true, strategy: 'inline-first', globals: 'none' },
                },
                { baseDir: root },
            )

            const indexPath = path.join(root, '.bo$$', 'index.js')
            const stylesPath = path.join(root, '.bo$$', 'styles.css')
            const indexText = await readFileIfExists(indexPath)
            const stylesText = await readFileIfExists(stylesPath)

            expect(indexText).toBeTruthy()
            expect(indexText).not.toContain('applyGlobals')
            expect(stylesText).toBeNull()
        } finally {
            await removeDir(root)
        }
    })

})
