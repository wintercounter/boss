import path from 'node:path'

import { parseSync, printSync } from '@swc/core'
import type {
    CallExpression,
    Expression,
    JSXElement,
    MemberExpression,
    Module,
    ObjectExpression,
    Program,
} from '@swc/types'

import type { CompileConfig } from '@/shared/types'
import { getClassNameProp } from '@/shared/framework'

import { rewriteClassNameTokensInElement, rewriteClassNameTokensWithMap } from '@/compile/classname'
import type { ClassNameMapper } from '@/compile/classname-strategy'
import { buildPreparedDefinition, transformJsxElement, type PreparedDefinition, type TransformState } from '@/compile/jsx'
import { extractCustomCssText } from '@/shared/customCss'

type TransformOptions = {
    api: TransformState['api']
    compile: CompileConfig
    filename: string
    preparedGlobal?: Map<string, PreparedDefinition>
    preparedLocal?: Map<string, PreparedDefinition>
    preparedRuntime?: Set<string>
    classNameMapper?: ClassNameMapper | null
}

const jsxExtensions = new Set(['.jsx', '.tsx', '.js', '.mjs', '.cjs'])
const tsExtensions = new Set(['.ts', '.tsx'])
const fallbackSpan = { start: 0, end: 0, ctxt: 0 }
const ensureSpan = (span?: { start: number; end: number; ctxt?: number }) => {
    if (!span) return fallbackSpan
    if (typeof span.ctxt === 'number') return span as { start: number; end: number; ctxt: number }
    return { ...span, ctxt: 0 }
}

const createStringLiteral = (value: string, span?: { start: number; end: number; ctxt?: number }) => ({
    type: 'StringLiteral' as const,
    span: ensureSpan(span),
    value,
    raw: JSON.stringify(value),
})

const tokenPathToVar = (path: string, prefix: string) => {
    return `var(--${prefix}${path.replace(/\./g, '-')})`
}

const getTokenPathFromMemberExpression = (expression: MemberExpression): string | null => {
    const parts: string[] = []
    let current: any = expression

    while (current?.type === 'MemberExpression') {
        if (current.optional || current.computed) return null
        const property = current.property
        if (!property || property.type !== 'Identifier') return null
        parts.push(property.value)
        current = current.object
    }

    if (!current || current.type !== 'Identifier' || current.value !== '$$') return null

    parts.reverse()
    if (parts[0] !== 'token' || parts.length < 2) return null
    return parts.slice(1).join('.')
}

const createVoidExpression = (span?: { start: number; end: number; ctxt?: number }) => {
    const safeSpan = ensureSpan(span)
    return {
        type: 'UnaryExpression',
        span: safeSpan,
        operator: 'void',
        argument: {
            type: 'NumericLiteral',
            span: safeSpan,
            value: 0,
        },
    }
}

export async function transformSource(source: string, options: TransformOptions) {
    const ext = path.extname(options.filename)
    const isTs = tsExtensions.has(ext)
    const isJsx = jsxExtensions.has(ext)
    const parsed = parseSync(source, {
        syntax: isTs ? 'typescript' : 'ecmascript',
        tsx: isTs && isJsx,
        jsx: !isTs && isJsx,
    })

    const state: TransformState = {
        api: options.api,
        classNameProp: getClassNameProp(options.api.framework),
        compile: options.compile,
        filename: options.filename,
        classNameMapper: options.classNameMapper ?? null,
        needsRuntime: false,
        needsValueHelper: false,
        needsTokenVarsHelper: false,
        replacedElements: 0,
        preparedLocal: new Map(options.preparedLocal ?? []),
        preparedGlobal: options.preparedGlobal ?? new Map(),
        preparedRuntime: options.preparedRuntime ?? new Set(),
        customCssBlocks: [],
    }

    const transformed = await transformProgram(parsed as Program, state)

    normalizeSpans(transformed)

    if (state.customCssBlocks.length) {
        state.api.css?.syncCustomBlocks?.(state.filename, state.customCssBlocks)
    }

    return {
        code: printSync(transformed).code,
        needsRuntime: state.needsRuntime,
        needsValueHelper: state.needsValueHelper,
        replacedElements: state.replacedElements,
    }
}

const normalizeSpans = (node: unknown) => {
    if (!node || typeof node !== 'object') return
    if (Array.isArray(node)) {
        node.forEach(normalizeSpans)
        return
    }

    const record = node as Record<string, unknown>
    if (typeof record.type === 'string' && record.span && typeof record.ctxt !== 'number') {
        record.ctxt = 0
    }

    for (const [key, value] of Object.entries(record)) {
        if (key === 'span' && value && typeof value === 'object') {
            const span = value as { start?: number; end?: number; ctxt?: number }
            if (typeof span.start === 'number' && typeof span.end === 'number' && typeof span.ctxt !== 'number') {
                span.ctxt = 0
            }
            continue
        }
        normalizeSpans(value)
    }
}

