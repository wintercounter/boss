import { describe, expect } from 'vitest'

describe('jsx', () => {
    describe('e2e', () => {
        describe('server', () => {
            describe('essentials', () => {
                test('reads globals setting from config', async ({ $ }) => {
                    const api = await $.createServerApi({
                        jsx: { globals: false },
                        plugins: [...$.essentialsServer, $.strategy.inlineFirstServer],
                    })
                    await api.trigger('onParse', {
                        content: `<$$ at={{ '@media screen and (max-width: 100px)': { fontStyle: 'italic' } }}>`,
                    })

                    expect(api.file.js.text).not.toContain('globalThis.$$ =')
                    expect(api.file.js.dts.text).not.toContain('declare global')
                })

                test('adds runtime imports and configs', async ({ $ }) => {
                    const api = await $.createServerApi({
                        plugins: [...$.essentialsServer, $.strategy.inlineFirstServer],
                    })
                    await api.trigger('onParse', {
                        content: `<$$ at={{ '@media screen and (max-width: 100px)': { fontStyle: 'italic' } }}>`,
                    })

                    expect(api.file.js.text)
                        .toStrictEqual(`//!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
// Generated code. Do not edit!
//!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
/* eslint-disable */
// @ts-nocheck

import { createApi as createApi_1acf3eh } from 'boss-css/api/browser'
import { tokenVars as tokenVars_1w3f7mg } from 'boss-css/use/token/browser'
import { proxy as proxy_1fumue } from 'boss-css/runtime'
import { onBrowserObjectStart as onBrowserObjectStart_1kpvdeu } from 'boss-css/parser/jsx/browser'
import * as runtimeApi from 'boss-css/runtime/react'
import { onBrowserObjectStart as onBrowserObjectStart_1jrxoir } from 'boss-css/strategy/inline-first/browser'
import './styles.css'

createApi_1acf3eh({
runtimeApi: runtimeApi,
framework: {
  "name": "react",
  "className": "className"
},
strategy: "inline-first",
plugins: [{
  "onBrowserObjectStart": onBrowserObjectStart_1kpvdeu
},
{
  "onBrowserObjectStart": onBrowserObjectStart_1jrxoir
}],
})
globalThis.$$ = proxy_1fumue
export const $$ = proxy_1fumue

export default proxy_1fumue
$$.tokenVars = tokenVars_1w3f7mg`)
                })

                test('keeps parsing subsequent $$ blocks when className contains -> tokens', async ({ $ }) => {
                    const api = await $.createServerApi({
                        plugins: [...$.essentialsServer, $.strategy.inlineFirstServer],
                    })

                    await api.trigger('onParse', {
                        content: `<$$
  as="a"
  className="before:content:'' hover:before:content:'->' background-color:red"
  hover={{ color: 'green' }}
>
  Hover
</$$>
<$$ hover={{ padding: [20, 0] }}>Deep array prop</$$>`,
                    })

                    expect(api.css.text).toContain(`.hover\\:padding:hover { padding: var(--hover-padding) !important }`)
                    expect(api.css.text).toContain(`.hover\\:color:hover { color: var(--hover-color) !important }`)
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

    describe('types', () => {
        test('dts template uses framework types', async ({ $ }) => {
            const { dts } = await $.typeTest({
                files: {
                    'case.ts': 'export {}',
                },
            })

            expect(dts).toContain('type BossElementType = BossJSX.ElementType')
            expect(dts).toContain('type BossComponentProps<C> = C extends keyof BossIntrinsicElements')
            expect(dts).toContain(': BossJSX.ComponentPropsWithoutRef<C>')
        })

        test('as prop and component props are enforced', async ({ $ }) => {
            const source = `import './bo$$'

const Custom = (props: { id: string }) => null
const Link = (props: { to: string; replace?: boolean }) => null

$$.$({ as: 'a', href: 'https://example.com' })
$$.$({ display: 'flex' })
$$.$({ as: Custom, id: 'ok' })
$$.$({ as: Link, to: '/docs' })
$$.$({ as: Link, to: '/docs', replace: true })
$$.a({ href: 'https://example.com' })

// @ts-expect-error href requires as="a"
$$.$({ href: 'https://example.com' })

// @ts-expect-error unknown prop
$$.$({ foo: 'bar' })

// @ts-expect-error missing required prop
$$.$({ as: Custom })

// @ts-expect-error missing required prop
$$.$({ as: Link })

// @ts-expect-error wrong handler type
$$.$({ onClick: 'nope' })

const good = <$$ as="a" href="https://example.com" />
const goodLink = <$$ as={Link} to="/docs" />
const goodLinkReplace = <$$ as={Link} to="/docs" replace />

// @ts-expect-error href invalid on div
const badHref = <$$ href="https://example.com" />

// @ts-expect-error unknown prop
const badFoo = <$$ foo="bar" />

// @ts-expect-error to requires as={Link}
const badTo = <$$ to="/docs" />

// @ts-expect-error missing required prop
const badCustom = <$$ as={Custom} />

// @ts-expect-error missing required prop
const badLink = <$$ as={Link} />
`

            const { diagnostics, formattedDiagnostics } = await $.typeTest({
                files: {
                    'case.tsx': source,
                },
            })

            expect(diagnostics, formattedDiagnostics).toStrictEqual([])
        })

        test('prepared assignments are as-aware', async ({ $ }) => {
            const preparedSource = `$$.PreparedLink = $$.$({ as: 'a', href: '' })
$$.PreparedBox = $$.$({ display: 'flex' })
`

            const source = `import './bo$$'

$$.PreparedLink = $$.$({ as: 'a', href: '' })
$$.PreparedBox = $$.$({ display: 'flex' })

// @ts-expect-error href requires as="a"
$$.PreparedLink = $$.$({ href: '' })

// @ts-expect-error unknown prop
$$.PreparedBox = $$.$({ foo: 'bar' })
`

            const { diagnostics, formattedDiagnostics } = await $.typeTest({
                parse: preparedSource,
                files: {
                    'case.ts': source,
                },
            })

            expect(diagnostics, formattedDiagnostics).toStrictEqual([])
        }, 15000)

        test('prepared components render as JSX members', async ({ $ }) => {
            const preparedSource = `$$.PreparedLink = $$.$({ as: 'a', href: '' })
$$.PreparedBox = $$.$({ display: 'flex' })
`

            const source = `import './bo$$'

const okDefault = <$$.PreparedBox />
const okLink = <$$.PreparedLink as="a" href="" />

// @ts-expect-error href requires as="a"
const badLink = <$$.PreparedLink href="" />

// @ts-expect-error unknown prop
const badBox = <$$.PreparedBox foo="bar" />
`

            const { diagnostics, formattedDiagnostics } = await $.typeTest({
                parse: preparedSource,
                files: {
                    'case.tsx': source,
                },
            })

            expect(diagnostics, formattedDiagnostics).toStrictEqual([])
        })

        test('style helper typechecks', async ({ $ }) => {
            const source = `import './bo$$'

const props = $$.style({ color: 'red' }, { hover: { color: 'blue' } })
const propsWithClass = $$.style({ className: 'card', display: 'flex' })

// @ts-expect-error unknown prop
$$.style({ notAProp: 123 })
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
