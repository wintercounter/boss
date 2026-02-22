import fs from 'node:fs/promises'
import path from 'node:path'
import { afterEach, describe, expect, vi } from 'vitest'

import * as fontsourceServer from './server'

const createJsonResponse = (data: unknown) => ({
    ok: true,
    status: 200,
    json: async () => data,
    text: async () => JSON.stringify(data),
    arrayBuffer: async () => new TextEncoder().encode(JSON.stringify(data)).buffer,
})

const createTextResponse = (text: string) => ({
    ok: true,
    status: 200,
    json: async () => JSON.parse(text),
    text: async () => text,
    arrayBuffer: async () => new TextEncoder().encode(text).buffer,
})

const createBinaryResponse = (bytes: ArrayBuffer) => ({
    ok: true,
    status: 200,
    json: async () => ({ ok: true }),
    text: async () => '',
    arrayBuffer: async () => bytes,
})

describe('fontsource', () => {
    afterEach(() => {
        vi.unstubAllGlobals()
    })
    test('emits @import for cdn delivery', async ({ $ }) => {
        const fetchMock = vi.fn(async url => {
            const urlString = typeof url === 'string' ? url : (url?.url ?? url?.href)
            if (urlString === 'https://api.fontsource.org/v1/version/inter') {
                return createJsonResponse({ latest: '1.2.3' })
            }
            throw new Error(`Unexpected fetch: ${urlString}`)
        })

        vi.stubGlobal('fetch', fetchMock)

        const api = await $.createServerApi({
            plugins: [fontsourceServer],
            fonts: [
                {
                    name: 'Inter',
                    subsets: ['latin'],
                    weights: [400],
                    styles: ['normal'],
                    delivery: 'cdn',
                },
            ],
        })

        expect(api.css.text).toContain(
            '@import url("https://cdn.jsdelivr.net/npm/@fontsource/inter@1.2.3/latin-400.css");',
        )
    })

    test('rewrites font-face urls and downloads files for local delivery', async ({ $ }) => {
        const folder = '.bo$$-fontsource-test'
        const stylesheetPath = path.join(process.cwd(), folder, 'styles.css')
        const fontsDir = path.join(process.cwd(), folder, 'fonts')
        const fontFolder = path.join(fontsDir, 'inter-1.2.3')
        await fs.rm(path.join(process.cwd(), folder), { recursive: true, force: true })

        const cssUrl = 'https://cdn.jsdelivr.net/npm/@fontsource/inter@1.2.3/latin-400.css'
        const fontUrl = 'https://cdn.jsdelivr.net/npm/@fontsource/inter@1.2.3/files/inter-latin-400-normal.woff2'
        const cssText = `@font-face {\n  font-family: 'Inter';\n  font-style: normal;\n  font-weight: 400;\n  font-display: swap;\n  src: url(${fontUrl}) format('woff2');\n}`

        const fetchMock = vi.fn(async url => {
            const urlString = typeof url === 'string' ? url : (url?.url ?? url?.href)
            if (urlString === 'https://api.fontsource.org/v1/version/inter') {
                return createJsonResponse({ latest: '1.2.3' })
            }
            if (urlString === cssUrl) {
                return createTextResponse(cssText)
            }
            if (urlString === fontUrl) {
                return createBinaryResponse(new TextEncoder().encode('fontdata').buffer)
            }
            throw new Error(`Unexpected fetch: ${urlString}`)
        })

        vi.stubGlobal('fetch', fetchMock)

        const api = await $.createServerApi({
            plugins: [fontsourceServer],
            fonts: [
                {
                    name: 'Inter',
                    subsets: ['latin'],
                    weights: [400],
                    styles: ['normal'],
                    delivery: 'local',
                },
            ],
            folder,
            stylesheetPath,
        })

        expect(api.css.text).toContain('url("./fonts/inter-1.2.3/inter-latin-400-normal.woff2")')

        const written = await fs.readFile(path.join(fontFolder, 'inter-latin-400-normal.woff2'))
        expect(written.length).toBeGreaterThan(0)

        await fs.rm(path.join(process.cwd(), folder), { recursive: true, force: true })
    })

    test('applies variable axes overrides for local delivery', async ({ $ }) => {
        const folder = '.bo$$-fontsource-variable'
        const stylesheetPath = path.join(process.cwd(), folder, 'styles.css')
        await fs.rm(path.join(process.cwd(), folder), { recursive: true, force: true })

        const cssUrl = 'https://cdn.jsdelivr.net/npm/@fontsource-variable/inter@1.2.3/index.css'
        const fontUrl =
            'https://cdn.jsdelivr.net/npm/@fontsource-variable/inter@1.2.3/files/inter-latin-wght-normal.woff2'
        const cssText = `@font-face {\n  font-family: 'Inter';\n  font-style: normal;\n  font-weight: 100 900;\n  font-display: swap;\n  src: url(${fontUrl}) format('woff2');\n}`

        const fetchMock = vi.fn(async url => {
            const urlString = typeof url === 'string' ? url : (url?.url ?? url?.href)
            if (urlString === 'https://api.fontsource.org/v1/version/inter') {
                return createJsonResponse({ latestVariable: '1.2.3', latest: '1.2.3' })
            }
            if (urlString === cssUrl) {
                return createTextResponse(cssText)
            }
            if (urlString === fontUrl) {
                return createBinaryResponse(new TextEncoder().encode('fontdata').buffer)
            }
            throw new Error(`Unexpected fetch: ${urlString}`)
        })

        vi.stubGlobal('fetch', fetchMock)

        const api = await $.createServerApi({
            plugins: [fontsourceServer],
            fonts: [
                {
                    name: 'Inter',
                    variable: true,
                    delivery: 'local',
                    variableAxes: {
                        wght: [100, 900],
                        wdth: [75, 125],
                        ital: 1,
                        opsz: [14, 32],
                        slnt: -10,
                    },
                },
            ],
            folder,
            stylesheetPath,
        })

        expect(api.css.text).toContain('font-weight: 100 900')
        expect(api.css.text).toContain('font-stretch: 75% 125%')
        expect(api.css.text).toContain('font-style: italic')
        expect(api.css.text).toContain('font-variation-settings: "opsz" 14')
        expect(api.css.text).toContain('"slnt" -10')

        await fs.rm(path.join(process.cwd(), folder), { recursive: true, force: true })
    })
})
