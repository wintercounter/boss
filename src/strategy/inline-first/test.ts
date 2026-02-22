import { describe, expect } from 'vitest'

describe('inline-first', () => {
    describe('e2e', () => {
        describe('server', () => {
            describe('essentials', () => {
                test('simple props', async ({ $ }) => {
                    const api = await $.createServerApi({
                        plugins: [...$.essentialsServer, $.strategy.inlineFirstServer],
                    })
                    await api.trigger('onParse', { content: '<$$ display="flex">' })

                    expect(api.css.text).toStrictEqual('')
                })

                test('multiple simple props', async ({ $ }) => {
                    const api = await $.createServerApi({
                        plugins: [...$.essentialsServer, $.strategy.inlineFirstServer],
                    })
                    await api.trigger('onParse', { content: '<$$ display="block" color="red">' })

                    expect(api.css.text).toStrictEqual('')
                })

                test('single pseudo prop', async ({ $ }) => {
                    const api = await $.createServerApi({
                        plugins: [...$.essentialsServer, $.strategy.inlineFirstServer],
                    })
                    await api.trigger('onParse', { content: `<$$ hover={{ display: 'block' }}>` })

                    expect(api.css.text.trim()).toStrictEqual(
                        '.hover\\:display:hover { display: var(--hover-display) !important }',
                    )
                })

                test('single pseudo prop - multiple children', async ({ $ }) => {
                    const api = await $.createServerApi({
                        plugins: [...$.essentialsServer, $.strategy.inlineFirstServer],
                    })
                    await api.trigger('onParse', { content: `<$$ hover={{ display: 'block', color: 'red' }}>` })

                    expect(api.css.text.trim()).toStrictEqual(`.hover\\:display:hover { display: var(--hover-display) !important }
.hover\\:color:hover { color: var(--hover-color) !important }`)
                })

                test('single pseudo prop - pseudo children', async ({ $ }) => {
                    const api = await $.createServerApi({
                        plugins: [...$.essentialsServer, $.strategy.inlineFirstServer],
                    })
                    await api.trigger('onParse', {
                        content: `<$$ hover={{ color: 'red', focus: { display: 'block' } }}>`,
                    })

                    expect(api.css.text.trim()).toStrictEqual(`.hover\\:color:hover { color: var(--hover-color) !important }
.hover\\:focus\\:display:hover:focus { display: var(--hover-focus-display) !important }`)
                })

                test('child selector prop', async ({ $ }) => {
                    const api = await $.createServerApi({
                        plugins: [...$.essentialsServer, $.strategy.inlineFirstServer],
                    })
                    await api.trigger('onParse', {
                        content: `<$$ child={{ '&>div': { color: 'red' } }}>`,
                    })

                    expect(api.css.text.trim()).toStrictEqual(
                        `.\\[\\&\\>div\\]\\:color>div { color: var(--\\[\\&\\>div\\]-color) !important }`,
                    )
                })

                test('uses variable if the same deep css prop detected', async ({ $ }) => {
                    const api = await $.createServerApi({
                        plugins: [...$.essentialsServer, $.strategy.inlineFirstServer],
                    })
                    await api.trigger('onParse', {
                        content: `<$$ color="blue" hover={{ color: 'red' }}>`,
                    })

                    expect(api.css.text.trim()).toStrictEqual(`.hover\\:color:hover { color: var(--hover-color) !important }`)
                })

                test('array value inside pseudo', async ({ $ }) => {
                    const api = await $.createServerApi({
                        plugins: [...$.essentialsServer, $.strategy.inlineFirstServer],
                    })
                    await api.trigger('onParse', { content: `<$$ hover={{ margin: [20, 0] }}>` })

                    expect(api.css.text.trim()).toStrictEqual(
                        `.hover\\:margin:hover { margin: var(--hover-margin) !important }`,
                    )
                })

                test('using jsx expression attribute', async ({ $ }) => {
                    const api = await $.createServerApi({
                        plugins: [...$.essentialsServer, $.strategy.inlineFirstServer],
                    })
                    await api.trigger('onParse', {
                        content: ` <$$ textTransform={'uppercase'}>Client side: first time import</$$>`,
                    })

                    expect(api.css.text.trim()).toStrictEqual(``)
                })
            })
        })

        describe('browser', () => {
            describe('essentials', () => {
                test('single css prop', async ({ $ }) => {
                    const api = await $.createBrowserApi({
                        plugins: [...$.essentialsServer, $.strategy.inlineFirstBrowser],
                    })

                    const props = {}
                    api.trigger('onBrowserObjectStart', {
                        output: props,
                        input: {
                            display: 'block',
                        },
                    })

                    expect(props).toStrictEqual({
                        style: {
                            display: 'block',
                        },
                    })
                })

                test('multiple css prop', async ({ $ }) => {
                    const api = await $.createBrowserApi({
                        plugins: [...$.essentialsServer, $.strategy.inlineFirstBrowser],
                    })

                    const props = {}
                    api.trigger('onBrowserObjectStart', {
                        output: props,
                        input: {
                            display: 'block',
                        },
                    })

                    expect(props).toStrictEqual({
                        style: {
                            display: 'block',
                        },
                    })
                })

                test('simple number prop', async ({ $ }) => {
                    const api = await $.createBrowserApi({
                        plugins: [...$.essentialsServer, $.strategy.inlineFirstBrowser],
                    })

                    const props = {}
                    api.trigger('onBrowserObjectStart', {
                        output: props,
                        input: {
                            display: 'block',
                        },
                    })

                    expect(props).toStrictEqual({
                        style: {
                            display: 'block',
                        },
                    })
                })

                test('known css props still inline on first level', async ({ $ }) => {
                    const registerPlugin = {
                        name: 'inline-first-test',
                        onInit: (api: any) => {
                            api.dictionary.set('border', {
                                property: 'border',
                                aliases: ['border'],
                                description: '',
                                values: [],
                                initial: '',
                                isCSSProp: true,
                                single: false,
                            })
                        },
                    }

                    const api = await $.createBrowserApi({
                        plugins: [registerPlugin, $.strategy.inlineFirstBrowser],
                    })

                    const props = {}
                    api.trigger('onBrowserObjectStart', {
                        output: props,
                        input: {
                            border: '1px solid red',
                        },
                    })

                    expect(props).toStrictEqual({
                        style: {
                            border: '1px solid red',
                        },
                    })
                })

                test('single pseudo prop - pseudo children - deep', async ({ $ }) => {
                    const api = await $.createBrowserApi({
                        plugins: [...$.essentialsServer, $.strategy.inlineFirstBrowser],
                    })

                    const props = {}
                    api.trigger('onBrowserObjectStart', {
                        output: props,
                        input: {
                            display: 'block',
                            hover: { display: 'none' },
                            focus: {
                                hover: { display: 'inline' },
                            },
                        },
                    })

                    expect(props).toStrictEqual({
                        className: 'hover:display focus:hover:display',
                        style: { display: 'block', '--focus-hover-display': 'inline', '--hover-display': 'none' },
                    })
                })

                test('nested pseudo prop', async ({ $ }) => {
                    const api = await $.createBrowserApi({
                        plugins: [...$.essentialsServer, $.strategy.inlineFirstBrowser],
                    })

                    const props = {}
                    api.trigger('onBrowserObjectStart', {
                        output: props,
                        input: {
                            hover: {
                                color: 'yellow',
                                focus: {
                                    color: 'blue',
                                },
                            },
                        },
                    })

                    expect(props).toStrictEqual({
                        className: 'hover:color hover:focus:color',
                        style: { '--hover-color': 'yellow', '--hover-focus-color': 'blue' },
                    })
                })

                test('selectorPrefix prefixes className and variables', async ({ $ }) => {
                    const api = await $.createBrowserApi({
                        selectorPrefix: 'boss-',
                        selectorScope: '.scope ',
                        plugins: [...$.essentialsServer, $.strategy.inlineFirstBrowser],
                    })

                    const props = {}
                    api.trigger('onBrowserObjectStart', {
                        output: props,
                        input: {
                            hover: {
                                color: 'yellow',
                            },
                        },
                    })

                    expect(props).toStrictEqual({
                        className: 'boss-hover:color',
                        style: { '--boss-hover-color': 'yellow' },
                    })
                })

                test('child selector prop', async ({ $ }) => {
                    const api = await $.createBrowserApi({
                        plugins: [...$.essentialsServer, $.strategy.inlineFirstBrowser],
                    })

                    const props = {}
                    api.trigger('onBrowserObjectStart', {
                        output: props,
                        input: {
                            child: {
                                '&>div': { color: 'red' },
                            },
                        },
                    })

                    expect(props).toStrictEqual({
                        className: '[&>div]:color',
                        style: { '--\\[\\&\\>div\\]-color': 'red' },
                    })
                })

                test('simple array value', async ({ $ }) => {
                    const api = await $.createBrowserApi({
                        plugins: [...$.essentialsBrowser, $.strategy.inlineFirstBrowser],
                    })

                    const props = {}
                    api.trigger('onBrowserObjectStart', {
                        output: props,
                        input: {
                            margin: [20, 0],
                        },
                    })

                    expect(props).toStrictEqual({
                        style: { margin: '20px 0' },
                    })
                })

                test('simple array value inside pseudo', async ({ $ }) => {
                    const api = await $.createBrowserApi({
                        plugins: [...$.essentialsServer, $.strategy.inlineFirstBrowser],
                    })

                    const props = {}
                    api.trigger('onBrowserObjectStart', {
                        output: props,
                        input: {
                            hover: { margin: [20, 0] },
                        },
                    })

                    expect(props).toStrictEqual({
                        className: 'hover:margin',
                        style: { '--hover-margin': '20px 0' },
                    })
                })

                test('shorthand', async ({ $ }) => {
                    const api = await $.createBrowserApi({
                        plugins: [...$.essentialsServer, $.strategy.inlineFirstBrowser],
                    })

                    const props = {}
                    api.trigger('onBrowserObjectStart', {
                        output: props,
                        input: {
                            di: 'block',
                        },
                    })

                    expect(props).toStrictEqual({
                        className: 'di',
                        style: {
                            '--di': 'block',
                        },
                    })
                })
            })
        })
    })
})
