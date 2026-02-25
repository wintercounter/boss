import { describe, expect } from 'vitest'
import { proxy as $$ } from '@/runtime'
import { merge as mergeUtil } from '@/merge'

describe('runtime', () => {
    describe('proxy helpers', () => {
        test('no-op marker returns input', async () => {
            const obj = { color: 'red' }
            const token = 'display:flex'

            expect($$.$(obj)).toBe(obj)
            expect($$.$(token)).toBe(token)
        })

        test('merge helper matches merge util', async () => {
            expect($$.merge('color:red', 'color:blue')).toBe(mergeUtil('color:red', 'color:blue'))
            expect($$.merge({ hover: { color: 'red' } }, { hover: { fontWeight: 'bold' } })).toStrictEqual(
                mergeUtil({ hover: { color: 'red' } }, { hover: { fontWeight: 'bold' } }),
            )
        })

        test('cx resolves boss conflicts', async () => {
            expect($$.cx('card', { 'color:red': true }, ['color:blue'])).toBe('card color:blue')
        })

        test('cv resolves variants', async () => {
            const button = $$.cv({
                base: 'display:flex',
                variants: {
                    tone: {
                        primary: 'color:red',
                        secondary: 'color:blue',
                    },
                    size: {
                        sm: 'padding:4',
                        lg: 'padding:8',
                    },
                },
                defaultVariants: { tone: 'primary', size: 'sm' },
            })
            const tokens = String(button()).split(' ').filter(Boolean).sort()
            expect(tokens).toStrictEqual(['color:red', 'display:flex', 'padding:4'])
        })

        test('scv resolves slot variants', async () => {
            const card = $$.scv({
                slots: ['root', 'title'],
                base: {
                    root: 'display:flex',
                    title: 'font-weight:700',
                },
                variants: {
                    tone: {
                        primary: { root: 'color:red', title: 'color:red' },
                        secondary: { root: 'color:blue', title: 'color:blue' },
                    },
                },
                defaultVariants: { tone: 'primary' },
            })
            const result = card()
            expect(result.root.split(' ').sort()).toStrictEqual(['color:red', 'display:flex'])
            expect(result.title.split(' ').sort()).toStrictEqual(['color:red', 'font-weight:700'])
        })

        test('sv resolves style variants', async () => {
            const style = $$.sv({
                base: { color: 'red' },
                variants: {
                    tone: {
                        primary: { color: 'red' },
                        secondary: { color: 'blue' },
                    },
                },
                compoundVariants: [{ tone: 'secondary', style: { fontWeight: 'bold' } }],
                defaultVariants: { tone: 'primary' },
            })

            expect(style({ tone: 'primary' })).toStrictEqual({ color: 'red' })
            expect(style({ tone: 'secondary', style: { margin: 1 } })).toStrictEqual({
                color: 'blue',
                fontWeight: 'bold',
                margin: 1,
            })
        })
    })

    describe('components', () => {
        test('default element uses runtime api output', async ({ $ }) => {
            await $.createBrowserApi({
                runtimeApi: {
                    createElement: (Component: any, props: any, children: any) => ({ Component, props, children }),
                },
                plugins: [...$.essentialsBrowser, $.strategy.inlineFirstBrowser],
            })

            const result = $$({ className: 'card', color: 'red', children: 'Hi' })

            expect(result.props).toStrictEqual({
                className: 'card',
                style: { color: 'red' },
            })
            expect(result.children).toBe('Hi')
        })

        test('as prop switches tag handling', async ({ $ }) => {
            await $.createBrowserApi({
                runtimeApi: {
                    createElement: (Component: any, props: any, children: any) => ({ Component, props, children }),
                },
                plugins: [...$.essentialsBrowser, $.strategy.inlineFirstBrowser],
            })

            const result = $$({ as: 'a', href: '/docs', color: 'red' })
            expect(result.props).toStrictEqual({
                href: '/docs',
                style: { color: 'red' },
            })
        })

        test('tag-specific proxy works', async ({ $ }) => {
            await $.createBrowserApi({
                runtimeApi: {
                    createElement: (Component: any, props: any, children: any) => ({ Component, props, children }),
                },
                plugins: [...$.essentialsBrowser, $.strategy.inlineFirstBrowser],
            })

            const result = $$.a({ href: '/docs', color: 'red' })
            expect(result.props).toStrictEqual({
                href: '/docs',
                style: { color: 'red' },
            })
        })

        test('custom as component is rendered and receives non-css props', async ({ $ }) => {
            await $.createBrowserApi({
                runtimeApi: {
                    createElement: (Component: any, props: any, children: any) => ({ Component, props, children }),
                },
                plugins: [...$.essentialsBrowser, $.strategy.inlineFirstBrowser],
            })

            const Link = () => null
            const result = $$({
                as: Link,
                to: '/docs',
                'data-track': 'nav',
                color: 'red',
            })

            expect(result.Component).toBe(Link)
            expect(result.props).toStrictEqual({
                to: '/docs',
                'data-track': 'nav',
                style: { color: 'red' },
            })
        })

        test('non-css props are forwarded on default tag', async ({ $ }) => {
            await $.createBrowserApi({
                runtimeApi: {
                    createElement: (Component: any, props: any, children: any) => ({ Component, props, children }),
                },
                plugins: [...$.essentialsBrowser, $.strategy.inlineFirstBrowser],
            })

            const result = $$({
                to: '/docs',
                'data-track': 'hero',
                color: 'red',
            })

            expect(result.props).toStrictEqual({
                to: '/docs',
                'data-track': 'hero',
                style: { color: 'red' },
            })
        })

        test('void elements do not receive children', async ({ $ }) => {
            await $.createBrowserApi({
                runtimeApi: {
                    createElement: (Component: any, props: any, children: any) => ({ Component, props, children }),
                },
                plugins: [...$.essentialsBrowser, $.strategy.inlineFirstBrowser],
            })

            const result = $$.input({ color: 'red' })
            expect(result.props).toStrictEqual({
                style: { color: 'red' },
            })
            expect(result.children).toBeUndefined()
        })
    })

    describe('className passthrough', () => {
        test('className inputs use cx semantics', async ({ $ }) => {
            await $.createBrowserApi({
                runtimeApi: {
                    createElement: (Component: any, props: any, children: any) => ({ Component, props, children }),
                },
                plugins: [...$.essentialsBrowser, $.strategy.inlineFirstBrowser],
            })

            const result = $$({
                className: ['card', { 'color:red': true }, ['color:blue']],
                color: 'red',
            })

            expect(result.props).toStrictEqual({
                className: 'card color:blue',
                style: { color: 'red' },
            })
        })

        test('classname-first merges input and generated classes', async ({ $ }) => {
            await $.createBrowserApi({
                strategy: 'classname-first',
                runtimeApi: {
                    createElement: (Component: any, props: any, children: any) => ({ Component, props, children }),
                },
                plugins: [...$.essentialsBrowser, $.strategy.classnameFirstBrowser],
            })

            const result = $$({
                className: ['card', { 'color:red': true }, ['color:blue']],
                color: 'red',
            })
            const classList = String(result.props.className ?? '')
                .split(' ')
                .filter(Boolean)
                .sort()

            expect(classList).toStrictEqual(['card', 'color:red'])
            expect(result.props.style).toBeUndefined()
        })
    })

    describe('style', () => {
        test('inline-first returns className + style', async ({ $ }) => {
            await $.createBrowserApi({
                plugins: [...$.essentialsBrowser, $.strategy.inlineFirstBrowser],
            })

            const props = $$.style(
                { color: 'red' },
                {
                    hover: { color: 'blue' },
                },
            )

            expect(props).toStrictEqual({
                className: 'hover:color',
                style: {
                    color: 'red',
                    '--hover-color': 'blue',
                },
            })
        })

        test('classname-first returns className only', async ({ $ }) => {
            await $.createBrowserApi({
                strategy: 'classname-first',
                plugins: [...$.essentialsBrowser, $.strategy.classnameFirstBrowser],
            })

            const props = $$.style({ color: 'red' }, { hover: { color: 'blue' } })
            const classList = String(props.className ?? '')
                .split(' ')
                .filter(Boolean)
                .sort()

            expect(classList).toStrictEqual(['color:red', 'hover:color:blue'])
            expect(props.style).toBeUndefined()
        })
    })
})
