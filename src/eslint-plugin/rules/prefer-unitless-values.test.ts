import { describe, expect, test } from 'vitest'
import { analyzeClassList, rewriteTokenUnitValues, stripDefaultUnitSuffixes } from '@/eslint-plugin/rules/prefer-unitless-values.js'

describe('prefer-unitless-values helpers', () => {
    test('strips configured unit suffixes from underscore-separated values', () => {
        expect(stripDefaultUnitSuffixes('1px_solid', 'px')).toBe('1_solid')
        expect(stripDefaultUnitSuffixes('10px_20px', 'px')).toBe('10_20')
        expect(stripDefaultUnitSuffixes('12_20', 'px')).toBe(null)
    })

    test('rewrites simple class tokens', () => {
        const result = rewriteTokenUnitValues('border:1px_solid', 'px', null)
        expect(result).toEqual({
            nextToken: 'border:1_solid',
            issues: [{ prop: 'border', value: '1px_solid', nextValue: '1_solid' }],
        })
    })

    test('rewrites grouped tokens', () => {
        const result = rewriteTokenUnitValues('hover:{border:1px_solid;gap:10px}', 'px', null)
        expect(result).toEqual({
            nextToken: 'hover:{border:1_solid;gap:10}',
            issues: [
                { prop: 'border', value: '1px_solid', nextValue: '1_solid' },
                { prop: 'gap', value: '10px', nextValue: '10' },
            ],
        })
    })

    test('analyzes full class lists and returns rewritten output', () => {
        const result = analyzeClassList('border:1px_solid padding:8px_12px color:red', 'px', null)
        expect(result.nextClassList).toBe('border:1_solid padding:8_12 color:red')
        expect(result.issues).toHaveLength(2)
        expect(result.issues[0]).toMatchObject({
            prop: 'border',
            value: '1px_solid',
            nextValue: '1_solid',
        })
    })

    test('supports custom default units', () => {
        const result = analyzeClassList('padding:2rem_4rem gap:1rem', 'rem', null)
        expect(result.nextClassList).toBe('padding:2_4 gap:1')
        expect(result.issues).toHaveLength(2)
    })
})
