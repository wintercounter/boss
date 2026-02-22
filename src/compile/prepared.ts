import { parseSync } from '@swc/core'
import type { Expression, JSXElement, ObjectExpression, Program } from '@swc/types'

import { buildPreparedDefinition, isPreparedDefinitionStatic, type PreparedDefinition } from './jsx'

export type PreparedDefinitionEntry = {
    name: string
    definition: PreparedDefinition
    inlineable: boolean
}

export type PreparedUsage = {
    name: string
    hasSpread: boolean
}

type ScanOptions = {
    isTs: boolean
    isJsx: boolean
}

export function scanPrepared(source: string, options: ScanOptions) {
    const parsed = parseSync(source, {
        syntax: options.isTs ? 'typescript' : 'ecmascript',
        tsx: options.isTs && options.isJsx,
        jsx: !options.isTs && options.isJsx,
    }) as Program

    const definitions: PreparedDefinitionEntry[] = []
    const usages: PreparedUsage[] = []

    const visit = (node: unknown) => {
        if (!node || typeof node !== 'object') return
        if (Array.isArray(node)) {
            node.forEach(visit)
            return
        }

        const current = node as Record<string, unknown>

        if (isPreparedAssignment(current)) {
            const prepared = extractPreparedDefinition(current.expression as Expression)
            if (prepared) {
                definitions.push(prepared)
            }
        }

        if (current.type === 'JSXElement') {
            const element = current as unknown as JSXElement
            const preparedUsage = extractPreparedUsage(element)
            if (preparedUsage) {
                usages.push(preparedUsage)
            }
        }

        for (const key of Object.keys(current)) {
            visit(current[key])
        }
    }

    visit(parsed)

    return { definitions, usages }
}

const extractPreparedDefinition = (expression: Expression): PreparedDefinitionEntry | null => {
    const assignment = expression as {
        left?: { property?: { value?: string } }
        right?: Expression
    }
    const name = assignment.left?.property?.value
    const objectExpression = assignment.right ? getPreparedObjectExpression(assignment.right) : null
    if (!name || !objectExpression) return null

    const definition = buildPreparedDefinition(objectExpression)
    if (!definition) return null

    return {
        name,
        definition,
        inlineable: isPreparedDefinitionStatic(definition),
    }
}

const extractPreparedUsage = (element: JSXElement): PreparedUsage | null => {
    const name = element.opening.name
    if (
        name.type !== 'JSXMemberExpression' ||
        name.object.type !== 'Identifier' ||
        name.object.value !== '$$' ||
        name.property.type !== 'Identifier' ||
        !/^[A-Z]/.test(name.property.value)
    ) {
        return null
    }

    const hasSpread = element.opening.attributes.some(attr => attr.type === 'SpreadElement')
    return { name: name.property.value, hasSpread }
}

const isPreparedAssignmentExpression = (node: Record<string, unknown>) => {
    if (node.type !== 'AssignmentExpression') return false
    const assignment = node as {
        left?: {
            type?: string
            object?: { type?: string; value?: string }
            property?: { type?: string; value?: string }
        }
        operator?: string
        right?: { type?: string }
    }
    if (assignment.operator && assignment.operator !== '=') return false
    const left = assignment.left
    if (!left || left.type !== 'MemberExpression') return false
    if (left.object?.type !== 'Identifier' || left.object.value !== '$$') return false
    const property = left.property
    if (!property || property.type !== 'Identifier') return false
    if (!property.value || !/^[A-Z]/.test(property.value)) return false
    return Boolean(assignment.right && getPreparedObjectExpression(assignment.right as Expression))
}

const isPreparedAssignment = (node: Record<string, unknown>) => {
    if (node.type !== 'ExpressionStatement') return false
    const statement = node as { expression?: Record<string, unknown> }
    return Boolean(statement.expression && isPreparedAssignmentExpression(statement.expression))
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
