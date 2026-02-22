import { describe, expect } from 'vitest'

import { RuntimeCSS } from '@/strategy/runtime-only/css'
import { resolveAtQuery } from '@/prop/at/runtime-only'

type OutputProps = Record<string, unknown> & { className?: string; style?: Record<string, unknown> }

describe('runtime-only strategies', () => {
    test('runtime-only strategy initializes RuntimeCSS', async ({ $ }) => {
        const api = await $.createBrowserApi({
            plugins: [$.strategy.runtimeRuntimeOnly],
            strategy: 'inline-first',
        })

        expect(api.css).toBeInstanceOf(RuntimeCSS)
    })

    test('non-runtime strategy does not create RuntimeCSS', async ({ $ }) => {
        const api = await $.createBrowserApi({
            plugins: [$.strategy.inlineFirstBrowser],
        })

        expect(api.css).toBeUndefined()
    })

    test('inline-first runtime-only outputs inline styles and nested vars', async ({ $ }) => {
        const api = await $.createBrowserApi({
            plugins: [$.strategy.runtimeRuntimeOnly],
            strategy: 'inline-first',
        })

        const props: OutputProps = {}
        api.trigger('onBrowserObjectStart', {
            output: props,
            tag: 'div',
            input: {
                display: 'block',
                hover: { color: 'red' },
            },
        })

        expect(props).toStrictEqual({
            className: 'hover:color',
            style: { display: 'block', '--hover-color': 'red' },
        })
    })

    test('inline-first runtime-only resolves @at contexts', async ({ $ }) => {
        const api = await $.createBrowserApi({
            plugins: [$.strategy.runtimeRuntimeOnly],
            strategy: 'inline-first',
        })

        const props: OutputProps = {}
        api.trigger('onBrowserObjectStart', {
            output: props,
            tag: 'div',
            input: {
                at: { mobile: { color: 'red' } },
            },
        })

        expect(props).toStrictEqual({
            className: 'at:mobile:color',
            style: { '--at-mobile-color': 'red' },
        })
    })

    test('inline-first runtime-only resolves function values', async ({ $ }) => {
        const api = await $.createBrowserApi({
            plugins: [$.strategy.runtimeRuntimeOnly],
            strategy: 'inline-first',
        })

        const props: OutputProps = {}
        api.trigger('onBrowserObjectStart', {
            output: props,
            tag: 'div',
            input: {
                hover: { color: () => 'red' },
            },
        })

        expect(props).toStrictEqual({
            className: 'hover:color',
            style: { '--hover-color': 'red' },
        })
    })

    test('classname-first runtime-only outputs classnames with values', async ({ $ }) => {
        const api = await $.createBrowserApi({
            plugins: [$.strategy.runtimeRuntimeOnly],
            strategy: 'classname-first',
        })

        const props: OutputProps = {}
        api.trigger('onBrowserObjectStart', {
            output: props,
            tag: 'div',
            input: {
                color: 'red',
                hover: { color: 'blue' },
            },
        })

        expect(props).toStrictEqual({
            className: 'color:red hover:color:blue',
        })
    })

    test('classname-first runtime-only resolves function values', async ({ $ }) => {
        const api = await $.createBrowserApi({
            plugins: [$.strategy.runtimeRuntimeOnly],
            strategy: 'classname-first',
        })

        const props: OutputProps = {}
        api.trigger('onBrowserObjectStart', {
            output: props,
            tag: 'div',
            input: {
                color: () => 'red',
            },
        })

        expect(props).toStrictEqual({
            className: 'color:red',
        })
    })

    test('classic runtime-only emits a single hashed class', async ({ $ }) => {
        const api = await $.createBrowserApi({
            plugins: [$.strategy.runtimeRuntimeOnly],
            strategy: 'classic',
        })

        const props: OutputProps = {}
        api.trigger('onBrowserObjectStart', {
            output: props,
            tag: 'div',
            input: {
                color: 'red',
                hover: { color: 'blue' },
            },
        })

        expect(props.style).toBeUndefined()
        expect(props.className ?? '').toMatch(/^classic-/)
        expect((props.className ?? '').split(' ').length).toBe(1)
    })

    test('runtime-only tokens resolve to literal values', async ({ $ }) => {
        const api = await $.createBrowserApi({
            plugins: [$.strategy.runtimeRuntimeOnly],
            strategy: 'inline-first',
            tokens: {
                color: {
                    primary: '#111',
                },
            },
        })

        const props: OutputProps = {}
        api.trigger('onBrowserObjectStart', {
            output: props,
            tag: 'div',
            input: {
                color: 'primary',
            },
        })

        expect(props).toStrictEqual({
            style: { color: '#111' },
        })
    })

    test('resolveAtQuery uses custom breakpoints', async ({ $ }) => {
        const api = await $.createBrowserApi({
            breakpoints: {
                wide: [1000, null],
            },
            plugins: [$.prop.atRuntimeOnly],
        })

        const query = resolveAtQuery(api, ['at', 'wide'])
        expect(query).toBe('@media screen and (min-width: 1000px)')
    })
})