const transformProgram = async (program: Program, state: TransformState) => {
    const transformed = (await transformNode(program, state)) as Program

    const needsValueHelper = state.needsValueHelper && !hasValueHelper(transformed)
    const needsTokenVarsHelper = state.needsTokenVarsHelper && !hasTokenVarsHelper(transformed)
    if (needsValueHelper || needsTokenVarsHelper) {
        const helper = createRuntimeHelpersProgram({
            unit: state.api.unit ?? 'px',
            prefix: state.api.selectorPrefix ?? '',
            needsValueHelper,
            needsTokenVarsHelper,
        })
        if ('body' in transformed) {
            transformed.body = [...helper.body, ...transformed.body]
        }
    }

    if (!state.needsRuntime && 'body' in transformed) {
        transformed.body = transformed.body.filter(node => {
            if (node.type !== 'ImportDeclaration') return true
            const source = node.source.value
            return !isBossImport(source)
        })
    }

    return transformed
}

type TransformContext = {
    inJsxChild?: boolean
    inBossElement?: boolean
    inBossPropValue?: boolean
    keepBossMarker?: boolean
    inBossMarkerCall?: boolean
    inModuleSpecifier?: boolean
    inMemberExpressionObject?: boolean
    inCallCallee?: boolean
}

const transformNode = async (node: unknown, state: TransformState, context: TransformContext = {}): Promise<unknown> => {
    if (!node || typeof node !== 'object') return node
    if (Array.isArray(node)) {
        const mapped = []
        for (const child of node) {
            const next = await transformNode(child, state, context)
            if (next === null) continue
            mapped.push(next)
        }
        return mapped
    }

    const current = node as Record<string, unknown>
    const mapToken = state.classNameMapper ? (token: string) => state.classNameMapper?.get(token) : undefined
    let keepPreparedMarker = false
    if (current.type === 'ExpressionStatement') {
        const expression = (current as { expression?: Expression }).expression
        if (expression) {
            const cssText = await extractCustomCssText(expression, state.api, state.filename)
            if (cssText != null) {
                const span = ensureSpan((expression as { span?: { start: number; end: number; ctxt?: number } }).span)
                state.customCssBlocks.push({ start: span.start, end: span.end, cssText })
                return null
            }
        }
    }

    if (current.type === 'CallExpression' || current.type === 'TaggedTemplateExpression') {
        const cssText = await extractCustomCssText(current as unknown as Expression, state.api, state.filename)
        if (cssText != null) {
            const span = ensureSpan((current as { span?: { start: number; end: number; ctxt?: number } }).span)
            state.customCssBlocks.push({ start: span.start, end: span.end, cssText })
            return createVoidExpression(span)
        }
    }

    if (isPreparedAssignment(current)) {
        const prepared = parsePreparedDefinition(current.expression as unknown as Expression)
        if (prepared) {
            state.preparedLocal.set(prepared.name, prepared.definition)
            if (state.preparedRuntime.has(prepared.name)) {
                state.needsRuntime = true
                keepPreparedMarker = true
            } else {
                return null
            }
        }
    }

    if (isPreparedAssignmentExpression(current)) {
        const prepared = parsePreparedDefinition(current as unknown as Expression)
        if (prepared) {
            state.preparedLocal.set(prepared.name, prepared.definition)
            state.needsRuntime = true
            keepPreparedMarker = true
        }
    }

    if (state.classNameMapper && !context.inModuleSpecifier) {
        if (current.type === 'StringLiteral') {
            const literal = current as { value: string; raw?: string }
            const rewritten = rewriteClassNameTokensWithMap(literal.value, mapToken)
            if (rewritten !== literal.value) {
                literal.value = rewritten
                literal.raw = JSON.stringify(rewritten)
            }
        }

        if (
            current.type === 'TemplateLiteral' &&
            Array.isArray((current as { expressions?: unknown[] }).expressions) &&
            (current as { expressions: unknown[] }).expressions.length === 0 &&
            Array.isArray((current as { quasis?: unknown[] }).quasis) &&
            (current as { quasis: unknown[] }).quasis.length
        ) {
            const template = current as { quasis: Array<{ cooked?: string; raw?: string }> }
            const firstQuasi = template.quasis[0]
            if (firstQuasi) {
                const cooked = firstQuasi.cooked ?? ''
                const rewritten = rewriteClassNameTokensWithMap(cooked, mapToken)
                if (rewritten !== cooked) {
                    firstQuasi.cooked = rewritten
                    firstQuasi.raw = rewritten
                }
            }
        }
    }

    const isBossElement = current.type === 'JSXElement' && isBossJsxElement(current as unknown as JSXElement)
    const isBossMarkerCall = (() => {
        if (current.type !== 'CallExpression') return false
        const call = current as unknown as CallExpression
        if (call.callee.type !== 'MemberExpression') return false
        if (call.callee.object?.type !== 'Identifier' || call.callee.object.value !== '$$') return false
        if (call.callee.property?.type !== 'Identifier' || call.callee.property.value !== '$') return false
        return true
    })()

    for (const key of Object.keys(current)) {
        const baseContext =
            context.inJsxChild && current.type !== 'JSXElement' ? { ...context, inJsxChild: false } : context

        let childContext = baseContext
        if (isBossElement) {
            childContext = { ...childContext, inBossElement: true }
        }

        if (current.type === 'JSXElement' && key === 'children') {
            childContext = { ...childContext, inJsxChild: true }
        }

        if (keepPreparedMarker) {
            if (current.type === 'ExpressionStatement' && key === 'expression') {
                childContext = { ...childContext, keepBossMarker: true }
            }
            if (current.type === 'AssignmentExpression' && key === 'right') {
                childContext = { ...childContext, keepBossMarker: true }
            }
        }

        if (isBossMarkerCall && key === 'callee') {
            childContext = { ...childContext, inBossMarkerCall: true }
        }

        if (current.type === 'CallExpression' && key === 'callee') {
            childContext = { ...childContext, inCallCallee: true }
        }

        if (current.type === 'MemberExpression' && key === 'object') {
            childContext = { ...childContext, inMemberExpressionObject: true }
        }

        if (current.type === 'JSXAttribute' && key === 'value') {
            const attrName = getJsxAttributeName(current as { name?: { type?: string; value?: string } })
            const isBossProp = Boolean(
                context.inBossElement && attrName && state.api.dictionary.resolve(attrName).descriptor,
            )
            childContext = { ...childContext, inBossPropValue: isBossProp }
        }

        if (current.type === 'CallExpression' && key === 'arguments') {
            const callee = (current as unknown as CallExpression).callee
            const args = (current as unknown as CallExpression).arguments
            const isBossCall =
                callee.type === 'MemberExpression' &&
                callee.object?.type === 'Identifier' &&
                callee.object.value === '$$' &&
                callee.property?.type === 'Identifier' &&
                callee.property.value === '$' &&
                args.length === 1 &&
                args[0].expression.type === 'ObjectExpression'
            if (isBossCall) {
                childContext = { ...childContext, inBossPropValue: true }
            }
        }

        if (
            (current.type === 'ImportDeclaration' ||
                current.type === 'ExportAllDeclaration' ||
                current.type === 'ExportNamedDeclaration') &&
            key === 'source'
        ) {
            childContext = { ...childContext, inModuleSpecifier: true }
        }

        current[key] = await transformNode(current[key], state, childContext)
    }

    if (current.type === 'JSXElement') {
        const element = current as unknown as JSXElement
        rewriteClassNameTokensInElement(element, state.classNameProp, mapToken)
        return transformJsxElement(element, state, context)
    }

    if (current.type === 'CallExpression') {
        const expr = current as unknown as CallExpression
        const callee = expr.callee
        const isBossMarker =
            callee.type === 'MemberExpression' &&
            callee.object?.type === 'Identifier' &&
            callee.object.value === '$$' &&
            callee.property?.type === 'Identifier' &&
            callee.property.value === '$'
        if (isBossMarker && context.keepBossMarker) {
            return current
        }
        if (
            isBossMarker &&
            expr.arguments.length === 1 &&
            expr.arguments[0].expression.type === 'ObjectExpression'
        ) {
            return expr.arguments[0].expression
        }

        if (isBossMarker && expr.arguments.length === 1) {
            const arg = expr.arguments[0].expression
            if (arg.type === 'StringLiteral') {
                const rewritten = rewriteClassNameTokensWithMap(arg.value, mapToken)
                arg.value = rewritten
                arg.raw = JSON.stringify(rewritten)
            } else if (arg.type === 'TemplateLiteral' && arg.expressions.length === 0) {
                const cooked = arg.quasis[0].cooked ?? ''
                const rewritten = rewriteClassNameTokensWithMap(cooked, mapToken)
                arg.quasis[0].cooked = rewritten
                arg.quasis[0].raw = rewritten
            }
            return arg
        }

        if (callee.type === 'Identifier' && callee.value === '$$') {
            state.needsRuntime = true
        }
    }

    if (current.type === 'MemberExpression') {
        if (context.inBossPropValue) {
            return current
        }
        if (context.inBossMarkerCall) {
            return current
        }
        const member = current as MemberExpression
        if (!context.inMemberExpressionObject && !context.inCallCallee) {
            const tokenPath = getTokenPathFromMemberExpression(member)
            if (tokenPath) {
                const prefix = state.api.selectorPrefix ?? ''
                const value = tokenPathToVar(tokenPath, prefix)
                return createStringLiteral(value, member.span)
            }
        }
        if (member.object?.type === 'Identifier' && member.object.value === '$$') {
            state.needsRuntime = true
        }
    }

    return current
}

