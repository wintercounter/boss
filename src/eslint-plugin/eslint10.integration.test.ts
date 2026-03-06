import { describe, expect, test } from 'vitest'
import { ESLint } from 'eslint'
import bossCss from '@/eslint-plugin/index.js'

describe('eslint-plugin integration (ESLint 10)', () => {
    test('recommended config runs and reports Boss rules', async () => {
        const eslint = new ESLint({
            overrideConfigFile: true,
            overrideConfig: [bossCss.configs.recommended],
        })

        const [result] = await eslint.lintText(`const className = 'border:1px_solid'`, {
            filePath: 'sample.js',
        })

        expect(result.fatalErrorCount).toBe(0)
        expect(result.messages.some(message => message.ruleId === 'boss-css/prefer-unitless-values')).toBe(true)
    })
})
