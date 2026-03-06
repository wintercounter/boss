import { describe, expect, test } from 'vitest'
import { getSourceCode } from '@/eslint-plugin/utils/context.js'

describe('eslint-plugin context utils', () => {
    test('uses getSourceCode when available', () => {
        const sourceCode = { kind: 'legacy' }
        const context = {
            getSourceCode: () => sourceCode,
        }

        expect(getSourceCode(context)).toBe(sourceCode)
    })

    test('falls back to sourceCode property', () => {
        const sourceCode = { kind: 'flat' }
        const context = { sourceCode }

        expect(getSourceCode(context)).toBe(sourceCode)
    })

    test('returns null when sourceCode is unavailable', () => {
        expect(getSourceCode({})).toBe(null)
    })
})