const isBossJsxElement = (node: JSXElement) => {
    const name = node.opening.name
    if (name.type === 'Identifier' && name.value === '$$') return true
    if (name.type === 'JSXMemberExpression' && name.object.type === 'Identifier' && name.object.value === '$$') {
        return true
    }
    return false
}

const getJsxAttributeName = (node: { name?: { type?: string; value?: string } }) => {
    if (node.name?.type === 'Identifier') return node.name.value
    return null
}

const createRuntimeHelpersProgram = ({
    unit,
    prefix,
    needsValueHelper,
    needsTokenVarsHelper,
}: {
    unit: string
    prefix: string
    needsValueHelper: boolean
    needsTokenVarsHelper: boolean
}): Module => {
    const imports = []
    const lines = []

    if (needsValueHelper) {
        imports.push('createBossValue')
        lines.push(`const __bossValue = createBossValue(${JSON.stringify(unit)});`)
    }

    if (needsTokenVarsHelper) {
        imports.push('createBossTokenVars')
        lines.push(`const __bossTokenVars = createBossTokenVars(${JSON.stringify(unit)}, ${JSON.stringify(prefix)});`)
    }

    const helperSource = `import { ${imports.join(', ')} } from "boss-css/compile/runtime";
${lines.join('\n')}`

    return parseSync(helperSource, { syntax: 'ecmascript' }) as Module
}

