import swc, { JSXAttribute, JSXAttributeName } from '@swc/core'
import type { BossPropValue } from '@/types'

type PropValue = {
    dynamic: boolean
    value: BossPropValue
    ast?: unknown
    code?: string
    isFn?: boolean
}

type PropTree = Record<string, PropValue>

export async function extractPropTree(code: string): Promise<PropTree> {
    const [tree] = await extractPropTrees([code])
    return tree ?? {}
}

export async function extractPropTrees(codes: string[]): Promise<PropTree[]> {
    if (!codes.length) return []

    if (codes.length === 1) {
        return [await extractPropTreeFromCode(codes[0])]
    }

    const normalizedCodes = codes.map(normalizeCode)
    const { body } = await swc.parse(normalizedCodes.join(';\n'), {
        syntax: 'typescript',
        tsx: true,
        isModule: false,
    })

    const expressions = body
        .filter(node => node.type === 'ExpressionStatement')
        .map(node => node.expression)

    if (expressions.length !== normalizedCodes.length) {
        return Promise.all(normalizedCodes.map(extractPropTreeFromCode))
    }

    return expressions.map(extractPropTreeFromExpression)
}

const normalizeCode = (code: string) => {
    let end = code.length - 1
    while (end >= 0 && /\s/.test(code[end])) {
        end -= 1
    }

    if (end < 0 || code[end] !== '>') return code

    let prev = end - 1
    while (prev >= 0 && /\s/.test(code[prev])) {
        prev -= 1
    }

    if (prev >= 0 && code[prev] === '/') return code

    return `${code.slice(0, end)}/${code.slice(end)}`
}

const extractPropTreeFromCode = async (code: string): Promise<PropTree> => {
    const { body } = await swc.parse(normalizeCode(code), {
        syntax: 'typescript',
        tsx: true,
        isModule: false,
    })

    const statement = body.find(node => node.type === 'ExpressionStatement')
    if (!statement) return {}

    return extractPropTreeFromExpression(statement.expression)
}

const getAttributeName = (name: JSXAttributeName): string | null => {
    if (!name) return null
    if (name.type === 'Identifier') return name.value
    if (name.type === 'JSXNamespacedName') {
        return `${name.namespace.value}:${name.name.value}`
    }
    return null
}

const extractPropTreeFromExpression = (expression: any): PropTree => {
    // Prepared assignment
    if (expression.type === 'AssignmentExpression') {
        const right = expression.right
        let objectExpression = null

        if (right.type === 'CallExpression' && right.arguments.length === 1) {
            const callee = right.callee
            if (
                callee.type === 'MemberExpression' &&
                callee.object?.type === 'Identifier' &&
                callee.object.value === '$$' &&
                callee.property?.type === 'Identifier' &&
                callee.property.value === '$'
            ) {
                objectExpression = right.arguments[0].expression
            }
        }

        if (objectExpression?.type === 'ObjectExpression') {
            return extractObjectProps(objectExpression)
        }
        return {}
    }
    // FN call
    if (expression.type === 'CallExpression' && expression.arguments.length === 1) {
        const callee = expression.callee
        if (
            callee.type === 'MemberExpression' &&
            callee.object?.type === 'Identifier' &&
            callee.object.value === '$$' &&
            callee.property?.type === 'Identifier' &&
            callee.property.value === '$'
        ) {
            const arg = expression.arguments[0]?.expression
            if (arg?.type === 'ObjectExpression') {
                return extractObjectProps(arg)
            }
        }
        return {}
    }
    // JSX
    return expression.opening.attributes.reduce((acc: PropTree, { name, value }: JSXAttribute) => {
        const propName = getAttributeName(name)
        if (!propName) return acc
        acc[propName] = getValue(value)
        return acc
    }, {})
}

const extractObjectProps = (objectExpression: { properties: any[] }): PropTree => {
    return objectExpression.properties.reduce((acc: PropTree, prop: any) => {
        if (prop.type === 'KeyValueProperty') {
            const key = prop.key.type === 'Identifier' ? prop.key.value : prop.key.value
            acc[key] = getValue(prop.value)
            return acc
        }

        if (prop.type === 'Identifier') {
            acc[prop.value] = getValue(prop)
            return acc
        }

        return acc
    }, {})
}

