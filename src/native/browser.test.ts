import { describe, expect, test } from 'vitest'
import { createApi as createBrowserApi } from '@/api/browser'
import * as nativeBrowser from '@/native/browser'

describe('native browser', () => {
    test('maps style props into native style and passes through non-style props', async () => {
        const api = createBrowserApi(
            {
                plugins: [nativeBrowser],
                nativeStyleProps: ['color', 'margin', 'shadowOffset'],
                tokens: { color: { primary: '#f0f' } },
                runtime: { only: true },
            },
            true,
        )

        const input = {
            color: 'primary',
            margin: '12',
            testID: 'card',
            style: { opacity: 0.5 },
            shadowOffset: { width: 2, height: 4 },
        }
        const output: Record<string, unknown> = {}

        api.trigger('onBrowserObjectStart', { input, output })

        expect(output.testID).toBe('card')
        expect(output.style).toStrictEqual({
            opacity: 0.5,
            color: '#f0f',
            margin: 12,
            shadowOffset: { width: 2, height: 4 },
        })
    })

    test('appends boss styles to existing style arrays', async () => {
        const api = createBrowserApi(
            {
                plugins: [nativeBrowser],
                nativeStyleProps: ['color'],
                tokens: { color: { primary: '#f0f' } },
                runtime: { only: true },
            },
            true,
        )

        const input = {
            color: 'primary',
            style: [{ opacity: 0.25 }],
        }
        const output: Record<string, unknown> = {}

        api.trigger('onBrowserObjectStart', { input, output })

        expect(Array.isArray(output.style)).toBe(true)
        expect(output.style).toStrictEqual([{ opacity: 0.25 }, { color: '#f0f' }])
    })
})
