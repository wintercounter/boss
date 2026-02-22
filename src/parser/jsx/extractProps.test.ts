import { expect, test } from 'vitest'
import { extractPropTree } from './extractProps.js'

test('extractPropTree - NumericLiteral', async () => {
    expect(await extractPropTree(`<$$ width={100} />`)).toStrictEqual({
        width: {
            value: 100,
            dynamic: false,
        },
    })
})

test('extractPropTree - StringLiteral', async () => {
    expect(await extractPropTree(`<$$ width="100" />`)).toStrictEqual({
        width: {
            value: '100',
            dynamic: false,
        },
    })
})

test('extractPropTree - BooleanProp', async () => {
    expect(await extractPropTree(`<$$ width />`)).toStrictEqual({
        width: {
            value: true,
            dynamic: false,
        },
    })
})

test('extractPropTree - BooleanLiteral - true', async () => {
    expect(await extractPropTree(`<$$ width={true} />`)).toStrictEqual({
        width: {
            value: true,
            dynamic: false,
        },
    })
})

test('extractPropTree - BooleanLiteral - false', async () => {
    expect(await extractPropTree(`<$$ width={false} />`)).toStrictEqual({
        width: {
            value: false,
            dynamic: false,
        },
    })
})

test('extractPropTree - BinaryExpression', async () => {
    expect(await extractPropTree(`<$$ width={x < 1} />`)).toMatchObject({
        width: {
            ast: {
                left: {
                    optional: false,
                    span: {
                        end: expect.any(Number),
                        start: expect.any(Number),
                    },
                    type: 'Identifier',
                    value: 'x',
                },
                operator: '<',
                right: {
                    raw: '1',
                    span: {
                        end: expect.any(Number),
                        start: expect.any(Number),
                    },
                    type: 'NumericLiteral',
                    value: 1,
                },
                span: {
                    end: expect.any(Number),
                    start: expect.any(Number),
                },
                type: 'BinaryExpression',
            },
            dynamic: true,
            value: null,
        },
    })
})

test('extractPropTree - ArrayExpression', async () => {
    expect(await extractPropTree(`<$$ width={[12]} />`)).toStrictEqual({
        width: {
            value: [
                {
                    dynamic: false,
                    value: 12,
                },
            ],
            dynamic: false,
        },
    })
})

test('extractPropTree - ArrayExpression - dynamic', async () => {
    expect(await extractPropTree(`<$$ width={[12, foo]} />`)).toStrictEqual({
        width: {
            value: [
                {
                    dynamic: false,
                    value: 12,
                },
                {
                    dynamic: true,
                    value: null,
                },
            ],
            dynamic: true,
        },
    })
})

test('extractPropTree - ObjectExpression', async () => {
    expect(await extractPropTree(`<$$ width={{ padding: 10 }} />`)).toStrictEqual({
        width: {
            value: {
                padding: {
                    dynamic: false,
                    value: 10,
                },
            },
            dynamic: false,
        },
    })
})

test('extractPropTree - ObjectExpression - dynamic', async () => {
    expect(await extractPropTree(`<$$ width={{ padding: 10, display: show ? 'block' : 'none' }} />`)).toMatchObject({
        width: {
            dynamic: true,
            value: {
                display: {
                    ast: {
                        alternate: {
                            raw: "'none'",
                            span: {
                                end: expect.any(Number),
                                start: expect.any(Number),
                            },
                            type: 'StringLiteral',
                            value: 'none',
                        },
                        consequent: {
                            raw: "'block'",
                            span: {
                                end: expect.any(Number),
                                start: expect.any(Number),
                            },
                            type: 'StringLiteral',
                            value: 'block',
                        },
                        span: {
                            end: expect.any(Number),
                            start: expect.any(Number),
                        },
                        test: {
                            optional: false,
                            span: {
                                end: expect.any(Number),
                                start: expect.any(Number),
                            },
                            type: 'Identifier',
                            value: 'show',
                        },
                        type: 'ConditionalExpression',
                    },
                    code: expect.stringMatching(/show \? ['\"]block['\"] : ['\"]none['\"]/),
                    dynamic: true,
                    value: null,
                },
                padding: {
                    dynamic: false,
                    value: 10,
                },
            },
        },
    })
})

test('extractPropTree - prepared assigment', async () => {
    expect(
        await extractPropTree(`
    $$.Foo = $$.$({
        mobile: {
            color: 'white',
            margin: [1,2,3,4]
        }
    })`),
    ).toStrictEqual({
        mobile: {
            dynamic: false,
            value: {
                color: {
                    dynamic: false,
                    value: 'white',
                },
                margin: {
                    dynamic: false,
                    value: [
                        {
                            dynamic: false,
                            value: 1,
                        },
                        {
                            dynamic: false,
                            value: 2,
                        },
                        {
                            dynamic: false,
                            value: 3,
                        },
                        {
                            dynamic: false,
                            value: 4,
                        },
                    ],
                },
            },
        },
    })
})

test('extractPropTree - prepared assignment with $$.$ call', async () => {
    expect(
        await extractPropTree(`
    $$.Foo = $$.$({
        mobile: {
            color: 'white',
            margin: [1,2,3,4]
        }
    })`),
    ).toStrictEqual({
        mobile: {
            dynamic: false,
            value: {
                color: {
                    dynamic: false,
                    value: 'white',
                },
                margin: {
                    dynamic: false,
                    value: [
                        {
                            dynamic: false,
                            value: 1,
                        },
                        {
                            dynamic: false,
                            value: 2,
                        },
                        {
                            dynamic: false,
                            value: 3,
                        },
                        {
                            dynamic: false,
                            value: 4,
                        },
                    ],
                },
            },
        },
    })
})

test('extractPropTree - prepared assignment with shorthand', async () => {
    expect(
        await extractPropTree(`
    $$.Foo = $$.$({
        display,
        color: 'white',
    })`),
    ).toMatchObject({
        display: {
            dynamic: true,
            value: null,
        },
        color: {
            dynamic: false,
            value: 'white',
        },
    })
})

test('extractPropTree - $$.$ call', async () => {
    expect(
        await extractPropTree(`
    $$.$({
        mobile: {
            color: 'white',
            margin: [1,2,3,4]
        }
    })`),
    ).toStrictEqual({
        mobile: {
            dynamic: false,
            value: {
                color: {
                    dynamic: false,
                    value: 'white',
                },
                margin: {
                    dynamic: false,
                    value: [
                        {
                            dynamic: false,
                            value: 1,
                        },
                        {
                            dynamic: false,
                            value: 2,
                        },
                        {
                            dynamic: false,
                            value: 3,
                        },
                        {
                            dynamic: false,
                            value: 4,
                        },
                    ],
                },
            },
        },
    })
})

test('extractPropTree - function expression', async () => {
    expect(
        await extractPropTree(`
    <$$ color={() => token} padding={function () { return pad }} />`),
    ).toMatchObject({
        color: {
            dynamic: true,
            isFn: true,
            value: null,
        },
        padding: {
            dynamic: true,
            isFn: true,
            value: null,
        },
    })
})
