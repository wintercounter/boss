import { describe, expect, test } from 'vitest'
import { CSS } from '@/api/css'
import { Dictionary } from '@/api/dictionary'
import { contextToCSSVariable } from '@/api/names'
import { onProp } from '@/prop/css/server'
import { createLogStub } from '@/testing/logger'
import type { BossServerApi } from '@/types'

const createApi = () => {
    const api = {
        unit: 'px',
        selectorPrefix: '',
        selectorScope: '',
        strategy: 'inline-first',
        log: createLogStub(),
        dictionary: null as unknown as Dictionary,
        css: null as unknown as CSS,
        contextToCSSVariable,
    } as unknown as BossServerApi

    api.dictionary = new Dictionary(api)
    api.css = new CSS(api)
    api.dictionary.set('color', {
        property: 'color',
        aliases: ['color'],
        description: '',
        values: [],
        initial: '',
        descriptor: {},
        isCSSProp: true,
    })

    return api
}

describe('css server plugin', () => {
    test('emits !important for inline-first contextual rules', async () => {
        const api = createApi()

        api.css.selector({ className: 'inline', pseudos: ['hover'] })
        await onProp(api as BossServerApi, {
            name: 'color',
            prop: { value: null },
            contexts: ['hover'],
            preferVariables: true,
        })
        api.css.write()

        expect(api.css.text.trim()).toBe('.inline:hover { color: var(--hover-color) !important }')
    })
})
