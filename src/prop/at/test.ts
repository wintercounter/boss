import { describe, expect } from 'vitest'
import hash from '@emotion/hash'

describe('at', () => {
    describe('e2e', () => {
        describe('server', () => {
            describe('essentials', () => {
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

                test('at:dark', async ({ $ }) => {
                    const api = await $.createServerApi({
                        plugins: [...$.essentialsServer, $.strategy.inlineFirstServer],
                    })
                    await api.trigger('onParse', {
                        content: `<$$ at={{ dark: { fontStyle: 'italic' } }}>`,
                    })

                    expect(api.css.text.trim()).toStrictEqual(
                        `@media screen and (prefers-color-scheme: dark) { .at\\:dark\\:font-style { font-style: var(--at-dark-font-style) !important } }`,
                    )
                })

                test('dark', async ({ $ }) => {
                    const api = await $.createServerApi({
                        plugins: [...$.essentialsServer, $.strategy.inlineFirstServer],
                    })
                    await api.trigger('onParse', {
                        content: `<$$ dark={ { fontStyle: 'italic' } }>`,
                    })

                    expect(api.css.text.trim()).toStrictEqual(
                        `@media screen and (prefers-color-scheme: dark) { .dark\\:font-style { font-style: var(--dark-font-style) !important } }`,
                    )
                })

                test('at:mobile', async ({ $ }) => {
                    const api = await $.createServerApi({
                        plugins: [...$.essentialsServer, $.strategy.inlineFirstServer],
                    })
                    await api.trigger('onParse', {
                        content: `<$$ at={{ mobile: { fontStyle: 'italic' } }}>`,
                    })

                    expect(api.css.text.trim()).toStrictEqual(
                        `@media screen and (min-width: 376px) and (max-width: 639px) { .at\\:mobile\\:font-style { font-style: var(--at-mobile-font-style) !important } }`,
                    )
                })

                test('mobile', async ({ $ }) => {
                    const api = await $.createServerApi({
                        plugins: [...$.essentialsServer, $.strategy.inlineFirstServer],
                    })
                    await api.trigger('onParse', {
                        content: `<$$ mobile={{ fontStyle: 'italic' }}>`,
                    })

                    expect(api.css.text.trim()).toStrictEqual(
                        `@media screen and (min-width: 376px) and (max-width: 639px) { .mobile\\:font-style { font-style: var(--mobile-font-style) !important } }`,
                    )
                })

                test('at:mobile+', async ({ $ }) => {
                    const api = await $.createServerApi({
                        plugins: [...$.essentialsServer, $.strategy.inlineFirstServer],
                    })
                    await api.trigger('onParse', {
                        content: `<$$ at={{ 'mobile+': { fontStyle: 'italic' } }}>`,
                    })

                    expect(api.css.text.trim()).toStrictEqual(
                        `@media screen and (min-width: 376px) { .at\\:mobile\\+\\:font-style { font-style: var(--at-mobile\\+-font-style) !important } }`,
                    )
                })

                test('at:mobile+:hover', async ({ $ }) => {
                    const api = await $.createServerApi({
                        plugins: [...$.essentialsServer, $.strategy.inlineFirstServer],
                    })
                    await api.trigger('onParse', {
                        content: `<$$ at={{ 'mobile+': { fontStyle: 'italic', hover: { display: 'block' } } }}>`,
                    })

                    expect(api.css.text.trim()).toStrictEqual(
                        `@media screen and (min-width: 376px) { .at\\:mobile\\+\\:font-style { font-style: var(--at-mobile\\+-font-style) !important } }
@media screen and (min-width: 376px) { .at\\:mobile\\+\\:hover\\:display:hover { display: var(--at-mobile\\+-hover-display) !important } }`,
                    )
                })

                test('container:mobile', async ({ $ }) => {
                    const api = await $.createServerApi({
                        plugins: [...$.essentialsServer, $.strategy.inlineFirstServer],
                    })
                    await api.trigger('onParse', {
                        content: `<$$ container={{ mobile: { fontStyle: 'italic' } }}>`,
                    })

                    expect(api.css.text.trim()).toStrictEqual(
                        `@container (min-width: 376px) and (max-width: 639px) { .container\\:mobile\\:font-style { font-style: var(--container-mobile-font-style) !important } }`,
                    )
                })

                test('container_card:mobile', async ({ $ }) => {
                    const api = await $.createServerApi({
                        plugins: [...$.essentialsServer, $.strategy.inlineFirstServer],
                    })
                    await api.trigger('onParse', {
                        content: `<$$ container_card={{ mobile: { fontStyle: 'italic' } }}>`,
                    })

                    expect(api.css.text.trim()).toStrictEqual(
                        `@container card (min-width: 376px) and (max-width: 639px) { .container_card\\:mobile\\:font-style { font-style: var(--container-card-mobile-font-style) !important } }`,
                    )
                })

                test('container_card_large:mobile', async ({ $ }) => {
                    const api = await $.createServerApi({
                        plugins: [...$.essentialsServer, $.strategy.inlineFirstServer],
                    })
                    await api.trigger('onParse', {
                        content: `<$$ container_card_large={{ mobile: { fontStyle: 'italic' } }}>`,
                    })

                    expect(api.css.text.trim()).toStrictEqual(
                        `@container card_large (min-width: 376px) and (max-width: 639px) { .container_card_large\\:mobile\\:font-style { font-style: var(--container-card_large-mobile-font-style) !important } }`,
                    )
                })

                test('at:container card:mobile', async ({ $ }) => {
                    const api = await $.createServerApi({
                        plugins: [...$.essentialsServer, $.strategy.inlineFirstServer],
                    })
                    await api.trigger('onParse', {
                        content: `<$$ at={{ 'container card': { mobile: { fontStyle: 'italic' } } }}>`,
                    })

                    expect(api.css.text.trim()).toStrictEqual(
                        `@container card (min-width: 376px) and (max-width: 639px) { .at\\:container_card\\:mobile\\:font-style { font-style: var(--at-container-card-mobile-font-style) !important } }`,
                    )
                })

                test('at:container card:mobile:hover', async ({ $ }) => {
                    const api = await $.createServerApi({
                        plugins: [...$.essentialsServer, $.strategy.inlineFirstServer],
                    })
                    await api.trigger('onParse', {
                        content: `<$$ at={{ 'container card': { mobile: { hover: { display: 'block' } } } }}>`,
                    })

                    const contexts = ['at', 'container card', 'mobile', 'hover']
                    const className = api.contextToClassName('display', null, contexts, true, api.selectorPrefix)
                    const varName = api.contextToCSSVariable('display', null, contexts, api.selectorPrefix)

                    expect(api.css.text.trim()).toStrictEqual(
                        `@container card (min-width: 376px) and (max-width: 639px) { .${className}:hover { display: var(${varName}) !important } }`,
                    )
                })

                test('at:container card:mobile child selector', async ({ $ }) => {
                    const api = await $.createServerApi({
                        plugins: [...$.essentialsServer, $.strategy.inlineFirstServer],
                    })
                    await api.trigger('onParse', {
                        content: `<$$ at={{ 'container card': { mobile: { child: { '.item': { color: 'red' } } } } }}>`,
                    })

                    const contexts = ['at', 'container card', 'mobile', '[.item]']
                    const className = api.contextToClassName('color', null, contexts, true, api.selectorPrefix)
                    const varName = api.contextToCSSVariable('color', null, contexts, api.selectorPrefix)
                    const selector = api.applyChildSelectors(`.${className}`, contexts)

                    expect(api.css.text.trim()).toStrictEqual(
                        `@container card (min-width: 376px) and (max-width: 639px) { ${selector} { color: var(${varName}) !important } }`,
                    )
                })

                test('keyframes', async ({ $ }) => {
                    const api = await $.createServerApi({
                        plugins: [...$.essentialsServer, $.strategy.inlineFirstServer],
                    })
                    await api.trigger('onParse', {
                        content: `<$$ keyframes={{ from: { width: 0 }, to: { width: '100%' } }}>`,
                    })

                    const signature = `${api.selectorPrefix ?? ''}|keyframes`
                    const keyframesName = `kf-${hash(signature)}`
                    const fromContexts = ['keyframes', 'from']
                    const toContexts = ['keyframes', 'to']
                    const fromClassName = api.contextToClassName('width', null, fromContexts, true, api.selectorPrefix)
                    const toClassName = api.contextToClassName('width', null, toContexts, true, api.selectorPrefix)
                    const fromVar = api.contextToCSSVariable('width', null, fromContexts, api.selectorPrefix)
                    const toVar = api.contextToCSSVariable('width', null, toContexts, api.selectorPrefix)

                    expect(api.css.text.trim()).toStrictEqual(
                        `@keyframes ${keyframesName} { 0% { width: var(${fromVar}) } 100% { width: var(${toVar}) } }
.${fromClassName} { animation-name: ${keyframesName} !important }
.${toClassName} { animation-name: ${keyframesName} !important }`,
                    )
                })

                test('keyframes_fade', async ({ $ }) => {
                    const api = await $.createServerApi({
                        plugins: [...$.essentialsServer, $.strategy.inlineFirstServer],
                    })
                    await api.trigger('onParse', {
                        content: `<$$ keyframes_fade={{ from: { width: 0 }, to: { width: '100%' } }}>`,
                    })

                    const fromContexts = ['keyframes fade', 'from']
                    const toContexts = ['keyframes fade', 'to']
                    const fromClassName = api.contextToClassName('width', null, fromContexts, true, api.selectorPrefix)
                    const toClassName = api.contextToClassName('width', null, toContexts, true, api.selectorPrefix)
                    const fromVar = api.contextToCSSVariable('width', null, fromContexts, api.selectorPrefix)
                    const toVar = api.contextToCSSVariable('width', null, toContexts, api.selectorPrefix)

                    expect(api.css.text.trim()).toStrictEqual(
                        `@keyframes fade { 0% { width: var(${fromVar}) } 100% { width: var(${toVar}) } }
.${fromClassName} { animation-name: fade !important }
.${toClassName} { animation-name: fade !important }`,
                    )
                })

                test('keyframes_spin_fast', async ({ $ }) => {
                    const api = await $.createServerApi({
                        plugins: [...$.essentialsServer, $.strategy.inlineFirstServer],
                    })
                    await api.trigger('onParse', {
                        content: `<$$ keyframes_spin_fast={{ from: { width: 0 }, to: { width: '100%' } }}>`,
                    })

                    const fromContexts = ['keyframes spin_fast', 'from']
                    const toContexts = ['keyframes spin_fast', 'to']
                    const fromClassName = api.contextToClassName('width', null, fromContexts, true, api.selectorPrefix)
                    const toClassName = api.contextToClassName('width', null, toContexts, true, api.selectorPrefix)
                    const fromVar = api.contextToCSSVariable('width', null, fromContexts, api.selectorPrefix)
                    const toVar = api.contextToCSSVariable('width', null, toContexts, api.selectorPrefix)

                    expect(api.css.text.trim()).toStrictEqual(
                        `@keyframes spin_fast { 0% { width: var(${fromVar}) } 100% { width: var(${toVar}) } }
.${fromClassName} { animation-name: spin_fast !important }
.${toClassName} { animation-name: spin_fast !important }`,
                    )
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

                test('at:dark', async ({ $ }) => {
                    const api = await $.createBrowserApi({
                        plugins: [...$.essentialsBrowser, $.strategy.inlineFirstBrowser],
                    })

                    const props = {}
                    api.trigger('onBrowserObjectStart', {
                        output: props,
                        input: {
                            at: {
                                dark: {
                                    fontStyle: 'italic',
                                },
                            },
                        },
                    })

                    expect(props).toStrictEqual({
                        className: 'at:dark:font-style',
                        style: {
                            '--at-dark-font-style': 'italic',
                        },
                    })
                })

                test('dark', async ({ $ }) => {
                    const api = await $.createBrowserApi({
                        plugins: [...$.essentialsBrowser, $.strategy.inlineFirstBrowser],
                    })

                    const props = {}
                    api.trigger('onBrowserObjectStart', {
                        output: props,
                        input: {
                            dark: {
                                fontStyle: 'italic',
                            },
                        },
                    })

                    expect(props).toStrictEqual({
                        className: 'dark:font-style',
                        style: {
                            '--dark-font-style': 'italic',
                        },
                    })
                })

                test('at:mobile+:hover', async ({ $ }) => {
                    const api = await $.createBrowserApi({
                        plugins: [...$.essentialsBrowser, $.strategy.inlineFirstBrowser],
                    })

                    const props = {}
                    api.trigger('onBrowserObjectStart', {
                        output: props,
                        input: {
                            at: {
                                'mobile+': {
                                    fontStyle: 'italic',
                                    hover: {
                                        display: 'block',
                                    },
                                },
                            },
                        },
                    })

                    expect(props).toStrictEqual({
                        className: 'at:mobile+:font-style at:mobile+:hover:display',
                        style: {
                            '--at-mobile\\+-font-style': 'italic',
                            '--at-mobile\\+-hover-display': 'block',
                        },
                    })
                })

                test('container:mobile', async ({ $ }) => {
                    const api = await $.createBrowserApi({
                        plugins: [...$.essentialsBrowser, $.strategy.inlineFirstBrowser],
                    })

                    const props = {}
                    api.trigger('onBrowserObjectStart', {
                        output: props,
                        input: {
                            container: {
                                mobile: {
                                    fontStyle: 'italic',
                                },
                            },
                        },
                    })

                    expect(props).toStrictEqual({
                        className: 'container:mobile:font-style',
                        style: {
                            '--container-mobile-font-style': 'italic',
                        },
                    })
                })
            })
        })
    })

    describe('types', () => {
        test('shorthand and nested at props typecheck', async ({ $ }) => {
            const source = `import './bo$$'

$$.$({
    at: {
        mobile: { color: 'cyan' },
        custom: { display: 'flex' },
    },
    mobile: { color: 'red' },
})

$$.$({ container: { mobile: { color: 'cyan' } } })
$$.$({ container: 'card / inline-size' })
$$.$({ container_card: { mobile: { color: 'cyan' } } })
$$.$({ at: { 'container card': { mobile: { color: 'cyan' } } } })
$$.$({ keyframes: { from: { opacity: 0 }, to: { opacity: 1 } } })
$$.$({ keyframes_fade: { from: { opacity: 0 }, to: { opacity: 1 } } })
$$.$({ at: { keyframes: { from: { opacity: 0 }, to: { opacity: 1 } } } })
$$.$({ at: { 'keyframes fade': { from: { opacity: 0 }, to: { opacity: 1 } } } })

// @ts-expect-error unknown prop inside at
$$.$({ at: { mobile: { foo: 'bar' } } })

// @ts-expect-error unknown prop inside shorthand
$$.$({ mobile: { foo: 'bar' } })
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