const getValue = (value: any): PropValue => {
    // BooleanProp
    if (value === null) {
        return {
            dynamic: false,
            value: true,
        }
    } else if (value.type === 'JSXExpressionContainer') {
        return getValue(value.expression)
    } else if (value.type === 'NumericLiteral') {
        return {
            dynamic: false,
            value: value.value,
        }
    } else if (value.type === 'StringLiteral') {
        return {
            dynamic: false,
            value: value.value,
        }
    } else if (value.type === 'BooleanLiteral') {
        return {
            dynamic: false,
            value: value.value,
        }
    } else if (value.type === 'BinaryExpression') {
        return {
            ast: value,
            dynamic: true,
            value: null,
        }
    } else if (value.type === 'ArrayExpression') {
        return reconstructArray(value.elements)
    } else if (value.type === 'TemplateLiteral') {
        return {
            dynamic: !!value.expressions.length,
            value: value.quasis[0]?.raw ?? value.quasis[0]?.cooked ?? '',
        }
    } else if (value.type === 'ArrowFunctionExpression' || value.type === 'FunctionExpression') {
        return {
            ast: structuredClone(value),
            dynamic: true,
            isFn: true,
            value: null,
        }
    } else if (value.type === 'ObjectExpression') {
        return reconstructObject(value.properties)
    } else {
        return {
            ast: structuredClone(value),
            code: printCode(value),
            dynamic: true,
            value: null,
        }
    }
}

function printCode(expression: any) {
    return swc
        .printSync({
            type: 'Module',
            body: [
                {
                    type: 'ExpressionStatement',
                    expression,
                    span: {
                        start: 0,
                        end: 0,
                        ctxt: 0,
                    },
                },
            ],
            interpreter: null,
            span: {
                start: 0,
                end: 0,
                ctxt: 0,
            },
        } as any)
        .code.replace(/;\s$/, '')
}

function reconstructObject(properties: any[]): PropValue {
    let dynamic = false

    const value = properties.reduce((acc: Record<string, PropValue>, { key, value }) => {
        switch (value.type) {
            case 'StringLiteral':
            case 'NumericLiteral':
            case 'TemplateLiteral':
            case 'BooleanLiteral': {
                const v = getValue(value)
                dynamic = dynamic || v.dynamic
                acc[key.value] = v
                break
            }
            case 'ObjectExpression': {
                const reconstructed = reconstructObject(value.properties)
                dynamic = dynamic || reconstructed.dynamic
                acc[key.value] = reconstructed
                break
            }
            case 'ArrayExpression': {
                const reconstructed = reconstructArray(value.elements)
                dynamic = dynamic || reconstructed.dynamic
                acc[key.value] = reconstructed
                break
            }
            case 'ArrowFunctionExpression':
            case 'FunctionExpression': {
                const v = getValue(value)
                dynamic = dynamic || v.dynamic
                acc[key.value] = v
                break
            }
            default: {
                dynamic = true
                acc[key.value] = {
                    dynamic: true,
                    value: null,
                    ast: structuredClone(value),
                    code: printCode(value),
                }
            }
        }
        return acc
    }, {})

    return { value, dynamic }
}

function reconstructArray(elements: any[]): PropValue {
    let dynamic = false

    const value = elements.reduce((acc: PropValue[], { expression: value }) => {
        switch (value.type) {
            case 'StringLiteral':
            case 'NumericLiteral':
            case 'TemplateLiteral':
            case 'BooleanLiteral': {
                const v = getValue(value)
                dynamic = dynamic || v.dynamic
                acc.push(v)
                break
            }
            case 'ObjectExpression': {
                const reconstructed = reconstructObject(value.properties)
                dynamic = dynamic || reconstructed.dynamic
                acc.push(reconstructed)
                break
            }
            case 'ArrayExpression': {
                const reconstructed = reconstructArray(value.elements)
                dynamic = dynamic || reconstructed.dynamic
                acc.push(reconstructed)
                break
            }
            case 'ArrowFunctionExpression':
            case 'FunctionExpression': {
                const v = getValue(value)
                dynamic = dynamic || v.dynamic
                acc.push(v)
                break
            }
            default: {
                dynamic = true
                acc.push({
                    dynamic: true,
                    value: null,
                })
            }
        }
        return acc
    }, [])

    return { value, dynamic }
}
