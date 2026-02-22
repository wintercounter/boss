import { describe, expect } from 'vitest'

import { transformSource } from './transform'

describe('compile custom css', () => {
    const createApi = async ($: any, config: Record<string, unknown> = {}) => {
        return $.createServerApi({
            plugins: [...$.essentialsServer, $.strategy.inlineFirstServer],
            ...config,
        })
    }

    test('removes standalone $$.css calls and emits css', async ({ $ }) => {
        const api = await createApi($)
        const result = await transformSource('$$.css`.btn { color: red; }`', {
            api,
            compile: { spread: true },
            filename: 'demo.tsx',
        })

        expect(result.code.trim()).toBe('')
        expect(api.css.text).toContain('.btn { color: red; }')
    })

    test('replaces inline $$.css expressions with void 0', async ({ $ }) => {
        const api = await createApi($)
        const result = await transformSource('const value = $$.css({ ".card": { padding: 8 } })', {
            api,
            compile: { spread: true },
            filename: 'demo.tsx',
        })

        expect(result.code.trim()).toBe(`const value = void 0;`)
        expect(api.css.text).toContain('.card { padding: 8px }')
    })

    test('serializes nested @media blocks', async ({ $ }) => {
        const api = await createApi($)
        await transformSource(`$$.css({ "@media screen and (min-width: 640px)": { ".card": { padding: 12 } } })`, {
            api,
            compile: { spread: true },
            filename: 'demo.tsx',
        })

        expect(api.css.text).toContain('@media screen and (min-width: 640px) { .card { padding: 12px } }')
    })
})
