import { describe, expect } from 'vitest'
import { CSS } from './css'
import { createLogStub } from '@/testing/logger'
import type { BossApiBase } from '@/types'

const createApi = () =>
    ({
        log: createLogStub(),
        dictionary: {
            toValue: (value: unknown) => value,
        },
        selectorScope: '',
    }) as BossApiBase

describe('CSS ordering', () => {
    test('orders base rules before media queries', () => {
        const api = createApi()
        const css = new CSS(api)

        css.selector({ className: 'at', query: '@media screen and (min-width: 640px)' })
        css.rule('color', 'red')
        css.write()

        css.selector({ className: 'base' })
        css.rule('color', 'blue')
        css.write()

        expect(css.text.trim()).toStrictEqual(
            `.base { color: blue }
@media screen and (min-width: 640px) { .at { color: red } }`,
        )
    })

    test('sorts media queries by width', () => {
        const api = createApi()
        const css = new CSS(api)

        css.selector({ className: 'wide', query: '@media screen and (min-width: 1024px)' })
        css.rule('color', 'red')
        css.write()

        css.selector({ className: 'narrow', query: '@media screen and (min-width: 640px)' })
        css.rule('color', 'blue')
        css.write()

        expect(css.text.trim()).toStrictEqual(
            `@media screen and (min-width: 640px) { .narrow { color: blue } }
@media screen and (min-width: 1024px) { .wide { color: red } }`,
        )
    })

    test('orders media query groups consistently', () => {
        const api = createApi()
        const css = new CSS(api)

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

        expect(css.text.trim()).toStrictEqual(
            `@media screen and (max-width: 1024px) { .max-lg { color: cyan } }
@media screen and (max-width: 640px) { .max-sm { color: red } }
@media screen and (min-width: 320px) and (max-width: 639px) { .range-sm { color: blue } }
@media screen and (min-width: 900px) and (max-width: 1200px) { .range-lg { color: orange } }
@media screen and (min-width: 640px) { .min-md { color: teal } }
@media screen and (min-width: 1024px) { .min-lg { color: green } }
@media print { .print { color: purple } }
@supports (display: grid) { .supports { color: black } }`,
        )
    })

    test('appends !important when requested', () => {
        const api = createApi()
        const css = new CSS(api)

        css.selector({ className: 'important' })
        css.rule('color', 'red', { important: true })
        css.write()

        expect(css.text.trim()).toStrictEqual('.important { color: red !important }')
    })
})
