import { describe, expect } from 'vitest'
import File from './file'
import JS from './js'

describe('file', () => {
    describe('File', () => {
        test('empty string', async ({ $ }) => {
            const api = await $.createServerApi()
            const file = new File(api)

            expect(file.text).toStrictEqual('')
        })

        test('can render sections', async ({ $ }) => {
            const api = await $.createServerApi()
            const file = new File(api)

            file.set('head', 'head-text', 'head')
            file.set('import', 'import-text', 'import')
            file.set('body', 'body-text', 'body')
            file.set('foot', 'foot-text', 'foot')

            expect(file.text).toStrictEqual(`${file.headers.map(([, { content }]) => String(content)).join('\n')}
head

import

body

foot`)
        })
    })

    describe('JS', () => {
        test('empty headers', async ({ $ }) => {
            const api = await $.createServerApi()
            const file = new JS(api)

            expect(file.text).toStrictEqual('')
        })

        test('merges plugin configs for same module', async ({ $ }) => {
            const api = await $.createServerApi()
            const file = new JS(api)

            file.importAndConfig({ name: 'onInit', from: 'boss-css/use/token/browser' })
            file.importAndConfig({ name: 'onBrowserObjectStart', from: 'boss-css/use/token/browser' })

            const text = file.text

            expect(text).toMatch(/"onInit": onInit_[a-z0-9]+/)
            expect(text).toMatch(/"onBrowserObjectStart": onBrowserObjectStart_[a-z0-9]+/)
        })

        test('adds headers', async ({ $ }) => {
            const api = await $.createServerApi()
            const file = new JS(api)

            // Need to have content to have headers also
            file.set('foot', 'foot-text', 'foot')

            expect(file.text).toStrictEqual(`${file.headers.map(([, { content }]) => String(content)).join('\n')}

foot`)
        })
    })
})
