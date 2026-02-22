import { describe, expect } from 'vitest'

describe('pseudo', () => {
    describe('e2e', () => {
        describe('server', () => {
            describe('essentials', () => {
                test('nested pseudo', async ({ $ }) => {
                    const api = await $.createServerApi({
                        plugins: [...$.essentialsServer, $.strategy.inlineFirstServer],
                    })
                    await api.trigger('onParse', {
                        content: `
                            <$$
                                tabIndex={1}
                                hover={{
                                    focus: {
                                        color: 'blue',
                                    },
                                }}
                            >
                                Hover+Focus
                            </$$>
                        `,
                    })

                    expect(api.css.text.trim()).toStrictEqual(
                        `.hover\\:focus\\:color:hover:focus { color: var(--hover-focus-color) !important }`,
                    )
                })

                test('before', async ({ $ }) => {
                    const api = await $.createServerApi({
                        plugins: [...$.essentialsServer, $.strategy.inlineFirstServer],
                    })
                    await api.trigger('onParse', {
                        content: `
                            <$$
                                before={{
                                    color: 'blue',
                                }}
                            />
                        `,
                    })

                    expect(api.css.text.trim()).toStrictEqual(
                        `.before\\:color:before { color: var(--before-color) !important }`,
                    )
                })
            })
        })

        describe('browser', () => {
            describe('essentials', () => {
                test('before', async ({ $ }) => {
                    const api = await $.createBrowserApi({
                        plugins: [...$.essentialsBrowser, $.strategy.inlineFirstBrowser],
                    })

                    const props = {}
                    api.trigger('onBrowserObjectStart', {
                        output: props,
                        input: {
                            before: {
                                content: '""',
                            },
                        },
                    })

                    expect(props).toStrictEqual({
                        className: 'before:content',
                        style: {
                            '--before-content': '""',
                        },
                    })
                })
            })
        })
    })

    describe('types', () => {
        test('nested props keep $$FinalProps typing', async ({ $ }) => {
            const source = `import './bo$$'

$$.$({
    hover: { color: 'red' },
    at: { mobile: { color: 'cyan' } },
    child: { span: { color: 'blue' } },
    className: 'a',
})

// @ts-expect-error unknown prop inside hover
$$.$({ hover: { foo: 'bar' } })

// @ts-expect-error unknown prop inside at
$$.$({ at: { mobile: { foo: 'bar' } } })

// @ts-expect-error unknown prop inside child
$$.$({ child: { span: { foo: 'bar' } } })
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
