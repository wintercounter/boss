import { describe, expect } from 'vitest'

describe('custom css', () => {
    test('adds template literal css to stylesheet', async ({ $ }) => {
        const api = await $.createServerApi({
            plugins: [...$.essentialsServer],
        })

        await api.trigger('onParse', {
            content: `
$$.css\`
.btn { color: red; }
\`
`,
            path: 'demo.tsx',
        })

        expect(api.css.text).toContain('.btn { color: red; }')
    })

    test('serializes object css', async ({ $ }) => {
        const api = await $.createServerApi({
            plugins: [...$.essentialsServer],
        })

        await api.trigger('onParse', {
            content: `$$.css({ ".card": { padding: 8, color: "red" } })`,
            path: 'demo.tsx',
        })

        expect(api.css.text).toContain('.card { padding: 8px; color: red }')
    })

    test('serializes nested selectors and @media', async ({ $ }) => {
        const api = await $.createServerApi({
            plugins: [...$.essentialsServer],
        })

        await api.trigger('onParse', {
            content: `$$.css({
                ".card": {
                    padding: [8, 12],
                    marginTop: -4,
                    "--custom": 12,
                    "&:hover": { color: "red" },
                    "@media screen and (min-width: 640px)": { padding: 16 }
                }
            })`,
            path: 'demo.tsx',
        })

        expect(api.css.text).toContain('.card { padding: 8px 12px; margin-top: -4px; --custom: 12px }')
        expect(api.css.text).toContain('.card:hover { color: red }')
        expect(api.css.text).toContain('@media screen and (min-width: 640px) { .card { padding: 16px } }')
    })

    test('wraps top-level declarations in :root', async ({ $ }) => {
        const api = await $.createServerApi({
            plugins: [...$.essentialsServer],
        })

        await api.trigger('onParse', {
            content: `$$.css({ color: "red", backgroundColor: "white" })`,
            path: 'demo.tsx',
        })

        expect(api.css.text).toContain(':root { color: red; background-color: var(--color-white) }')
        expect(api.css.text).toContain('--color-white: #fff')
    })

    test('resolves token values in object css', async ({ $ }) => {
        $.use.tokenServer.set({
            color: { white: '#fff' },
        })
        const api = await $.createServerApi({
            plugins: [...$.essentialsServer],
        })

        await api.trigger('onParse', {
            content: `$$.css({ ".token": { color: $$.token.color.white } })`,
            path: 'demo.tsx',
        })

        expect(api.css.text).toContain('.token { color: var(--color-white) }')
        expect(api.css.text).toContain('--color-white: #fff')
    })

    test('skips dynamic template literals', async ({ $ }) => {
        const api = await $.createServerApi({
            plugins: [...$.essentialsServer],
        })

        await api.trigger('onParse', {
            content: 'const color = "red"; $$.css`.dynamic { color: ${color}; }`',
            path: 'demo.tsx',
        })

        expect(api.css.text).not.toContain('.dynamic')
    })

    test('skips dynamic object values', async ({ $ }) => {
        const api = await $.createServerApi({
            plugins: [...$.essentialsServer],
        })

        await api.trigger('onParse', {
            content: 'const size = 12; $$.css({ ".dynamic": { padding: size } })',
            path: 'demo.tsx',
        })

        expect(api.css.text).not.toContain('.dynamic')
    })

    test('removes stale css when block disappears', async ({ $ }) => {
        const api = await $.createServerApi({
            plugins: [...$.essentialsServer],
        })

        await api.trigger('onParse', {
            content: `$$.css\`.old { color: red; }\``,
            path: 'demo.tsx',
        })
        await api.trigger('onParse', { content: ``, path: 'demo.tsx' })

        expect(api.css.text).not.toContain('.old { color: red; }')
    })
})
