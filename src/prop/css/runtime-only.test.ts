import { describe, expect } from 'vitest'

import { buildRuntimeSelector, resolvePropertyName } from '@/prop/css/runtime-only'
import { createChildContext } from '@/prop/child/runtime-only'

describe('runtime-only css helpers', () => {
    test('resolvePropertyName normalizes camelCase', () => {
        expect(resolvePropertyName('backgroundColor')).toBe('background-color')
        expect(resolvePropertyName('grid-template')).toBe('grid-template')
    })

    test('buildRuntimeSelector applies pseudos and child selectors', () => {
        const childContext = createChildContext('.inner')
        const selector = buildRuntimeSelector('card', ['hover', childContext])

        expect(selector).toBe('.card:hover .inner')
    })
})
