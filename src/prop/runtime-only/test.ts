import { describe, expect } from 'vitest'

import { resolveAtQuery } from '@/prop/at/runtime-only'
import { createChildContext } from '@/prop/child/runtime-only'

describe('runtime-only prop modules', () => {
    test('pseudo runtime-only registers pseudo props', async ({ $ }) => {
        const api = await $.createBrowserApi({
            plugins: [$.prop.pseudoRuntimeOnly],
        })

        expect(api.dictionary.get('hover')).toBeTruthy()
        expect(api.dictionary.get('before')).toBeTruthy()
    })

    test('child runtime-only registers child prop', async ({ $ }) => {
        const api = await $.createBrowserApi({
            plugins: [$.prop.childRuntimeOnly],
        })

        expect(api.dictionary.get('child')).toBeTruthy()
        expect(createChildContext('button span')).toBe('[button_span]')
    })

    test('at runtime-only sets breakpoints', async ({ $ }) => {
        const api = await $.createBrowserApi({
            plugins: [$.prop.atRuntimeOnly],
        })

        expect(api.breakpoints?.mobile).toBeTruthy()
        expect(resolveAtQuery(api, ['at', 'mobile'])).toBe(
            '@media screen and (min-width: 376px) and (max-width: 639px)',
        )
        expect(resolveAtQuery(api, ['at', 'mobile+'])).toBe('@media screen and (min-width: 376px)')
        expect(resolveAtQuery(api, ['at', 'mobile-'])).toBe('@media screen and (max-width: 639px)')
        expect(resolveAtQuery(api, ['at', '200-400'])).toBe(
            '@media screen and (min-width: 200px) and (max-width: 400px)',
        )
        expect(resolveAtQuery(api, ['at', '200+'])).toBe('@media screen and (min-width: 200px)')
        expect(resolveAtQuery(api, ['at', '200-'])).toBe('@media screen and (max-width: 200px)')
        expect(resolveAtQuery(api, ['at', 'mobile-810'])).toBe(
            '@media screen and (min-width: 376px) and (max-width: 810px)',
        )
        expect(resolveAtQuery(api, ['at', '810-mobile'])).toBe(
            '@media screen and (min-width: 810px) and (max-width: 639px)',
        )
        expect(resolveAtQuery(api, ['at', 'container', 'mobile'])).toBe(
            '@container (min-width: 376px) and (max-width: 639px)',
        )
        expect(resolveAtQuery(api, ['at', 'container_card', '200-400'])).toBe(
            '@container card (min-width: 200px) and (max-width: 400px)',
        )
        expect(resolveAtQuery(api, ['container', '400+'])).toBe('@container (min-width: 400px)')
        expect(resolveAtQuery(api, ['dark'])).toBe('@media screen and (prefers-color-scheme: dark)')
        expect(resolveAtQuery(api, ['@media screen and (min-width: 1200px)'])).toBe(
            '@media screen and (min-width: 1200px)',
        )
    })
})
