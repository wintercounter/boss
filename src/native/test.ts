import { describe, expect, test, vi } from 'vitest'
import { createApi as createServerApi } from '@/api/server'

type MockStyleProp = {
    name: string
    type: string
    description?: string
}

const mockProps = new Map<string, MockStyleProp>([
    ['color', { name: 'color', type: 'string', description: 'Text color.' }],
    ['margin', { name: 'margin', type: 'number' }],
    ['shadowOffset', { name: 'shadowOffset', type: '{ width: number; height: number }' }],
])

vi.mock('./styleTypes', () => {
    return {
        loadReactNativeStyleProps: async () => ({ props: mockProps, sourcePath: '/mock/react-native' }),
    }
})

describe('native', () => {
    test('emits native runtime output with config', async () => {
        const nativeServer = await import('@/native/server')
        const api = await createServerApi(
            {
                plugins: [nativeServer],
                tokens: { color: { primary: '#f0f' } },
            },
            true,
        )

        await api.trigger('onParse', { content: '<$$ />' })

        const runtimeText = api.file.native.text
        expect(runtimeText).toContain("boss-css/parser/jsx/native")
        expect(runtimeText).toContain('boss-css/native/browser')
        expect(runtimeText).toContain('globalThis.$$')
        expect(runtimeText).toContain('nativeStyleProps')

        const dtsText = api.file.native.dts.text
        expect(dtsText).toContain('export interface $$NativeStyleProps')
        expect(dtsText).toContain('color?: $$PropValues | string;')
        expect(dtsText).toContain('margin?: $$PropValues | number;')
        expect(dtsText).toContain('shadowOffset?: $$PropValues | { width: number; height: number };')
        expect(dtsText).toContain('"primary": "#f0f"')
    })
})
