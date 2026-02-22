import { beforeEach, describe, expect } from 'vitest'

import { create, resolveRuntimeToken, tokenPaths } from '@/use/token/runtime-only'
import { RuntimeCSS } from '@/strategy/runtime-only/css'

describe('runtime-only tokens', () => {
    beforeEach(() => {
        tokenPaths.clear()
    })

    test('resolves group token paths from $$ proxy', async ({ $ }) => {
        const api = await $.createBrowserApi({
            runtime: { only: true },
            tokens: {
                color: {
                    primary: '#123',
                },
            },
        })

        const value = create().color.primary
        const token = resolveRuntimeToken(api, 'color', value)

        expect(token).toMatchObject({
            value: 'var(--color-primary)',
            selectorValue: 'primary',
            tokenKey: 'primary',
            tokenPath: 'color.primary',
        })
    })

    test('resolves prop token values in runtime-only mode', async ({ $ }) => {
        const api = await $.createBrowserApi({
            runtime: { only: true },
            tokens: {
                size: {
                    sm: 8,
                },
            },
        })

        const token = resolveRuntimeToken(api, 'gap', 'sm')

        expect(token).toMatchObject({
            value: 'var(--size-sm)',
            selectorValue: 'sm',
            tokenKey: 'sm',
            tokenPath: 'size.sm',
        })
    })

    test('resolves token groups by prop name in runtime-only mode', async ({ $ }) => {
        const api = await $.createBrowserApi({
            runtime: { only: true },
            tokens: {
                borderRadius: {
                    xl: 24,
                },
            },
        })

        const token = resolveRuntimeToken(api, 'borderRadius', 'xl')

        expect(token).toMatchObject({
            value: 'var(--borderRadius-xl)',
            selectorValue: 'xl',
            tokenKey: 'xl',
            tokenPath: 'borderRadius.xl',
        })
    })

    test('resolves color token alpha in runtime-only mode', async ({ $ }) => {
        const api = await $.createBrowserApi({
            runtime: { only: true },
            tokens: {
                color: {
                    gray: {
                        '600': '#1f2937',
                    },
                },
            },
        })

        const token = resolveRuntimeToken(api, 'color', 'gray.600/60')

        expect(token).toMatchObject({
            value: 'color-mix(in oklab, var(--color-gray-600) 60%, transparent)',
            selectorValue: 'gray.600/60',
            tokenKey: 'gray.600/60',
            tokenPath: 'color.gray.600',
        })
    })

    test('resolves dotted token paths in runtime-only mode', async ({ $ }) => {
        const api = await $.createBrowserApi({
            runtime: { only: true },
            tokens: {
                color: {
                    accent: {
                        '400': '#38bdf8',
                    },
                },
            },
        })

        const token = resolveRuntimeToken(api, 'borderColor', 'accent.400')

        expect(token).toMatchObject({
            value: 'var(--color-accent-400)',
            selectorValue: 'accent.400',
            tokenKey: 'accent.400',
            tokenPath: 'color.accent.400',
        })
    })

    test('resolves shorthand tokens by matching group keys in runtime-only mode', async ({ $ }) => {
        const api = await $.createBrowserApi({
            runtime: { only: true },
            tokens: {
                color: {
                    black: '#000000',
                },
                shadow: {
                    black: {
                        color: '#000000',
                        offsetX: 0,
                        offsetY: 1,
                        blur: 2,
                    },
                },
            },
        })

        const token = resolveRuntimeToken(api, 'textShadow', 'black')

        expect(token).toMatchObject({
            value: 'var(--shadow-black)',
            selectorValue: 'black',
            tokenKey: 'black',
            tokenPath: 'shadow.black',
        })
    })

    test('falls back to color when shadow group is missing', async ({ $ }) => {
        const api = await $.createBrowserApi({
            runtime: { only: true },
            tokens: {
                color: {
                    black: '#000000',
                },
                shadow: {
                    soft: {
                        color: '#000000',
                        offsetX: 0,
                        offsetY: 2,
                        blur: 4,
                    },
                },
            },
        })

        const token = resolveRuntimeToken(api, 'textShadow', 'black')

        expect(token).toMatchObject({
            value: 'var(--color-black)',
            selectorValue: 'black',
            tokenKey: 'black',
            tokenPath: 'color.black',
        })
    })

    test('resolves DTCG tokens in runtime-only mode', async ({ $ }) => {
        const api = await $.createBrowserApi({
            runtime: { only: true },
            tokens: {
                color: {
                    $type: 'color',
                    black: { $value: '#000000' },
                    link: { $value: { $ref: '#/color/black/$value' } },
                },
            },
        })

        api.css = new RuntimeCSS(api)

        const token = resolveRuntimeToken(api, 'color', 'link')

        expect(token).toMatchObject({
            value: 'var(--color-link)',
            selectorValue: 'link',
            tokenKey: 'link',
            tokenPath: 'color.link',
        })
        expect(api.css.root.has('--color-link: #000000;')).toBe(true)
    })

    test('emits runtime token vars on use', async ({ $ }) => {
        const api = await $.createBrowserApi({
            runtime: { only: true },
            tokens: {
                color: {
                    accent: {
                        '400': '#38bdf8',
                    },
                },
            },
        })

        api.css = new RuntimeCSS(api)

        const token = resolveRuntimeToken(api, 'borderColor', 'accent.400')

        expect(token).toMatchObject({
            value: 'var(--color-accent-400)',
            selectorValue: 'accent.400',
        })
        expect(api.css.root.has('--color-accent-400: #38bdf8;')).toBe(true)
    })

    test('returns CSS variables in hybrid mode when server token exists', async ({ $ }) => {
        const api = await $.createBrowserApi({
            runtime: { only: false },
            selectorPrefix: 'boss-',
            tokens: {
                color: {
                    primary: '#123',
                },
            },
        })

        tokenPaths.add('color.primary')

        const token = resolveRuntimeToken(api, 'color', 'primary')

        expect(token).toMatchObject({
            value: 'var(--boss-color-primary)',
            selectorValue: 'primary',
            tokenKey: 'primary',
            tokenPath: 'color.primary',
        })
    })

    test('returns literal values in hybrid mode when server token is missing', async ({ $ }) => {
        const api = await $.createBrowserApi({
            runtime: { only: false },
            tokens: {
                color: {
                    primary: '#123',
                },
            },
        })

        const token = resolveRuntimeToken(api, 'color', 'primary')

        expect(token).toMatchObject({
            value: '#123',
            selectorValue: '#123',
            tokenKey: 'primary',
            tokenPath: 'color.primary',
        })
    })

    test('returns null for unknown token values', async ({ $ }) => {
        const api = await $.createBrowserApi({
            runtime: { only: true },
        })

        const token = resolveRuntimeToken(api, 'color', 'unknown')

        expect(token).toBeNull()
    })
})
