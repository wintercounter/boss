import { describe, expect, test } from 'vitest'
import { ESLint } from 'eslint'
import bossCss from '@/eslint-plugin/index.js'

const lintRedundantCx = async (code: string, options?: Record<string, unknown>) => {
    const eslint = new ESLint({
        overrideConfigFile: true,
        overrideConfig: [
            {
                files: ['**/*.{js,jsx,ts,tsx}'],
                languageOptions: {
                    parserOptions: {
                        ecmaVersion: 'latest',
                        sourceType: 'module',
                        ecmaFeatures: {
                            jsx: true,
                        },
                    },
                },
                plugins: {
                    'boss-css': bossCss,
                },
                rules: {
                    'boss-css/redundant-cx': ['warn', ...(options ? [options] : [])],
                },
            },
        ],
    })

    const [result] = await eslint.lintText(code, {
        filePath: 'sample.jsx',
    })

    return result.messages
}

describe('redundant-cx rule', () => {
    test('reports $$.cx() on $$ className by default', async () => {
        const messages = await lintRedundantCx(`
            export const Component = () => <$$ className={$$.cx(base, className)} />
        `)

        expect(messages).toHaveLength(1)
        expect(messages[0]).toMatchObject({
            ruleId: 'boss-css/redundant-cx',
            message: 'Do not wrap $$ className with cx; pass values directly to className.',
        })
    })

    test('does not report imported cx() on $$ className by default', async () => {
        const messages = await lintRedundantCx(`
            import cx from 'boss-css/cx'

            export const Component = () => <$$ className={cx(base, className)} />
        `)

        expect(messages).toHaveLength(0)
    })

    test('derives default callees from configured component aliases', async () => {
        const messages = await lintRedundantCx(
            `
                export const Component = () => <B className={B.cx(base, className)} />
            `,
            {
                components: ['B'],
            }
        )

        expect(messages).toHaveLength(1)
        expect(messages[0]?.ruleId).toBe('boss-css/redundant-cx')
    })

    test('still supports explicit bare cx() callee overrides', async () => {
        const messages = await lintRedundantCx(
            `
                import cx from 'boss-css/cx'

                export const Component = () => <$$ className={cx(base, className)} />
            `,
            {
                callees: ['^cx$'],
            }
        )

        expect(messages).toHaveLength(1)
        expect(messages[0]?.ruleId).toBe('boss-css/redundant-cx')
    })
})
