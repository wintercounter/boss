import { parseSync, printSync } from '@swc/core'
import type { AssignmentExpression, Expression, ObjectExpression } from '@swc/types'

import { extractCode } from '@/parser/jsx/extractCode.js'

type PreparedInfo = {
    name: string
    asTag: string | null
    asDynamic: boolean
    filePath?: string
    styles?: string
}

export const extractPreparedComponents = (content: string, filePath?: string): PreparedInfo[] => {
    if (!content.includes('$$.')) return []

    const codes = extractCode(content).filter(code => code.trim().startsWith('$$.'))
    if (!codes.length) return []

    const results: PreparedInfo[] = []
    for (const code of codes) {
        let parsed
        try {
            parsed = parseSync(code, {
                syntax: 'typescript',
                tsx: true,
                isModule: false,
            })
        } catch {
            continue
        }

        const statement = parsed.body.find(node => node.type === 'ExpressionStatement')
        if (!statement || statement.type !== 'ExpressionStatement') continue

        const expression = statement.expression
        if (expression.type !== 'AssignmentExpression') continue

        const prepared = extractPreparedInfo(expression, filePath)
        if (prepared) {
            results.push(prepared)
        }
    }

    return results
}

const extractPreparedInfo = (expression: AssignmentExpression, filePath?: string): PreparedInfo | null => {
    if (!isPreparedAssignment(expression)) return null

    const left = expression.left as { property: { value: string } }
    const name = left.property.value
    const objectExpression = getPreparedObjectExpression(expression.right)
    if (!objectExpression) return null

    const { asTag, asDynamic } = extractAsMeta(objectExpression)
    const styles = extractStyleText(objectExpression)
    return { name, asTag, asDynamic, filePath, styles }
}

const isPreparedAssignment = (expression: AssignmentExpression) => {
    const left = expression.left
    if (!left || left.type !== 'MemberExpression') return false
    if (left.object?.type !== 'Identifier' || left.object.value !== '$$') return false
    if (left.property?.type !== 'Identifier') return false
    if (!/^[A-Z]/.test(left.property.value)) return false
    if (expression.operator && expression.operator !== '=') return false
    return true
}

const getPreparedObjectExpression = (expression: Expression): ObjectExpression | null => {
    if (expression.type === 'CallExpression' && expression.arguments.length === 1) {
        const callee = expression.callee
        if (
            callee.type === 'MemberExpression' &&
            callee.object?.type === 'Identifier' &&
            callee.object.value === '$$' &&
            callee.property?.type === 'Identifier' &&
            callee.property.value === '$'
        ) {
            const arg = expression.arguments[0].expression
            if (arg.type === 'ObjectExpression') {
                return arg
            }
        }
    }

    return null
}

const extractAsMeta = (objectExpression: ObjectExpression) => {
    let asTag: string | null = null
    let asDynamic = false

    for (const prop of objectExpression.properties) {
        if (prop.type !== 'KeyValueProperty') continue
        if (prop.key.type !== 'Identifier' && prop.key.type !== 'StringLiteral') continue

        const key = prop.key.type === 'Identifier' ? prop.key.value : prop.key.value
        if (key !== 'as') continue

        const value = prop.value
        if (value.type === 'StringLiteral') {
            asTag = value.value
            asDynamic = false
            break
        }

        if (value.type === 'TemplateLiteral' && value.expressions.length === 0) {
            const first = value.quasis[0]
            asTag = first?.cooked ?? first?.raw ?? ''
            asDynamic = false
            break
        }

        asDynamic = true
        break
    }

    return { asTag, asDynamic }
}

const extractStyleText = (objectExpression: ObjectExpression): string | undefined => {
    const filtered = objectExpression.properties.filter(prop => {
        if (prop.type !== 'KeyValueProperty') return true
        if (prop.key.type !== 'Identifier' && prop.key.type !== 'StringLiteral') return true
        const key = prop.key.type === 'Identifier' ? prop.key.value : prop.key.value
        return key !== 'as'
    })

    if (!filtered.length) return undefined

    const span = { start: 0, end: 0, ctxt: 0 }
    const expression = {
        type: 'ObjectExpression',
        span: objectExpression.span ?? span,
        properties: filtered,
    } as ObjectExpression

    let text = printSync({
        type: 'Module',
        body: [
            {
                type: 'ExpressionStatement',
                expression,
                span,
            },
        ],
        interpreter: null,
        span,
    } as any).code

    text = text.replace(/;\s*$/, '').trim()
    if (text.startsWith('({') && text.endsWith('})')) {
        text = text.slice(1, -1)
    }
    return text.replace(/\s+/g, ' ')
}
