import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { describe, expect } from 'vitest'
import * as aiPlugin from '@/ai/server'
import * as tokenPlugin from '@/use/token/server'
import * as atPlugin from '@/prop/at/server'
import * as pseudoPlugin from '@/prop/pseudo/server'
import * as bosswindPlugin from '@/prop/bosswind/server'

const createTempDir = async () => fs.mkdtemp(path.join(os.tmpdir(), 'boss-ai-'))

const waitForFile = async (filePath: string, attempts = 30) => {
    for (let i = 0; i < attempts; i += 1) {
        try {
            return await fs.readFile(filePath, 'utf8')
        } catch {
            await new Promise(resolve => setTimeout(resolve, 20))
        }
    }
    throw new Error(`Timed out waiting for ${filePath}`)
}

describe('ai plugin', () => {
    test('renders custom ai metadata sections', async ({ $ }) => {
        const baseDir = await createTempDir()
        const api = await $.createServerApi({
            baseDir,
            folder: '.bo$$',
            configDir: '.bo$$',
            plugins: [aiPlugin],
        })

        await api.trigger('onMetaData', {
            kind: 'ai',
            data: { section: 'custom', title: 'Custom', content: '- hello' },
        })

        await api.trigger('onSession', {
            phase: 'run',
            kind: 'build',
            baseDir,
            configPath: null,
            runtimePath: null,
        })

        const llmsPath = path.join(baseDir, '.bo$$', 'LLMS.md')
        const content = await waitForFile(llmsPath)
        expect(content).toContain('## Custom')
        expect(content).toContain('- hello')
        await fs.rm(baseDir, { recursive: true, force: true })
    })

    test('renders skill snippets from metadata', async ({ $ }) => {
        const baseDir = await createTempDir()
        const api = await $.createServerApi({
            baseDir,
            folder: '.bo$$',
            configDir: '.bo$$',
            plugins: [aiPlugin],
        })

        await api.trigger('onMetaData', {
            kind: 'ai',
            type: 'skill',
            data: { title: 'Extra Skills', content: '- do the thing' },
        })

        await api.trigger('onSession', {
            phase: 'run',
            kind: 'build',
            baseDir,
            configPath: null,
            runtimePath: null,
        })

        const llmsPath = path.join(baseDir, '.bo$$', 'LLMS.md')
        const content = await waitForFile(llmsPath)
        expect(content).toContain('## Extra Skills')
        expect(content).toContain('- do the thing')
        await fs.rm(baseDir, { recursive: true, force: true })
    })

    test('core plugins emit ai metadata sections', async ({ $ }) => {
        const baseDir = await createTempDir()
        const api = await $.createServerApi({
            baseDir,
            folder: '.bo$$',
            configDir: '.bo$$',
            plugins: [tokenPlugin, atPlugin, pseudoPlugin, bosswindPlugin, aiPlugin],
        })

        await api.trigger('onSession', {
            phase: 'run',
            kind: 'build',
            baseDir,
            configPath: null,
            runtimePath: null,
        })

        const llmsPath = path.join(baseDir, '.bo$$', 'LLMS.md')
        const content = await waitForFile(llmsPath)
        expect(content).toContain('## Tokens')
        expect(content).toContain('## Pseudos')
        expect(content).toContain('## At (breakpoints and media)')
        expect(content).toContain('## Bosswind')
        await fs.rm(baseDir, { recursive: true, force: true })
    })

    test('writes built-in skills as Agent Skills directories', async ({ $ }) => {
        const baseDir = await createTempDir()
        const api = await $.createServerApi({
            baseDir,
            folder: '.bo$$',
            configDir: '.bo$$',
            plugins: [aiPlugin],
        })

        await api.trigger('onSession', {
            phase: 'run',
            kind: 'build',
            baseDir,
            configPath: null,
            runtimePath: null,
        })

        const skillPath = path.join(baseDir, '.bo$$', 'skills', 'boss-css-authoring', 'SKILL.md')
        const content = await waitForFile(skillPath)
        expect(content).toContain('name: boss-css-authoring')
        expect(content).toContain('description:')
        expect(content).toContain('metadata:')
        await fs.rm(baseDir, { recursive: true, force: true })
    })

    test('includes custom skills already present in .bo$$/skills', async ({ $ }) => {
        const baseDir = await createTempDir()
        const customSkillDir = path.join(baseDir, '.bo$$', 'skills', 'custom-skill')
        await fs.mkdir(customSkillDir, { recursive: true })
        await fs.writeFile(
            path.join(customSkillDir, 'SKILL.md'),
            [
                '---',
                'name: custom-skill',
                'description: Custom boss skill for the project',
                '---',
                '# Goal',
                'Use this for custom project rules.',
                '',
            ].join('\n'),
        )

        const api = await $.createServerApi({
            baseDir,
            folder: '.bo$$',
            configDir: '.bo$$',
            plugins: [aiPlugin],
        })

        await api.trigger('onSession', {
            phase: 'run',
            kind: 'build',
            baseDir,
            configPath: null,
            runtimePath: null,
        })

        const indexPath = path.join(baseDir, '.bo$$', 'skills', 'index.json')
        const indexContent = await waitForFile(indexPath)
        expect(indexContent).toContain('custom-skill')
        await fs.rm(baseDir, { recursive: true, force: true })
    })

})
