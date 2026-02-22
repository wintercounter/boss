import { describe, expect } from 'vitest'

describe('classname-only', () => {
    describe('e2e', () => {
        describe('server', () => {
            test('token values keep selector value in pseudo contexts', async ({ $ }) => {
                const api = await $.createServerApi({
                    plugins: [
                        $.use.tokenServer,
                        $.prop.atServer,
                        $.prop.childServer,
                        $.prop.cssServer,
                        $.prop.pseudoServer,
                        $.parser.classNameServer,
                        $.strategy.classnameOnlyServer,
                    ],
                    tokens: {
                        color: {
                            primary: '#ed4b9b',
                        },
                    },
                })

                await api.trigger('onParse', { content: '<div className="hover:color:primary">' })

                expect(api.css.text).toContain('--color-primary')
                expect(api.css.text).toContain('.hover\\:color\\:primary:hover { color: var(--color-primary) }')
            })
        })
    })
})
