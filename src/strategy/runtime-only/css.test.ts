import { afterEach, describe, expect, vi } from 'vitest'
import type { BossBrowserApi } from '@/types'

const createDocumentStub = () => {
    const createSheet = (rules: string[]) => {
        const sheet = {
            cssRules: [] as string[],
            insertRule: (rule: string, index?: number) => {
                const insertAt = typeof index === 'number' ? index : rules.length
                rules.splice(insertAt, 0, rule)
                sheet.cssRules.splice(insertAt, 0, rule)
            },
        }
        return sheet
    }

    const baseRules: string[] = []
    const atRules: string[] = []
    const baseSheet = createSheet(baseRules)
    const atSheet = createSheet(atRules)

    const parentNode = {
        insertBefore: vi.fn(),
    }

    const baseStyleElement = {
        sheet: baseSheet,
        setAttribute: vi.fn(),
        appendChild: vi.fn(),
        parentNode,
        nextSibling: null,
    }
    const atStyleElement = {
        sheet: atSheet,
        setAttribute: vi.fn(),
        appendChild: vi.fn(),
    }

    let baseCreated = false
    let atCreated = false

    const document = {
        querySelector: vi.fn((selector: string) => {
            if (selector === 'style[data-boss-runtime]') {
                return baseCreated ? baseStyleElement : null
            }
            if (selector === 'style[data-boss-runtime-at]') {
                return atCreated ? atStyleElement : null
            }
            return null
        }),
        createElement: vi.fn(() => {
            if (!baseCreated) {
                baseCreated = true
                return baseStyleElement
            }
            atCreated = true
            return atStyleElement
        }),
        createTextNode: vi.fn((value: string) => ({ nodeValue: value })),
        head: {
            appendChild: vi.fn(),
        },
    }

    return {
        document,
        baseRules,
        atRules,
        baseSheet,
        atSheet,
        baseStyleElement,
        atStyleElement,
    }
}

