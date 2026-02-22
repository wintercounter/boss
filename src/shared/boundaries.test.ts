import path from 'node:path'
import fs from 'node:fs/promises'
import os from 'node:os'

import { describe, expect, it, vi } from 'vitest'

import { CSS } from '@/api/css'
import { resolveBoundaryOutputs } from '@/shared/boundaries'
import { createLogStub } from '@/testing/logger'

const createApi = () => {
    const api: any = {
        selectorScope: null,
        log: createLogStub(),
        dictionary: {
            toValue: (value: unknown) => value,
        },
    }
    api.css = new CSS(api)
    return api
}

const createTempDir = async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'boss-boundaries-'))
    return dir
}

describe('css boundaries', () => {
    it('returns global output when no boundaries exist', async () => {
        const root = await createTempDir()
        const stylesheetPath = path.join(root, '.bo$$', 'styles.css')
        const api = createApi()
        api.css.addRule('.a { color: red }', null, path.join(root, 'src', 'a.tsx'))

        const result = await resolveBoundaryOutputs(api, { rootDir: root, stylesheetPath })
        expect(result.hasBoundaries).toBe(false)
        expect(result.outputs).toHaveLength(1)
        expect(result.outputs[0].path).toBe(path.resolve(stylesheetPath))
        expect(result.outputs[0].text).toContain('.a { color: red }')
    })

    it('splits rules across boundaries and hoists shared rules', async () => {
        const root = await createTempDir()
        const stylesheetPath = path.join(root, '.bo$$', 'styles.css')
        const appDir = path.join(root, 'app')
        const adminDir = path.join(root, 'admin')
        const appBoundary = path.join(appDir, 'app.boss.css')
        const adminBoundary = path.join(adminDir, 'admin.boss.css')

        await fs.mkdir(appDir, { recursive: true })
        await fs.mkdir(adminDir, { recursive: true })
        await fs.writeFile(appBoundary, '', 'utf8')
        await fs.writeFile(adminBoundary, '', 'utf8')

        const api = createApi()
        api.css.addRule('.app { color: red }', null, path.join(appDir, 'page.tsx'))
        api.css.addRule('.admin { color: blue }', null, path.join(adminDir, 'page.tsx'))
        api.css.addRule('.shared { color: green }', null, path.join(appDir, 'shared.tsx'))
        api.css.addRule('.shared { color: green }', null, path.join(adminDir, 'shared.tsx'))

        api.css.addRoot('--app-token: 1;', path.join(appDir, 'page.tsx'))
        api.css.addRoot('--admin-token: 2;', path.join(adminDir, 'page.tsx'))

        const result = await resolveBoundaryOutputs(api, { rootDir: root, stylesheetPath })
        const outputs = new Map(result.outputs.map(output => [path.resolve(output.path), output.text]))

        const appText = outputs.get(path.resolve(appBoundary)) ?? ''
        const adminText = outputs.get(path.resolve(adminBoundary)) ?? ''
        const globalText = outputs.get(path.resolve(stylesheetPath)) ?? ''

        expect(appText).toContain('.app { color: red }')
        expect(adminText).toContain('.admin { color: blue }')
        expect(globalText).toContain('.shared { color: green }')
        expect(appText).not.toContain('.shared { color: green }')
        expect(adminText).not.toContain('.shared { color: green }')

        expect(appText).toContain('--app-token: 1;')
        expect(adminText).toContain('--admin-token: 2;')
        expect(globalText).not.toContain('--app-token: 1;')
    })

    it('hoists to the nearest common ancestor boundary', async () => {
        const root = await createTempDir()
        const stylesheetPath = path.join(root, '.bo$$', 'styles.css')
        const appDir = path.join(root, 'app')
        const adminDir = path.join(root, 'app', 'admin')
        const ancestorBoundary = path.join(appDir, 'app.boss.css')
        const adminBoundary = path.join(adminDir, 'admin.boss.css')

        await fs.mkdir(adminDir, { recursive: true })
        await fs.writeFile(ancestorBoundary, '', 'utf8')
        await fs.writeFile(adminBoundary, '', 'utf8')

        const api = createApi()
        api.css.addRule('.shared { color: green }', null, path.join(appDir, 'page.tsx'))
        api.css.addRule('.shared { color: green }', null, path.join(adminDir, 'page.tsx'))

        const result = await resolveBoundaryOutputs(api, { rootDir: root, stylesheetPath })
        const outputs = new Map(result.outputs.map(output => [path.resolve(output.path), output.text]))

        const ancestorText = outputs.get(path.resolve(ancestorBoundary)) ?? ''
        const adminText = outputs.get(path.resolve(adminBoundary)) ?? ''
        const globalText = outputs.get(path.resolve(stylesheetPath)) ?? ''

        expect(ancestorText).toContain('.shared { color: green }')
        expect(adminText).not.toContain('.shared { color: green }')
        expect(globalText).not.toContain('.shared { color: green }')
    })

    it('respects criticality thresholds', async () => {
        const root = await createTempDir()
        const stylesheetPath = path.join(root, '.bo$$', 'styles.css')
        const leftDir = path.join(root, 'left')
        const rightDir = path.join(root, 'right')
        const leftBoundary = path.join(leftDir, 'left.boss.css')
        const rightBoundary = path.join(rightDir, 'right.boss.css')

        await fs.mkdir(leftDir, { recursive: true })
        await fs.mkdir(rightDir, { recursive: true })
        await fs.writeFile(leftBoundary, '', 'utf8')
        await fs.writeFile(rightBoundary, '', 'utf8')

        const api = createApi()
        api.css.addRule('.shared { color: green }', null, path.join(leftDir, 'page.tsx'))
        api.css.addRule('.shared { color: green }', null, path.join(rightDir, 'page.tsx'))

        const result = await resolveBoundaryOutputs(api, {
            rootDir: root,
            stylesheetPath,
            boundaries: { criticality: 3 },
        })
        const outputs = new Map(result.outputs.map(output => [path.resolve(output.path), output.text]))

        const leftText = outputs.get(path.resolve(leftBoundary)) ?? ''
        const rightText = outputs.get(path.resolve(rightBoundary)) ?? ''
        const globalText = outputs.get(path.resolve(stylesheetPath)) ?? ''

        expect(leftText).toContain('.shared { color: green }')
        expect(rightText).toContain('.shared { color: green }')
        expect(globalText).not.toContain('.shared { color: green }')
    })

    it('deduplicates identical rules within the same boundary', async () => {
        const root = await createTempDir()
        const stylesheetPath = path.join(root, '.bo$$', 'styles.css')
        const areaDir = path.join(root, 'area')
        const boundary = path.join(areaDir, 'area.boss.css')

        await fs.mkdir(areaDir, { recursive: true })
        await fs.writeFile(boundary, '', 'utf8')

        const api = createApi()
        api.css.addRule('.same { color: red }', null, path.join(areaDir, 'a.tsx'))
        api.css.addRule('.same {  color: red; }', null, path.join(areaDir, 'b.tsx'))

        const result = await resolveBoundaryOutputs(api, { rootDir: root, stylesheetPath })
        const outputs = new Map(result.outputs.map(output => [path.resolve(output.path), output.text]))
        const boundaryText = outputs.get(path.resolve(boundary)) ?? ''
        const globalText = outputs.get(path.resolve(stylesheetPath)) ?? ''

        const matches = boundaryText.match(/\.same\s*\{\s*color:\s*red/g) ?? []
        expect(matches.length).toBe(1)
        expect(boundaryText).toContain('.same { color: red }')
        expect(globalText).not.toContain('.same { color: red }')
    })

    it('ignores node_modules boundaries by default', async () => {
        const root = await createTempDir()
        const stylesheetPath = path.join(root, '.bo$$', 'styles.css')
        const nodeBoundaryDir = path.join(root, 'node_modules', 'pkg')
        const nodeBoundary = path.join(nodeBoundaryDir, 'pkg.boss.css')

        await fs.mkdir(nodeBoundaryDir, { recursive: true })
        await fs.writeFile(nodeBoundary, '', 'utf8')

        const api = createApi()
        api.css.addRule('.pkg { color: red }', null, path.join(nodeBoundaryDir, 'index.ts'))

        const result = await resolveBoundaryOutputs(api, { rootDir: root, stylesheetPath })
        expect(result.hasBoundaries).toBe(false)
        expect(result.outputs).toHaveLength(1)
        expect(result.outputs[0].text).toContain('.pkg { color: red }')
    })

    it('hoists shared at-rules across boundaries', async () => {
        const root = await createTempDir()
        const stylesheetPath = path.join(root, '.bo$$', 'styles.css')
        const leftDir = path.join(root, 'left')
        const rightDir = path.join(root, 'right')
        const leftBoundary = path.join(leftDir, 'left.boss.css')
        const rightBoundary = path.join(rightDir, 'right.boss.css')

        await fs.mkdir(leftDir, { recursive: true })
        await fs.mkdir(rightDir, { recursive: true })
        await fs.writeFile(leftBoundary, '', 'utf8')
        await fs.writeFile(rightBoundary, '', 'utf8')

        const api = createApi()
        const query = '@media screen and (min-width: 640px)'
        api.css.addRule('.shared { color: green }', query, path.join(leftDir, 'page.tsx'))
        api.css.addRule('.shared { color: green }', query, path.join(rightDir, 'page.tsx'))

        const result = await resolveBoundaryOutputs(api, { rootDir: root, stylesheetPath })
        const outputs = new Map(result.outputs.map(output => [path.resolve(output.path), output.text]))
        const leftText = outputs.get(path.resolve(leftBoundary)) ?? ''
        const rightText = outputs.get(path.resolve(rightBoundary)) ?? ''
        const globalText = outputs.get(path.resolve(stylesheetPath)) ?? ''

        expect(globalText).toContain('@media screen and (min-width: 640px) { .shared { color: green } }')
        expect(leftText).not.toContain('.shared { color: green }')
        expect(rightText).not.toContain('.shared { color: green }')
    })

    it('uses the first boundary in a directory and warns', async () => {
        const root = await createTempDir()
        const stylesheetPath = path.join(root, '.bo$$', 'styles.css')
        const areaDir = path.join(root, 'area')
        const firstBoundary = path.join(areaDir, 'a.boss.css')
        const secondBoundary = path.join(areaDir, 'b.boss.css')

        await fs.mkdir(areaDir, { recursive: true })
        await fs.writeFile(firstBoundary, '', 'utf8')
        await fs.writeFile(secondBoundary, '', 'utf8')

        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
        const api = createApi()
        api.css.addRule('.area { color: red }', null, path.join(areaDir, 'page.tsx'))

        const result = await resolveBoundaryOutputs(api, { rootDir: root, stylesheetPath })

        const outputs = new Map(result.outputs.map(output => [path.resolve(output.path), output.text]))
        const firstText = outputs.get(path.resolve(firstBoundary)) ?? ''
        const secondText = outputs.get(path.resolve(secondBoundary)) ?? ''

        expect(firstText).toContain('.area { color: red }')
        expect(secondText).not.toContain('.area { color: red }')
        expect(warnSpy).toHaveBeenCalled()
        warnSpy.mockRestore()
    })

    it('keeps root declarations local when not shared and hoists shared roots', async () => {
        const root = await createTempDir()
        const stylesheetPath = path.join(root, '.bo$$', 'styles.css')
        const leftDir = path.join(root, 'left')
        const rightDir = path.join(root, 'right')
        const leftBoundary = path.join(leftDir, 'left.boss.css')
        const rightBoundary = path.join(rightDir, 'right.boss.css')

        await fs.mkdir(leftDir, { recursive: true })
        await fs.mkdir(rightDir, { recursive: true })
        await fs.writeFile(leftBoundary, '', 'utf8')
        await fs.writeFile(rightBoundary, '', 'utf8')

        const api = createApi()
        api.css.addRoot('--local-left: 1;', path.join(leftDir, 'page.tsx'))
        api.css.addRoot('--shared: 2;', path.join(leftDir, 'page.tsx'))
        api.css.addRoot('--shared: 2;', path.join(rightDir, 'page.tsx'))

        const result = await resolveBoundaryOutputs(api, { rootDir: root, stylesheetPath })
        const outputs = new Map(result.outputs.map(output => [path.resolve(output.path), output.text]))
        const leftText = outputs.get(path.resolve(leftBoundary)) ?? ''
        const rightText = outputs.get(path.resolve(rightBoundary)) ?? ''
        const globalText = outputs.get(path.resolve(stylesheetPath)) ?? ''

        expect(leftText).toContain('--local-left: 1;')
        expect(rightText).not.toContain('--local-left: 1;')
        expect(globalText).toContain('--shared: 2;')
    })

    it('orders base rules before at-rules and preserves at-rule sort', async () => {
        const root = await createTempDir()
        const stylesheetPath = path.join(root, '.bo$$', 'styles.css')
        const areaDir = path.join(root, 'area')
        const boundary = path.join(areaDir, 'area.boss.css')

        await fs.mkdir(areaDir, { recursive: true })
        await fs.writeFile(boundary, '', 'utf8')

        const api = createApi()
        const minQuery = '@media screen and (min-width: 1024px)'
        const maxQuery = '@media screen and (max-width: 640px)'
        api.css.addRule('.base { color: red }', null, path.join(areaDir, 'page.tsx'))
        api.css.addRule('.min { color: blue }', minQuery, path.join(areaDir, 'page.tsx'))
        api.css.addRule('.max { color: green }', maxQuery, path.join(areaDir, 'page.tsx'))

        const result = await resolveBoundaryOutputs(api, { rootDir: root, stylesheetPath })
        const outputs = new Map(result.outputs.map(output => [path.resolve(output.path), output.text]))
        const text = outputs.get(path.resolve(boundary)) ?? ''

        const baseIndex = text.indexOf('.base { color: red }')
        const maxIndex = text.indexOf('@media screen and (max-width: 640px)')
        const minIndex = text.indexOf('@media screen and (min-width: 1024px)')

        expect(baseIndex).toBeGreaterThanOrEqual(0)
        expect(maxIndex).toBeGreaterThanOrEqual(0)
        expect(minIndex).toBeGreaterThanOrEqual(0)
        expect(baseIndex).toBeLessThan(maxIndex)
        expect(maxIndex).toBeLessThan(minIndex)
    })

    it('hoists shared custom css blocks across boundaries', async () => {
        const root = await createTempDir()
        const stylesheetPath = path.join(root, '.bo$$', 'styles.css')
        const leftDir = path.join(root, 'left')
        const rightDir = path.join(root, 'right')
        const leftBoundary = path.join(leftDir, 'left.boss.css')
        const rightBoundary = path.join(rightDir, 'right.boss.css')

        await fs.mkdir(leftDir, { recursive: true })
        await fs.mkdir(rightDir, { recursive: true })
        await fs.writeFile(leftBoundary, '', 'utf8')
        await fs.writeFile(rightBoundary, '', 'utf8')

        const api = createApi()
        api.css.syncCustomBlocks(path.join(leftDir, 'a.tsx'), [
            { start: 1, end: 2, cssText: '.custom { color: red }' },
            { start: 3, end: 4, cssText: '.left-only { color: blue }' },
        ])
        api.css.syncCustomBlocks(path.join(rightDir, 'b.tsx'), [
            { start: 1, end: 2, cssText: '.custom { color: red }' },
        ])

        const result = await resolveBoundaryOutputs(api, { rootDir: root, stylesheetPath })
        const outputs = new Map(result.outputs.map(output => [path.resolve(output.path), output.text]))
        const leftText = outputs.get(path.resolve(leftBoundary)) ?? ''
        const rightText = outputs.get(path.resolve(rightBoundary)) ?? ''
        const globalText = outputs.get(path.resolve(stylesheetPath)) ?? ''

        expect(globalText).toContain('.custom { color: red }')
        expect(leftText).not.toContain('.custom { color: red }')
        expect(rightText).not.toContain('.custom { color: red }')
        expect(leftText).toContain('.left-only { color: blue }')
    })

    it('applies selectorScope to root output in boundary files', async () => {
        const root = await createTempDir()
        const stylesheetPath = path.join(root, '.bo$$', 'styles.css')
        const areaDir = path.join(root, 'area')
        const boundary = path.join(areaDir, 'area.boss.css')

        await fs.mkdir(areaDir, { recursive: true })
        await fs.writeFile(boundary, '', 'utf8')

        const api = createApi()
        api.selectorScope = '.scope '
        api.css.addRoot('--scoped: 1;', path.join(areaDir, 'page.tsx'))

        const result = await resolveBoundaryOutputs(api, { rootDir: root, stylesheetPath })
        const outputs = new Map(result.outputs.map(output => [path.resolve(output.path), output.text]))
        const text = outputs.get(path.resolve(boundary)) ?? ''

        expect(text).toContain('.scope  {\n  --scoped: 1;\n}')
    })

    it('normalizes duplicate rules across sources', async () => {
        const root = await createTempDir()
        const stylesheetPath = path.join(root, '.bo$$', 'styles.css')
        const leftDir = path.join(root, 'left')
        const rightDir = path.join(root, 'right')
        const leftBoundary = path.join(leftDir, 'left.boss.css')
        const rightBoundary = path.join(rightDir, 'right.boss.css')

        await fs.mkdir(leftDir, { recursive: true })
        await fs.mkdir(rightDir, { recursive: true })
        await fs.writeFile(leftBoundary, '', 'utf8')
        await fs.writeFile(rightBoundary, '', 'utf8')

        const api = createApi()
        api.css.addRule('.dup { color: red; }', null, path.join(leftDir, 'page.tsx'))
        api.css.addRule('.dup {  color: red }', null, path.join(rightDir, 'page.tsx'))

        const result = await resolveBoundaryOutputs(api, { rootDir: root, stylesheetPath })
        const outputs = new Map(result.outputs.map(output => [path.resolve(output.path), output.text]))
        const globalText = outputs.get(path.resolve(stylesheetPath)) ?? ''
        const leftText = outputs.get(path.resolve(leftBoundary)) ?? ''
        const rightText = outputs.get(path.resolve(rightBoundary)) ?? ''

        const combined = [globalText, leftText, rightText].join('\n')
        const matches = combined.match(/\.dup\s*\{\s*color:\s*red/g) ?? []

        expect(matches.length).toBe(1)
        expect(globalText).toContain('.dup')
        expect(leftText).not.toContain('.dup')
        expect(rightText).not.toContain('.dup')
    })

    it('reacts to boundary removal between runs', async () => {
        const root = await createTempDir()
        const stylesheetPath = path.join(root, '.bo$$', 'styles.css')
        const areaDir = path.join(root, 'area')
        const boundary = path.join(areaDir, 'area.boss.css')

        await fs.mkdir(areaDir, { recursive: true })
        await fs.writeFile(boundary, '', 'utf8')

        const api = createApi()
        api.css.addRule('.area { color: red }', null, path.join(areaDir, 'page.tsx'))

        const first = await resolveBoundaryOutputs(api, { rootDir: root, stylesheetPath })
        expect(first.hasBoundaries).toBe(true)

        await fs.unlink(boundary)

        const second = await resolveBoundaryOutputs(api, { rootDir: root, stylesheetPath })
        expect(second.hasBoundaries).toBe(false)
        expect(second.outputs[0].text).toContain('.area { color: red }')
    })

    it('hoists shared keyframes across boundaries', async () => {
        const root = await createTempDir()
        const stylesheetPath = path.join(root, '.bo$$', 'styles.css')
        const leftDir = path.join(root, 'left')
        const rightDir = path.join(root, 'right')
        const leftBoundary = path.join(leftDir, 'left.boss.css')
        const rightBoundary = path.join(rightDir, 'right.boss.css')

        await fs.mkdir(leftDir, { recursive: true })
        await fs.mkdir(rightDir, { recursive: true })
        await fs.writeFile(leftBoundary, '', 'utf8')
        await fs.writeFile(rightBoundary, '', 'utf8')

        const api = createApi()
        const keyframes = '@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }'
        api.css.addRule(keyframes, null, path.join(leftDir, 'page.tsx'))
        api.css.addRule(keyframes, null, path.join(rightDir, 'page.tsx'))

        const result = await resolveBoundaryOutputs(api, { rootDir: root, stylesheetPath })
        const outputs = new Map(result.outputs.map(output => [path.resolve(output.path), output.text]))
        const globalText = outputs.get(path.resolve(stylesheetPath)) ?? ''
        const leftText = outputs.get(path.resolve(leftBoundary)) ?? ''
        const rightText = outputs.get(path.resolve(rightBoundary)) ?? ''

        expect(globalText).toContain('@keyframes spin')
        expect(leftText).not.toContain('@keyframes spin')
        expect(rightText).not.toContain('@keyframes spin')
    })

    it('honors selectorScope and selectorPrefix for class rules', async () => {
        const root = await createTempDir()
        const stylesheetPath = path.join(root, '.bo$$', 'styles.css')
        const areaDir = path.join(root, 'area')
        const boundary = path.join(areaDir, 'area.boss.css')

        await fs.mkdir(areaDir, { recursive: true })
        await fs.writeFile(boundary, '', 'utf8')

        const api = createApi()
        api.selectorScope = '.scope '
        api.selectorPrefix = 'boss-'
        api.dictionary.toValue = (value: unknown) => value
        api.contextToClassName = (name: string, value: unknown, contexts: string[], escape = true, prefix = '') => {
            const base = `${prefix}${[...contexts, name, value].filter(Boolean).join(':')}`
            return escape ? base.replace(/ /g, '_') : base
        }

        api.css.selector({
            className: api.contextToClassName('color', 'red', [], true, api.selectorPrefix),
            source: path.join(areaDir, 'page.tsx'),
        })
        api.css.rule('color', 'red')
        api.css.write()

        const result = await resolveBoundaryOutputs(api, { rootDir: root, stylesheetPath })
        const outputs = new Map(result.outputs.map(output => [path.resolve(output.path), output.text]))
        const text = outputs.get(path.resolve(boundary)) ?? ''

        expect(text).toContain('.scope .boss-color:red { color: red }')
    })

    it('keeps @import rules only in global stylesheet', async () => {
        const root = await createTempDir()
        const stylesheetPath = path.join(root, '.bo$$', 'styles.css')
        const areaDir = path.join(root, 'area')
        const boundary = path.join(areaDir, 'area.boss.css')

        await fs.mkdir(areaDir, { recursive: true })
        await fs.writeFile(boundary, '', 'utf8')

        const api = createApi()
        api.css.addImport('https://example.com/app.css')
        api.css.addRule('.area { color: red }', null, path.join(areaDir, 'page.tsx'))

        const result = await resolveBoundaryOutputs(api, { rootDir: root, stylesheetPath })
        const outputs = new Map(result.outputs.map(output => [path.resolve(output.path), output.text]))
        const globalText = outputs.get(path.resolve(stylesheetPath)) ?? ''
        const boundaryText = outputs.get(path.resolve(boundary)) ?? ''

        expect(globalText).toContain('@import url("https://example.com/app.css");')
        expect(boundaryText).not.toContain('@import url("https://example.com/app.css");')
    })
})
