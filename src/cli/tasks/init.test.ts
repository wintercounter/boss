import { describe, expect, test } from 'vitest'

import { updateNitroViteConfigContent } from '@/cli/tasks/init'

describe('updateNitroViteConfigContent', () => {
    test('adds traceDeps to empty nitro plugin call', () => {
        const input = `plugins: [nitro()]`
        const result = updateNitroViteConfigContent(input)

        expect(result.hasNitro).toBe(true)
        expect(result.updated).toBe(true)
        expect(result.content).toContain(`nitro({ traceDeps: ['jsdom'] })`)
    })

    test('adds traceDeps to nitro options object', () => {
        const input = `plugins: [nitro({ devProxy: true })]`
        const result = updateNitroViteConfigContent(input)

        expect(result.updated).toBe(true)
        expect(result.content).toContain(`nitro({ traceDeps: ['jsdom'], devProxy: true })`)
    })

    test('appends jsdom to existing traceDeps array', () => {
        const input = `plugins: [nitro({ traceDeps: ['foo'] })]`
        const result = updateNitroViteConfigContent(input)

        expect(result.updated).toBe(true)
        expect(result.content).toContain(`traceDeps: ['foo', 'jsdom']`)
    })

    test('appends jsdom to multiline traceDeps arrays without corrupting commas', () => {
        const input = `export default defineConfig({
  plugins: [
    nitro({
      traceDeps: [
        'foo',
      ],
    }),
  ],
})`
        const result = updateNitroViteConfigContent(input)

        expect(result.updated).toBe(true)
        expect(result.content).toContain(`traceDeps: [
        'foo',
        'jsdom'
      ]`)
        expect(result.content).not.toContain(`'foo',,`)
    })

    test('leaves nitro traceDeps unchanged when jsdom is already present', () => {
        const input = `plugins: [nitro({ traceDeps: ['jsdom'] })]`
        const result = updateNitroViteConfigContent(input)

        expect(result.updated).toBe(false)
        expect(result.content).toBe(input)
    })

    test('skips files without nitro plugin usage', () => {
        const input = `export default defineConfig({ plugins: [react()] })`
        const result = updateNitroViteConfigContent(input)

        expect(result.hasNitro).toBe(false)
        expect(result.updated).toBe(false)
        expect(result.content).toBe(input)
    })
})