describe('RuntimeCSS', () => {
    afterEach(() => {
        vi.unstubAllGlobals()
    })

    test('inserts rules and dedupes repeats', async () => {
        const { document, baseRules } = createDocumentStub()
        vi.stubGlobal('document', document)
        vi.resetModules()
        const { RuntimeCSS } = await import('@/strategy/runtime-only/css')

        const api = {
            dictionary: { toValue: (value: unknown) => value },
            selectorScope: '',
        } as BossBrowserApi

        const css = new RuntimeCSS(api)
        css.selector({ className: 'runtime-test' })
        css.rule('color', 'red')
        css.write()
        css.selector({ className: 'runtime-test' })
        css.rule('color', 'red')
        css.write()

        expect(baseRules).toStrictEqual(['.runtime-test { color: red }'])
    })

    test('appends !important when requested', async () => {
        const { document, baseRules } = createDocumentStub()
        vi.stubGlobal('document', document)
        vi.resetModules()
        const { RuntimeCSS } = await import('@/strategy/runtime-only/css')

        const api = {
            dictionary: { toValue: (value: unknown) => value },
            selectorScope: '',
        } as BossBrowserApi

        const css = new RuntimeCSS(api)
        css.selector({ className: 'important' })
        css.rule('color', 'red', { important: true })
        css.write()

        expect(baseRules).toStrictEqual(['.important { color: red !important }'])
    })

    test('respects selector scope, pseudos, and queries', async () => {
        const { document, atRules } = createDocumentStub()
        vi.stubGlobal('document', document)
        vi.resetModules()
        const { RuntimeCSS } = await import('@/strategy/runtime-only/css')

        const api = {
            dictionary: { toValue: (value: unknown) => value },
            selectorScope: '.scope ',
        } as BossBrowserApi

        const css = new RuntimeCSS(api)
        css.selector({ className: 'btn', pseudos: ['hover'], query: '@media screen and (min-width: 640px)' })
        css.rule('background-color', 'red')
        css.write()

        expect(atRules).toStrictEqual([
            '@media screen and (min-width: 640px) { .scope .btn:hover { background-color: red } }',
        ])
    })

    test('falls back to text nodes when insertRule fails', async () => {
        const { document, baseStyleElement } = createDocumentStub()
        baseStyleElement.sheet.insertRule = () => {
            throw new Error('fail')
        }
        vi.stubGlobal('document', document)
        vi.resetModules()
        const { RuntimeCSS } = await import('@/strategy/runtime-only/css')

        const api = {
            dictionary: { toValue: (value: unknown) => value },
            selectorScope: '',
        } as BossBrowserApi

        const css = new RuntimeCSS(api)
        css.selector({ className: 'runtime-fallback' })
        css.rule('color', 'blue')
        css.write()

        expect(baseStyleElement.appendChild).toHaveBeenCalled()
    })

    test('orders media queries by width', async () => {
        const { document, atRules } = createDocumentStub()
        vi.stubGlobal('document', document)
        vi.resetModules()
        const { RuntimeCSS } = await import('@/strategy/runtime-only/css')

        const api = {
            dictionary: { toValue: (value: unknown) => value },
            selectorScope: '',
        } as BossBrowserApi

        const css = new RuntimeCSS(api)
        css.selector({ className: 'wide', query: '@media screen and (min-width: 1024px)' })
        css.rule('color', 'red')
        css.write()
        css.selector({ className: 'narrow', query: '@media screen and (min-width: 640px)' })
        css.rule('color', 'blue')
        css.write()

        expect(atRules).toStrictEqual([
            '@media screen and (min-width: 640px) { .narrow { color: blue } }',
            '@media screen and (min-width: 1024px) { .wide { color: red } }',
        ])
    })

    test('orders media query groups consistently', async () => {
        const { document, baseRules, atRules } = createDocumentStub()
        vi.stubGlobal('document', document)
        vi.resetModules()
        const { RuntimeCSS } = await import('@/strategy/runtime-only/css')

        const api = {
            dictionary: { toValue: (value: unknown) => value },
            selectorScope: '',
        } as BossBrowserApi

        const css = new RuntimeCSS(api)
        css.selector({ className: 'base' })
        css.rule('color', 'white')
        css.write()
        css.selector({ className: 'max-sm', query: '@media screen and (max-width: 640px)' })
        css.rule('color', 'red')
        css.write()
        css.selector({
            className: 'range-lg',
            query: '@media screen and (min-width: 900px) and (max-width: 1200px)',
        })
        css.rule('color', 'orange')
        css.write()
        css.selector({ className: 'min-lg', query: '@media screen and (min-width: 1024px)' })
        css.rule('color', 'green')
        css.write()
        css.selector({ className: 'print', query: '@media print' })
        css.rule('color', 'purple')
        css.write()
        css.selector({ className: 'supports', query: '@supports (display: grid)' })
        css.rule('color', 'black')
        css.write()
        css.selector({
            className: 'range-sm',
            query: '@media screen and (min-width: 320px) and (max-width: 639px)',
        })
        css.rule('color', 'blue')
        css.write()
        css.selector({ className: 'max-lg', query: '@media screen and (max-width: 1024px)' })
        css.rule('color', 'cyan')
        css.write()
        css.selector({ className: 'min-md', query: '@media screen and (min-width: 640px)' })
        css.rule('color', 'teal')
        css.write()

        expect(baseRules).toStrictEqual(['.base { color: white }'])
        expect(atRules).toStrictEqual([
            '@media screen and (max-width: 1024px) { .max-lg { color: cyan } }',
            '@media screen and (max-width: 640px) { .max-sm { color: red } }',
            '@media screen and (min-width: 320px) and (max-width: 639px) { .range-sm { color: blue } }',
            '@media screen and (min-width: 900px) and (max-width: 1200px) { .range-lg { color: orange } }',
            '@media screen and (min-width: 640px) { .min-md { color: teal } }',
            '@media screen and (min-width: 1024px) { .min-lg { color: green } }',
            '@media print { .print { color: purple } }',
            '@supports (display: grid) { .supports { color: black } }',
        ])
    })
})
