import { describe, expect } from 'vitest'

describe('css', () => {
    describe('e2e', () => {
        describe('server', () => {
            describe('essentials', () => {
                test('className: `display:flex`', async ({ $ }) => {
                    const api = await $.createServerApi({
                        plugins: [...$.essentialsServer, $.strategy.inlineFirstServer],
                    })
                    await api.trigger('onParse', {
                        content: `<div className="display:flex">`,
                    })

                    expect(api.css.text.trim()).toStrictEqual(`.display\\:flex { display: flex }`)
                })

                test('selectorPrefix and selectorScope scope generated selectors', async ({ $ }) => {
                    const api = await $.createServerApi({
                        selectorPrefix: 'boss-',
                        selectorScope: '.scope ',
                        plugins: [...$.essentialsServer, $.strategy.inlineFirstServer],
                    })
                    await api.trigger('onParse', {
                        content: `<$$ hover={{ color: 'red' }} />`,
                    })

                    expect(api.css.text.trim()).toStrictEqual(
                        `.scope .boss-hover\\:color:hover { color: var(--boss-hover-color) !important }`,
                    )
                })

                test('simple media query', async ({ $ }) => {
                    const api = await $.createServerApi({
                        plugins: [...$.essentialsServer, $.strategy.inlineFirstServer],
                    })
                    await api.trigger('onParse', {
                        content: `<$$ at={{ '@media screen and (max-width: 100px)': { fontStyle: 'italic' } }}>`,
                    })

                    expect(api.css.text.trim()).toStrictEqual(
                        `@media screen and (max-width: 100px) { .at\\:\\@media_screen_and_\\(max-width\\:_100px\\)\\:font-style { font-style: var(--at-\\@media-screen-and-\\(max-width\\:-100px\\)-font-style) !important } }`,
                    )
                })

                test('prepared', async ({ $ }) => {
                    const api = await $.createServerApi({
                        plugins: [...$.essentialsServer, $.strategy.inlineFirstServer],
                    })
                    await api.trigger('onParse', {
                        content: `
$$.PreparedUppercaseA = $$.$({
    //as: 'a',

    boxShadow: '0 0 0 2px currentColor',
    //href: 'https://www.google.com',
    textTransform: 'uppercase',
    width: 300,
    hover: {
        color: 'purple',
    },

    at: {
        mobile: { color: 'cyan' },
    },

    //onClick: () => {},
})

//const B = () => React.createElement('div', null, 'UppercaseA component (hover, at mobile)')
`,
                    })

                    expect(api.css.text.trim()).toStrictEqual(
                        `.hover\\:color:hover { color: var(--hover-color) !important }
@media screen and (min-width: 376px) and (max-width: 639px) { .at\\:mobile\\:color { color: var(--at-mobile-color) !important } }`,
                    )
                })
            })

            describe('types', () => {
                test('dts added', async ({ $ }) => {
                    const api = await $.createServerApi({
                        plugins: [$.prop.cssServer],
                    })
                    const text = api.file.js.dts.text

                    //console.log(text)

                    //console.log(JSON.stringify(Array.from(api.file.js.dts.get('body').keys()), null, 2))

                    expect(text.includes('type VisualBox')).toBeTruthy()
                })

                test('css props typecheck', async ({ $ }) => {
                    const source = `import './bo$$'

$$.$({
    display: 'flex',
    width: '120px',
    color: 'red',
})

// @ts-expect-error css props should not accept object values
$$.$({ display: {} })
`

                    const { diagnostics, formattedDiagnostics } = await $.typeTest({
                        files: {
                            'case.ts': source,
                        },
                    })

                    expect(diagnostics, formattedDiagnostics).toStrictEqual([])
                })
            })
        })

        describe('browser', () => {
            describe('essentials', () => {
                test('simple media query', async ({ $ }) => {
                    const api = await $.createBrowserApi({
                        plugins: [...$.essentialsBrowser, $.strategy.inlineFirstBrowser],
                    })

                    const props = {}
                    api.trigger('onBrowserObjectStart', {
                        output: props,
                        input: {
                            at: {
                                '@media screen and (max-width: 100px)': {
                                    fontStyle: 'italic',
                                },
                            },
                        },
                    })

                    expect(props).toStrictEqual({
                        className: 'at:@media_screen_and_(max-width:_100px):font-style',
                        style: {
                            '--at-\\@media-screen-and-\\(max-width\\:-100px\\)-font-style': 'italic',
                        },
                    })
                })
            })
        })
    })
})
