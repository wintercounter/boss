import { describe, expect } from 'vitest'

describe('classname-first', () => {
    describe('e2e', () => {
        describe('server', () => {
            describe('essentials', () => {
                test('static css prop emits class selector', async ({ $ }) => {
                    const api = await $.createServerApi({
                        plugins: [...$.essentialsServer, $.strategy.classnameFirstServer],
                    })
                    await api.trigger('onParse', { content: '<$$ color="red">' })

                    expect(api.css.text).toContain('.color\\:red { color: red }')
                })

                test('dynamic function prop emits variable selector', async ({ $ }) => {
                    const api = await $.createServerApi({
                        plugins: [...$.essentialsServer, $.strategy.classnameFirstServer],
                    })
                    await api.trigger('onParse', { content: '<$$ color={() => tone }>' })

                    expect(api.css.text).toContain('.color { color: var(--color) }')
                })

                test('dynamic non-function prop is skipped', async ({ $ }) => {
                    const api = await $.createServerApi({
                        plugins: [...$.essentialsServer, $.strategy.classnameFirstServer],
                    })
                    await api.trigger('onParse', { content: '<$$ color={tone}>' })

                    expect(api.css.text).not.toContain('.color')
                })

                test('token values keep selector value', async ({ $ }) => {
                    const api = await $.createServerApi({
                        plugins: [...$.essentialsServer, $.strategy.classnameFirstServer],
                    })
                    await api.trigger('onParse', { content: '<$$ color="white">' })

                    expect(api.css.text).toContain('.color\\:white { color: var(--color-white) }')
                    expect(api.css.text).toContain('--color-white')
                })

                test('single pseudo prop emits class selector with value', async ({ $ }) => {
                    const api = await $.createServerApi({
                        plugins: [...$.essentialsServer, $.strategy.classnameFirstServer],
                    })
                    await api.trigger('onParse', { content: `<$$ hover={{ display: 'block' }}>` })

                    expect(api.css.text).toContain('.hover\\:display\\:block:hover { display: block }')
                })

                test('nested pseudo props include nested contexts', async ({ $ }) => {
                    const api = await $.createServerApi({
                        plugins: [...$.essentialsServer, $.strategy.classnameFirstServer],
                    })
                    await api.trigger('onParse', {
                        content: `<$$ hover={{ color: 'red', focus: { display: 'block' } }}>`,
                    })

                    expect(api.css.text).toContain('.hover\\:color\\:red:hover { color: red }')
                    expect(api.css.text).toContain(
                        '.hover\\:focus\\:display\\:block:hover:focus { display: block }',
                    )
                })

                test('child selector prop emits class selector with value', async ({ $ }) => {
                    const api = await $.createServerApi({
                        plugins: [...$.essentialsServer, $.strategy.classnameFirstServer],
                    })
                    await api.trigger('onParse', {
                        content: `<$$ child={{ '&>div': { color: 'red' } }}>`,
                    })

                    expect(api.css.text).toContain('.\\[\\&\\>div\\]\\:color\\:red>div { color: red }')
                })

                test('at prop emits class selector with value', async ({ $ }) => {
                    const api = await $.createServerApi({
                        plugins: [...$.essentialsServer, $.strategy.classnameFirstServer],
                    })
                    await api.trigger('onParse', {
                        content: `<$$ at={{ dark: { color: 'red' } }}>`,
                    })

                    expect(api.css.text).toContain(
                        '@media screen and (prefers-color-scheme: dark) { .at\\:dark\\:color\\:red { color: red } }',
                    )
                })

                test('array values keep selector value', async ({ $ }) => {
                    const api = await $.createServerApi({
                        plugins: [...$.essentialsServer, $.strategy.classnameFirstServer],
                    })
                    await api.trigger('onParse', { content: `<$$ margin={[20, 0]}>` })

                    expect(api.css.text).toContain('.margin\\:20_0 { margin: 20px 0 }')
                })

                test('dynamic function inside pseudo uses CSS variables', async ({ $ }) => {
                    const api = await $.createServerApi({
                        plugins: [...$.essentialsServer, $.strategy.classnameFirstServer],
                    })
                    await api.trigger('onParse', { content: `<$$ hover={{ color: () => tone }}>` })

                    expect(api.css.text).toContain('.hover\\:color:hover { color: var(--hover-color) }')
                })
            })
        })

        describe('browser', () => {
            describe('essentials', () => {
                test('static css prop uses className', async ({ $ }) => {
                    const api = await $.createBrowserApi({
                        plugins: [...$.essentialsBrowser, $.strategy.classnameFirstBrowser],
                        strategy: 'classname-first',
                    })

                    const props = {}
                    api.trigger('onBrowserObjectStart', {
                        output: props,
                        input: {
                            color: 'red',
                        },
                        tag: 'div',
                    })

                    expect(props).toStrictEqual({
                        className: 'color:red',
                    })
                })

                test('className prop uses cx semantics and merges with generated classes', async ({ $ }) => {
                    const api = await $.createBrowserApi({
                        plugins: [...$.essentialsBrowser, $.strategy.classnameFirstBrowser],
                        strategy: 'classname-first',
                    })

                    const props = {}
                    api.trigger('onBrowserObjectStart', {
                        output: props,
                        input: {
                            className: ['color:blue', { 'padding:4': true }],
                            color: 'red',
                        },
                        tag: 'div',
                    })

                    expect(props).toStrictEqual({
                        className: 'padding:4 color:red',
                    })
                })

                test('dynamic function prop uses CSS variable', async ({ $ }) => {
                    const api = await $.createBrowserApi({
                        plugins: [...$.essentialsBrowser, $.strategy.classnameFirstBrowser],
                        strategy: 'classname-first',
                    })

                    const props = {}
                    api.trigger('onBrowserObjectStart', {
                        output: props,
                        input: {
                            padding: () => 8,
                        },
                        tag: 'div',
                    })

                    expect(props).toStrictEqual({
                        className: 'padding',
                        style: {
                            '--padding': '8px',
                        },
                    })
                })

                test('nested contexts keep values and variables', async ({ $ }) => {
                    const api = await $.createBrowserApi({
                        plugins: [...$.essentialsBrowser, $.strategy.classnameFirstBrowser],
                        strategy: 'classname-first',
                    })

                    const props = {}
                    api.trigger('onBrowserObjectStart', {
                        output: props,
                        input: {
                            hover: {
                                color: 'red',
                                focus: {
                                    color: () => 'blue',
                                },
                            },
                        },
                        tag: 'div',
                    })

                    expect(props).toStrictEqual({
                        className: 'hover:color:red hover:focus:color',
                        style: { '--hover-focus-color': 'blue' },
                    })
                })

                test('child selector prop keeps value in className', async ({ $ }) => {
                    const api = await $.createBrowserApi({
                        plugins: [...$.essentialsBrowser, $.strategy.classnameFirstBrowser],
                        strategy: 'classname-first',
                    })

                    const props = {}
                    api.trigger('onBrowserObjectStart', {
                        output: props,
                        input: {
                            child: {
                                '&>div': { color: 'red' },
                            },
                        },
                        tag: 'div',
                    })

                    expect(props).toStrictEqual({
                        className: '[&>div]:color:red',
                    })
                })

                test('at prop keeps value in className', async ({ $ }) => {
                    const api = await $.createBrowserApi({
                        plugins: [...$.essentialsBrowser, $.strategy.classnameFirstBrowser],
                        strategy: 'classname-first',
                    })

                    const props = {}
                    api.trigger('onBrowserObjectStart', {
                        output: props,
                        input: {
                            at: {
                                dark: {
                                    color: 'red',
                                },
                            },
                        },
                        tag: 'div',
                    })

                    expect(props).toStrictEqual({
                        className: 'at:dark:color:red',
                    })
                })

                test('array values keep selector value', async ({ $ }) => {
                    const api = await $.createBrowserApi({
                        plugins: [...$.essentialsBrowser, $.strategy.classnameFirstBrowser],
                        strategy: 'classname-first',
                    })

                    const props = {}
                    api.trigger('onBrowserObjectStart', {
                        output: props,
                        input: {
                            margin: [20, 0],
                        },
                        tag: 'div',
                    })

                    expect(props).toStrictEqual({
                        className: 'margin:20_0',
                    })
                })

                test('token functions resolve to selector values', async ({ $ }) => {
                    const api = await $.createBrowserApi({
                        plugins: [...$.essentialsBrowser, $.strategy.classnameFirstBrowser],
                        strategy: 'classname-first',
                    })

                    const tokenFn = () => '$$.token.color.white'
                    tokenFn.IS_TOKEN_FN = true

                    const props = {}
                    api.trigger('onBrowserObjectStart', {
                        output: props,
                        input: {
                            color: tokenFn,
                        },
                        tag: 'div',
                    })

                    expect(props).toStrictEqual({
                        className: 'color:white',
                    })
                })
            })
        })
    })
})
