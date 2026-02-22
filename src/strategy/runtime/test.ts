import { describe, expect } from 'vitest'

describe('runtime strategy', () => {
    test('runtime-only mode skips server CSS output', async ({ $ }) => {
        const api = await $.createServerApi({
            runtime: { only: true, strategy: 'inline-first' },
            plugins: [...$.essentialsServer, $.strategy.runtimeServer],
        })

        await api.trigger('onParse', { content: `<$$ hover={{ color: 'red' }}>` })

        expect(api.css.text).toStrictEqual('')
    })

    test('hybrid runtime strategy delegates to inline-first server output', async ({ $ }) => {
        const api = await $.createServerApi({
            runtime: { only: false, strategy: 'inline-first' },
            plugins: [...$.essentialsServer, $.strategy.runtimeServer],
        })

        await api.trigger('onParse', { content: `<$$ hover={{ color: 'red' }}>` })

        expect(api.css.text.trim()).toStrictEqual(`.hover\\:color:hover { color: var(--hover-color) !important }`)
    })

    test('hybrid runtime strategy delegates to classname-first server output', async ({ $ }) => {
        const api = await $.createServerApi({
            runtime: { only: false, strategy: 'classname-first' },
            plugins: [...$.essentialsServer, $.strategy.runtimeServer],
        })

        await api.trigger('onParse', { content: `<$$ color="red">` })

        expect(api.css.text.trim()).toStrictEqual(`:root {
  --color-black: #000;
  --color-white: #fff;
}
.color\\:red { color: red }`)
    })
})