const hasValueHelper = (program: Program) => {
    if (!('body' in program)) return false

    return program.body.some(node => {
        if (node.type !== 'VariableDeclaration') return false
        return node.declarations.some(decl => decl.id.type === 'Identifier' && decl.id.value === '__bossValue')
    })
}

const hasTokenVarsHelper = (program: Program) => {
    if (!('body' in program)) return false

    return program.body.some(node => {
        if (node.type !== 'VariableDeclaration') return false
        return node.declarations.some(decl => decl.id.type === 'Identifier' && decl.id.value === '__bossTokenVars')
    })
}

const isBossImport = (source: string) => {
    if (source === 'boss-css/compile/runtime') return false
    return (
        source.includes('.bo$$/server') ||
        source === 'boss-css' ||
        source.startsWith('boss-css/') ||
        source === 'boss-css/parser/jsx/runtime' ||
        source === 'boss-css/runtime' ||
        source.startsWith('boss-css/runtime/') ||
        source.startsWith('@boss-css/')
    )
}

const isPreparedAssignmentExpression = (node: Record<string, unknown>) => {
    if (node.type !== 'AssignmentExpression') return false
    const assignment = node as {
        left?: { type?: string; object?: { type?: string; value?: string }; property?: { type?: string; value?: string } }
        operator?: string
        right?: Expression
    }
    if (assignment.operator && assignment.operator !== '=') return false
    const left = assignment.left
    if (!left || left.type !== 'MemberExpression') return false
    if (left.object?.type !== 'Identifier' || left.object.value !== '$$') return false
    const property = left.property
    if (!property || property.type !== 'Identifier') return false
    if (!property.value || !/^[A-Z]/.test(property.value)) return false
    return Boolean(assignment.right && getPreparedObjectExpression(assignment.right))
}

const isPreparedAssignment = (node: Record<string, unknown>) => {
    if (node.type !== 'ExpressionStatement') return false
    const statement = node as { expression?: Record<string, unknown> }
    return Boolean(statement.expression && isPreparedAssignmentExpression(statement.expression))
}

const parsePreparedDefinition = (expression: Expression) => {
    const assignment = expression as {
        left?: { property?: { value?: string } }
        right?: Expression
    }
    const name = assignment.left?.property?.value
    const objectExpression = assignment.right ? getPreparedObjectExpression(assignment.right) : null
    if (!name || !objectExpression) return null

    const definition = buildPreparedDefinition(objectExpression)
    if (!definition) return null

    return { name, definition }
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
