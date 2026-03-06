import { describe, expect, test } from 'vitest'
import bossCss from '@/eslint-plugin/index.js'

describe('eslint-plugin flat configs', () => {
    test('declare plugins as a flat-config object', () => {
        const recommended = bossCss.configs.recommended

        expect(Array.isArray(recommended.plugins)).toBe(false)
        expect(recommended.plugins).toHaveProperty('boss-css')
    })
})
