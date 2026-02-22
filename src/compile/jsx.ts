import { printSync } from '@swc/core'
import type {
    CallExpression,
    Expression,
    JSXAttribute,
    JSXAttributeName,
    JSXElement,
    JSXElementName,
    JSXExpressionContainer,
    ObjectExpression,
    Program,
    Span,
} from '@swc/types'

import type { CompileConfig } from '@/shared/types'
import type { BossCompilePropPayload, BossProp } from '@/types'
import type { ClassNameMapper } from '@/compile/classname-strategy'
import { createTokenVars } from '@/use/token/vars'

export type PropValue = {
    ast?: Expression
    code?: string
    dynamic: boolean
    isFn?: boolean
    selectorValue?: unknown
    selectorName?: string
    value: unknown
}

export type PropTree = Record<string, PropValue>

export type PreparedDefinition = {
    asExpression: Expression | null
    tree: PropTree
}

export type TransformState = {
    api: any
    classNameProp: string
    compile: CompileConfig
    filename: string
    classNameMapper: ClassNameMapper | null
    needsRuntime: boolean
    needsValueHelper: boolean
    needsTokenVarsHelper: boolean
    replacedElements: number
    preparedLocal: Map<string, PreparedDefinition>
    preparedGlobal: Map<string, PreparedDefinition>
    preparedRuntime: Set<string>
    customCssBlocks: Array<{ start: number; end: number; cssText: string }>
}

type TransformContext = {
    inJsxChild?: boolean
}

const preservedAttrs = new Set(['key', 'ref'])
const fallbackSpan: Span = { start: 0, end: 0, ctxt: 0 }
const ensureSpan = (span?: Span) => {
    if (!span) return fallbackSpan
    return typeof span.ctxt === 'number' ? span : { ...span, ctxt: 0 }
}
const getSpan = (node: unknown) => {
    if (node && typeof node === 'object' && 'span' in node) {
        return ensureSpan((node as { span?: Span }).span)
    }
    return fallbackSpan
}

const createJsxAttribute = (name: string, value: JSXAttribute['value'], span: Span): JSXAttribute => {
    const safeSpan = ensureSpan(span)
    return {
        type: 'JSXAttribute',
        span: safeSpan,
        name: { type: 'Identifier', value: name, span: safeSpan, optional: false },
        value,
    }
}

const createJsxExpressionContainer = (expression: Expression, span: Span): JSXExpressionContainer => {
    const safeSpan = ensureSpan(span)
    return {
        type: 'JSXExpressionContainer',
        span: safeSpan,
        expression,
    }
}

export async function transformJsxElement(
    node: JSXElement,
    state: TransformState,
    context: TransformContext,
): Promise<JSXElement | JSXExpressionContainer | Expression> {
    const opening = node.opening
    const name = opening.name
    const bossElement = getBossElement(name)
    const classNameProp = state.classNameProp ?? 'className'

    if (!bossElement) {
        return node
    }

    let prepared: PreparedDefinition | null = null
    if (bossElement.isPrepared) {
        prepared =
            state.preparedLocal.get(bossElement.tagName) ??
            state.preparedGlobal.get(bossElement.tagName) ??
            null
        if (!prepared) {
            state.needsRuntime = true
            return node
        }
    }

    const hasSpread = opening.attributes.some(attr => attr.type === 'SpreadElement')
    if (hasSpread && !state.compile.spread) {
        state.needsRuntime = true
        return node
    }

    const { tagName } = bossElement
    const fallbackTag = prepared ? 'div' : tagName

    const { tag, asAttribute, asExpression } = resolveTagFromAs(
        opening.attributes,
        fallbackTag,
        prepared?.asExpression,
    )

    const { tree, passthroughAttributes, tokensProp } = await buildPropTree(
        opening.attributes,
        asAttribute,
        state,
        classNameProp,
        tag,
        prepared?.tree,
    )

    await state.api.trigger(
        'onPropTree',
        {
            input: state.api.propTreeToObject(tree),
            tree,
            preferVariables: true,
            parser: 'jsx',
            file: { path: state.filename },
        },
        (plugin: { name?: string }) => plugin.name === 'token',
    )

    const cssTree = structuredClone(tree)
    await state.api.trigger('onPropTree', {
        input: state.api.propTreeToObject(cssTree),
        tree: cssTree,
        preferVariables: true,
        parser: 'jsx',
        file: { path: state.filename },
    })

    const hasInlineFirst = state.api.plugins.some((plugin: { name?: string }) => plugin.name === 'inline-first')
    const hasClassnameFirst = state.api.plugins.some((plugin: { name?: string }) => plugin.name === 'classname-first')

    if (!hasInlineFirst && !hasClassnameFirst) {
        throw new Error('compile: only inline-first or classname-first strategies are supported right now')
    }

    const { classNames, styleProps } = hasClassnameFirst
        ? buildClassnameFirstOutput(tree, tag, state)
        : buildInlineFirstOutput(tree, tag, state)
    const classNameValue = Array.from(classNames).join(' ').trim()
    const tagSpan = ensureSpan(opening.span)

    const existingClassName = findAttribute(opening.attributes, classNameProp)
    const existingStyle = findAttribute(opening.attributes, 'style')
    const tokensExpression = buildTokenVarsExpression(tokensProp, state, tagSpan)

    const nextAttributes = []

    for (const attr of opening.attributes) {
        if (attr.type === 'SpreadElement') {
            nextAttributes.push(attr)
            continue
        }
        if (attr.type !== 'JSXAttribute') continue
        const attrName = attributeName(attr.name)
        if (!attrName) continue
        if (attrName === 'style' || attrName === 'as') continue
        if (attrName === classNameProp) continue
        if (preservedAttrs.has(attrName)) {
            nextAttributes.push(attr)
        }
    }

    if (passthroughAttributes.length) {
        nextAttributes.push(...passthroughAttributes)
    }

    const mergedClassName = mergeClassName(existingClassName, classNameValue, tagSpan, classNameProp)
    if (mergedClassName) {
        nextAttributes.push(mergedClassName)
    }

    const mergedStyle = mergeStyle(existingStyle, styleProps, tagSpan)
    const finalStyle = tokensExpression ? appendStyle(mergedStyle, tokensExpression, tagSpan) : mergedStyle
    if (finalStyle) {
        nextAttributes.push(finalStyle)
    }

    opening.attributes = nextAttributes
    opening.name = toJsxIdentifier(tag, tagSpan)
    if (node.closing) {
        node.closing.name = toJsxIdentifier(tag, ensureSpan(node.closing.span))
    }

    state.replacedElements += 1

    if (asExpression) {
        return wrapDynamicAs(node, asExpression, tagSpan, context)
    }

    return node
}

const getBossElement = (name: JSXElementName) => {
    if (name.type === 'Identifier' && name.value === '$$') {
        return { tagName: 'div', isPrepared: false }
    }

    if (name.type === 'JSXMemberExpression' && name.object.type === 'Identifier' && name.object.value === '$$') {
        const tagName = name.property.value
        const isPrepared = /^[A-Z]/.test(tagName)
        return { tagName, isPrepared }
    }

    return null
}

const resolveTagFromAs = (
    attributes: JSXElement['opening']['attributes'],
    fallback: string,
    preparedAs?: Expression | null,
): { tag: string; asAttribute: JSXAttribute | null; asExpression: Expression | null } => {
    const asAttribute = findAttribute(attributes, 'as')

    if (!asAttribute && !preparedAs) {
        return { tag: fallback, asAttribute: null, asExpression: null }
    }

    if (asAttribute) {
        const attrValue = asAttribute.value
        if (!attrValue) {
            return { tag: fallback, asAttribute, asExpression: null }
        }

        if (attrValue.type === 'StringLiteral') {
            return { tag: attrValue.value, asAttribute, asExpression: null }
        }

        if (attrValue.type === 'JSXExpressionContainer') {
            const expression = attrValue.expression
            if (expression.type === 'StringLiteral') {
                return { tag: expression.value, asAttribute, asExpression: null }
            }
            if (expression.type === 'TemplateLiteral' && expression.expressions.length === 0) {
                return { tag: expression.quasis[0].cooked ?? '', asAttribute, asExpression: null }
            }
            return { tag: fallback, asAttribute, asExpression: expression }
        }
    }

    if (preparedAs) {
        if (preparedAs.type === 'StringLiteral') {
            return { tag: preparedAs.value, asAttribute: null, asExpression: null }
        }
        if (preparedAs.type === 'TemplateLiteral' && preparedAs.expressions.length === 0) {
            return { tag: preparedAs.quasis[0].cooked ?? '', asAttribute: null, asExpression: null }
        }
        return { tag: fallback, asAttribute: null, asExpression: preparedAs }
    }

    return { tag: fallback, asAttribute: null, asExpression: null }
}

const buildPropTree = async (
    attributes: JSXElement['opening']['attributes'],
    asAttribute: JSXAttribute | null,
    state: TransformState,
    classNameProp: string,
    tag: string,
    baseTree?: PropTree,
) => {
    const tree: PropTree = baseTree ? structuredClone(baseTree) : {}
    const passthroughAttributes: JSXAttribute[] = []
    let tokensProp: PropValue | null = null

    for (const attr of attributes) {
        if (attr.type !== 'JSXAttribute') continue
        if (attr === asAttribute) continue

        const name = attributeName(attr.name)
        if (!name) continue
        if (name === 'style' || preservedAttrs.has(name) || name === classNameProp) continue
        if (name === 'tokens') {
            const parsed = parseAttributeValue(attr.value)
            if (parsed) {
                tokensProp = tokensProp ? mergePropValues(tokensProp, parsed) : parsed
            }
            continue
        }
        if (!state.api.dictionary.resolve(name).descriptor) {
            const parsed = parseAttributeValue(attr.value)
            const compileAttrs = parsed
                ? await applyCompileProp({ name, parsed, attr, state, tag })
                : [attr]
            passthroughAttributes.push(...compileAttrs)
            continue
        }

        const parsed = parseAttributeValue(attr.value)
        if (!parsed) continue
        tree[name] = mergePropValues(tree[name], parsed)
    }

    return { tree, passthroughAttributes, tokensProp }
}

const applyCompileProp = async ({
    name,
    parsed,
    attr,
    state,
    tag,
}: {
    name: string
    parsed: PropValue
    attr: JSXAttribute
    state: TransformState
    tag: string
}): Promise<JSXAttribute[]> => {
    const output: Record<string, BossProp | unknown> = {}
    const payload: BossCompilePropPayload = {
        name,
        prop: toBossProp(parsed),
        output,
        tag,
        file: { path: state.filename },
    }

    await state.api.trigger('onCompileProp', payload)

    if (payload.remove) return []

    const entries = Object.entries(output)
    if (!entries.length) return [attr]

    const result: JSXAttribute[] = []
    for (const [nextName, value] of entries) {
        const outputProp = normalizeCompilePropValue(value)
        const nextAttr = createCompileAttribute(nextName, outputProp, attr)
        if (nextAttr) {
            result.push(nextAttr)
        }
    }

    if (payload.keep) {
        result.push(attr)
    }

    return result
}

const toBossProp = (prop: PropValue): BossProp => ({
    value: prop.value,
    dynamic: prop.dynamic,
    isFn: prop.isFn,
    ast: prop.ast,
    code: prop.code,
    selectorValue: prop.selectorValue,
})

const normalizeCompilePropValue = (value: BossProp | unknown): BossProp => {
    if (value && typeof value === 'object' && 'value' in (value as BossProp)) {
        return value as BossProp
    }
    return { value } as BossProp
}

const createCompileAttribute = (name: string, prop: BossProp, sourceAttr: JSXAttribute): JSXAttribute | null => {
    const span = ensureSpan(sourceAttr.span)

    if (prop.ast) {
        return createJsxAttribute(name, createJsxExpressionContainer(structuredClone(prop.ast as Expression), span), span)
    }

    const value = prop.value

    if (value === true) {
        return createJsxAttribute(name, null, span)
    }

    if (value === false) {
        return createJsxAttribute(name, createJsxExpressionContainer(createBooleanLiteral(false, span), span), span)
    }

    if (value === null) {
        return createJsxAttribute(name, createJsxExpressionContainer(createNullLiteral(span), span), span)
    }

    if (value === undefined) {
        const clonedValue = sourceAttr.value ? structuredClone(sourceAttr.value) : null
        return createJsxAttribute(name, clonedValue, span)
    }

    if (typeof value === 'string') {
        return createJsxAttribute(name, { type: 'StringLiteral', span, value, raw: JSON.stringify(value) }, span)
    }

    if (typeof value === 'number') {
        return createJsxAttribute(name, { type: 'NumericLiteral', span, value }, span)
    }

    if (sourceAttr.value) {
        return createJsxAttribute(name, structuredClone(sourceAttr.value), span)
    }

    return null
}

const createBooleanLiteral = (value: boolean, span: Span) => ({
    type: 'BooleanLiteral' as const,
    span: ensureSpan(span),
    value,
})

const createNullLiteral = (span: Span) => ({
    type: 'NullLiteral' as const,
    span: ensureSpan(span),
})

const parseAttributeValue = (value: JSXAttribute['value']): PropValue | null => {
    if (!value) {
        return { dynamic: false, value: true }
    }

    if (value.type === 'StringLiteral') {
        return { dynamic: false, value: value.value }
    }

    if (value.type === 'JSXExpressionContainer') {
        return parseExpressionValue(value.expression)
    }

    return { dynamic: true, value: null }
}

const mergePropValues = (base: PropValue | undefined, next: PropValue): PropValue => {
    if (!base) return next
    const baseValue = base.value
    const nextValue = next.value
    const baseIsObject = isPropTreeValue(baseValue)
    const nextIsObject = isPropTreeValue(nextValue)

    if (baseIsObject && nextIsObject) {
        return {
            ...base,
            ...next,
            dynamic: base.dynamic || next.dynamic,
            value: mergePropTrees(baseValue as PropTree, nextValue as PropTree),
        }
    }

    return next
}

const mergePropTrees = (base: PropTree, next: PropTree): PropTree => {
    const merged = structuredClone(base)
    for (const [key, value] of Object.entries(next)) {
        merged[key] = mergePropValues(merged[key], value)
    }
    return merged
}

const isPropTreeValue = (value: unknown): value is PropTree => {
    return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

export const parseExpressionValue = (expression: JSXExpressionContainer['expression']): PropValue => {
    if (expression.type === 'JSXEmptyExpression') {
        return { dynamic: true, value: null }
    }
    if (expression.type === 'NumericLiteral') {
        return { dynamic: false, value: expression.value }
    }
    if (expression.type === 'StringLiteral') {
        return { dynamic: false, value: expression.value }
    }
    if (expression.type === 'BooleanLiteral') {
        return { dynamic: false, value: expression.value }
    }
    if (expression.type === 'NullLiteral') {
        return { dynamic: false, value: null }
    }
    if (expression.type === 'TemplateLiteral') {
        if (expression.expressions.length === 0) {
            return { dynamic: false, value: expression.quasis[0].cooked ?? '' }
        }
        return {
            dynamic: true,
            value: null,
            ast: structuredClone(expression),
            code: printExpression(expression),
        }
    }
    if (expression.type === 'ArrowFunctionExpression' || expression.type === 'FunctionExpression') {
        return {
            dynamic: true,
            value: null,
            ast: structuredClone(expression),
            code: printExpression(expression),
            isFn: true,
        }
    }
    if (expression.type === 'ArrayExpression') {
        const values = []
        let dynamic = false
        for (const entry of expression.elements) {
            if (!entry) {
                dynamic = true
                continue
            }
            const parsed = parseExpressionValue(entry.expression)
            dynamic = dynamic || parsed.dynamic
            values.push(parsed)
        }

        return {
            dynamic,
            value: values,
            ast: dynamic ? structuredClone(expression) : undefined,
            code: dynamic ? printExpression(expression) : undefined,
        }
    }
    if (expression.type === 'ObjectExpression') {
        const value: Record<string, PropValue> = {}
        let dynamic = false

        for (const prop of expression.properties) {
            if (prop.type !== 'KeyValueProperty') {
                dynamic = true
                continue
            }
            if (prop.key.type !== 'Identifier' && prop.key.type !== 'StringLiteral') {
                dynamic = true
                continue
            }
            const key = prop.key.type === 'Identifier' ? prop.key.value : prop.key.value
            const parsed = parseExpressionValue(prop.value)
            dynamic = dynamic || parsed.dynamic
            value[key] = parsed
        }

        return {
            dynamic,
            value,
            ast: dynamic ? structuredClone(expression) : undefined,
            code: dynamic ? printExpression(expression) : undefined,
        }
    }

    return {
        dynamic: true,
        value: null,
        ast: structuredClone(expression as Expression),
        code: printExpression(expression as Expression),
    }
}

export const buildPreparedDefinition = (objectExpression: ObjectExpression): PreparedDefinition | null => {
    const tree: PropTree = {}
    let asExpression: Expression | null = null
    const ignored = new Set(['as', 'class', 'className', 'style', 'key', 'ref'])

    for (const prop of objectExpression.properties) {
        if (prop.type !== 'KeyValueProperty') continue
        if (prop.key.type !== 'Identifier' && prop.key.type !== 'StringLiteral') continue

        const key = prop.key.type === 'Identifier' ? prop.key.value : prop.key.value
        if (ignored.has(key)) {
            if (key === 'as') {
                asExpression = prop.value
            }
            continue
        }

        const parsed = parseExpressionValue(prop.value)
        tree[key] = parsed
    }

    return {
        asExpression,
        tree,
    }
}

export const isPreparedDefinitionStatic = (definition: PreparedDefinition) => {
    if (!isStaticAsExpression(definition.asExpression)) return false
    return isPropTreeStatic(definition.tree)
}

const buildInlineFirstOutput = (tree: PropTree, tag: string, state: TransformState) => {
    const classNames = new Set<string>()
    const styleProps = new Map<string, Expression>()

    const walk = (node: PropTree, contexts: string[]) => {
        for (const [name, prop] of Object.entries(node)) {
            const value = prop.value

            if (value && typeof value === 'object' && !Array.isArray(value)) {
                walk(value as PropTree, [...contexts, name])
                continue
            }

            const resolved = state.api.dictionary.resolve(name)
            const isCssProp = Boolean(resolved.descriptor?.isCSSProp)
            if (!isCssProp) {
                continue
            }
            const shouldInline = contexts.length === 0 && isCssProp

            const propName = resolved.name
            const expr = propToExpression(prop, propName, state)
            if (!expr) continue

            if (shouldInline) {
                styleProps.set(propName, expr)
            } else {
                const selectorName = prop.selectorName ?? propName
                classNames.add(
                    state.api.contextToClassName(selectorName, null, contexts, false, state.api.selectorPrefix),
                )
                styleProps.set(
                    state.api.contextToCSSVariable(propName, null, contexts, state.api.selectorPrefix),
                    expr,
                )
            }
        }
    }

    walk(tree, [])

    return { classNames, styleProps }
}

const buildClassnameFirstOutput = (tree: PropTree, tag: string, state: TransformState) => {
    const classNames = new Set<string>()
    const styleProps = new Map<string, Expression>()

    const resolveSelectorValue = (prop: PropValue) => {
        if (prop.selectorValue !== undefined) return prop.selectorValue
        if (Array.isArray(prop.value)) {
            return prop.value.map(entry => (entry as PropValue).value)
        }
        return prop.value
    }

    const walk = (node: PropTree, contexts: string[]) => {
        for (const [name, prop] of Object.entries(node)) {
            const value = prop.value

            if (value && typeof value === 'object' && !Array.isArray(value)) {
                walk(value as PropTree, [...contexts, name])
                continue
            }

            const resolved = state.api.dictionary.resolve(name)
            const isCssProp = Boolean(resolved.descriptor?.isCSSProp)
            if (!isCssProp) {
                continue
            }

            if (prop.dynamic && !prop.isFn) {
                console.warn(
                    `[boss-css] compile skipped dynamic prop "${name}" in ${state.filename}. ` +
                        `Use ${name}={() => value} with classname-first.`,
                )
                continue
            }

            const isDynamicFn = prop.dynamic && prop.isFn
            const selectorValue = isDynamicFn ? null : resolveSelectorValue(prop)
            const propName = resolved.name
            const selectorName = prop.selectorName ?? propName
            classNames.add(
                state.api.contextToClassName(selectorName, selectorValue, contexts, false, state.api.selectorPrefix),
            )

            if (!isDynamicFn) continue

            const expr = propToDynamicExpression(prop, propName, state)
            if (!expr) continue

            styleProps.set(state.api.contextToCSSVariable(propName, null, contexts, state.api.selectorPrefix), expr)
        }
    }

    walk(tree, [])

    return { classNames, styleProps }
}

const propToExpression = (prop: PropValue, name: string, state: TransformState): Expression | null => {
    const span = getSpan(prop.ast)
    if (prop.dynamic) {
        if (!prop.ast) return null
        state.needsValueHelper = true
        return {
            type: 'CallExpression',
            span,
            callee: {
                type: 'Identifier',
                value: '__bossValue',
                optional: false,
                span,
            },
            arguments: [{ expression: prop.ast }],
        } as CallExpression
    }

    const resolvedValue = resolveStaticValue(prop.value, name, state)
    return literalExpression(resolvedValue, span)
}

const propToDynamicExpression = (prop: PropValue, name: string, state: TransformState): Expression | null => {
    if (!prop.ast) return null
    const span = getSpan(prop.ast)
    const callTarget =
        prop.isFn && prop.ast
            ? ({
                  type: 'ParenthesisExpression',
                  span,
                  expression: prop.ast,
              } as const)
            : prop.ast
    const resolvedExpression = prop.isFn
        ? ({
              type: 'CallExpression',
              span,
              callee: callTarget,
              arguments: [],
          } as CallExpression)
        : prop.ast

    state.needsValueHelper = true
    return {
        type: 'CallExpression',
        span,
        callee: {
            type: 'Identifier',
            value: '__bossValue',
            optional: false,
            span,
        },
        arguments: [{ expression: resolvedExpression }],
    } as CallExpression
}

const resolveStaticValue = (value: unknown, name: string, state: TransformState) => {
    if (Array.isArray(value)) {
        return state.api.dictionary.toValue(
            value.map(entry => (entry as PropValue).value),
            name,
        )
    }
    return state.api.dictionary.toValue(value, name)
}

const literalExpression = (value: unknown, span?: Span): Expression => {
    const safeSpan = ensureSpan(span)
    if (typeof value === 'number') {
        return { type: 'NumericLiteral', value, span: safeSpan }
    }
    if (typeof value === 'boolean') {
        return { type: 'BooleanLiteral', value, span: safeSpan }
    }
    if (value === null) {
        return { type: 'NullLiteral', span: safeSpan }
    }
    return { type: 'StringLiteral', value: String(value), span: safeSpan }
}

const mergeClassName = (
    existing: JSXAttribute | null,
    addition: string,
    span: Span,
    classNameProp: string,
): JSXAttribute | null => {
    if (!addition && !existing) return null
    if (!addition) return existing
    const safeSpan = ensureSpan(span)

    if (!existing) {
        return createJsxAttribute(classNameProp, { type: 'StringLiteral', value: addition, span: safeSpan }, safeSpan)
    }

    const value = existing.value
    if (!value) {
        return {
            ...existing,
            value: { type: 'StringLiteral', value: addition, span: safeSpan },
        }
    }

    if (value.type === 'StringLiteral') {
        return {
            ...existing,
            value: { type: 'StringLiteral', value: `${value.value} ${addition}`.trim(), span: safeSpan },
        }
    }

    if (value.type === 'JSXExpressionContainer') {
        return {
            ...existing,
            value: createJsxExpressionContainer(
                {
                    type: 'BinaryExpression',
                    operator: '+',
                    span: safeSpan,
                    left: value.expression as Expression,
                    right: { type: 'StringLiteral', value: ` ${addition}`, span: safeSpan },
                },
                safeSpan,
            ),
        }
    }

    return existing
}

const mergeStyle = (existing: JSXAttribute | null, styleProps: Map<string, Expression>, span: Span) => {
    if (!styleProps.size && !existing) return null
    if (!styleProps.size) return existing
    const safeSpan = ensureSpan(span)

    const styleObject = toStyleObject(styleProps, safeSpan)

    if (!existing) {
        return createJsxAttribute(
            'style',
            createJsxExpressionContainer(styleObject, safeSpan),
            safeSpan,
        )
    }

    const value = existing.value
    if (value?.type === 'JSXExpressionContainer' && value.expression.type === 'ObjectExpression') {
        return {
            ...existing,
            value: createJsxExpressionContainer(mergeObjectExpressions(value.expression, styleObject), safeSpan),
        }
    }

    return {
        ...existing,
        value: createJsxExpressionContainer(
            createObjectAssignExpression(styleObject, valueExpression(value, safeSpan), safeSpan),
            safeSpan,
        ),
    }
}

const appendStyle = (existing: JSXAttribute | null, extra: Expression, span: Span) => {
    const safeSpan = ensureSpan(span)
    if (!existing) {
        return createJsxAttribute(
            'style',
            createJsxExpressionContainer(extra, safeSpan),
            safeSpan,
        )
    }

    const value = existing.value
    if (value?.type === 'JSXExpressionContainer') {
        return {
            ...existing,
            value: createJsxExpressionContainer(
                mergeStyleExpressions(value.expression as Expression, extra, safeSpan),
                safeSpan,
            ),
        }
    }

    return existing
}

const mergeStyleExpressions = (base: Expression, extra: Expression, span: Span): Expression => {
    if (base.type === 'ObjectExpression' && extra.type === 'ObjectExpression') {
        return mergeObjectExpressions(base, extra)
    }

    return createObjectAssignExpression(base, extra, span)
}

const createObjectAssignExpression = (base: Expression, extra: Expression, span: Span): Expression => {
    const safeSpan = ensureSpan(span)
    return {
        type: 'CallExpression',
        span: safeSpan,
        callee: {
            type: 'MemberExpression',
            span: safeSpan,
            object: { type: 'Identifier', value: 'Object', optional: false, span: safeSpan },
            property: { type: 'Identifier', value: 'assign', optional: false, span: safeSpan },
        },
        arguments: [{ expression: base }, { expression: extra }],
    } as CallExpression
}

const toStyleObject = (styleProps: Map<string, Expression>, span: Span): ObjectExpression => {
    const safeSpan = ensureSpan(span)
    return {
        type: 'ObjectExpression',
        span: safeSpan,
        properties: Array.from(styleProps.entries()).map(([key, value]) => {
            const isIdentifier = /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key) && !key.includes('-')
            const propKey = isIdentifier
                ? ({ type: 'Identifier', value: key, optional: false, span: safeSpan } as const)
                : ({ type: 'StringLiteral', value: key, span: safeSpan } as const)
            return {
                type: 'KeyValueProperty',
                span: safeSpan,
                key: propKey,
                value,
            }
        }) as ObjectExpression['properties'],
    }
}

const mergeObjectExpressions = (target: ObjectExpression, source: ObjectExpression): ObjectExpression => {
    target.properties = [...target.properties, ...source.properties]
    return target
}

const valueExpression = (value: JSXAttribute['value'], span: Span): Expression => {
    const safeSpan = ensureSpan(span)
    if (value && value.type === 'JSXExpressionContainer') {
        return value.expression as Expression
    }
    if (value && value.type === 'StringLiteral') {
        return { type: 'StringLiteral', value: value.value, span: safeSpan }
    }
    return { type: 'ObjectExpression', span: safeSpan, properties: [] }
}

const attributeName = (name: JSXAttributeName) => {
    if (name.type === 'Identifier') return name.value
    return null
}

const findAttribute = (attributes: JSXElement['opening']['attributes'], name: string) => {
    for (const attr of attributes) {
        if (attr.type !== 'JSXAttribute') continue
        const attrName = attributeName(attr.name)
        if (attrName === name) return attr
    }
    return null
}

const toJsxIdentifier = (value: string, span: Span): JSXElementName => {
    return { type: 'Identifier', value, optional: false, span: ensureSpan(span) }
}

const printExpression = (expression: Expression) => {
    const safeSpan = getSpan(expression)
    const program: Program = {
        type: 'Module',
        body: [
            {
                type: 'ExpressionStatement',
                expression,
                span: safeSpan,
            },
        ],
        interpreter: '',
        span: safeSpan,
    }
    return printSync(program).code.replace(/^#!.*\n/, '').replace(/;\s*$/, '')
}

const isPropTreeStatic = (tree: PropTree): boolean => {
    for (const prop of Object.values(tree)) {
        if (prop.dynamic) return false
        const value = prop.value
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            if (!isPropTreeStatic(value as PropTree)) return false
        }
    }
    return true
}

const isStaticAsExpression = (expression: Expression | null) => {
    if (!expression) return true
    if (expression.type === 'StringLiteral') return true
    return expression.type === 'TemplateLiteral' && expression.expressions.length === 0
}

const buildTokenVarsExpression = (tokensProp: PropValue | null, state: TransformState, span: Span) => {
    if (!tokensProp) return null

    if (tokensProp.dynamic) {
        if (!tokensProp.ast) return null
        const safeSpan = getSpan(tokensProp.ast)
        const argExpression = tokensProp.isFn
            ? ({
                  type: 'CallExpression',
                  span: safeSpan,
                  callee: {
                      type: 'ParenthesisExpression',
                      span: safeSpan,
                      expression: tokensProp.ast,
                  },
                  arguments: [],
              } as CallExpression)
            : tokensProp.ast

        state.needsTokenVarsHelper = true
        return {
            type: 'CallExpression',
            span: safeSpan,
            callee: {
                type: 'Identifier',
                value: '__bossTokenVars',
                optional: false,
                span: safeSpan,
            },
            arguments: [{ expression: argExpression }],
        } as CallExpression
    }

    const overrides = propValueToRaw(tokensProp)
    if (!overrides || typeof overrides !== 'object' || Array.isArray(overrides)) return null

    const tokenVars = createTokenVars({
        prefix: state.api.selectorPrefix ?? '',
        toValue: (value, property) => state.api.dictionary.toValue(value, property),
    })(overrides as Record<string, unknown>)

    const entries = new Map<string, Expression>()
    for (const [key, value] of Object.entries(tokenVars)) {
        entries.set(key, literalExpression(value, ensureSpan(span)))
    }

    if (!entries.size) return null

    return toStyleObject(entries, ensureSpan(span))
}

const propValueToRaw = (prop: PropValue): unknown => {
    const value = prop.value
    if (Array.isArray(value)) {
        return value.map(entry => propValueToRaw(entry as PropValue))
    }
    if (value && typeof value === 'object') {
        return Object.entries(value as Record<string, PropValue>).reduce<Record<string, unknown>>((acc, [key, entry]) => {
            acc[key] = propValueToRaw(entry as PropValue)
            return acc
        }, {})
    }
    return value
}

const wrapDynamicAs = (
    node: JSXElement,
    asExpression: Expression,
    span: Span,
    context: TransformContext,
): JSXExpressionContainer | Expression => {
    const safeSpan = ensureSpan(span)
    const componentId = '__BossCmp'
    const componentIdentifier = {
        type: 'Identifier',
        value: componentId,
        optional: false,
        span: safeSpan,
    } as const

    const element = structuredClone(node) as JSXElement
    element.opening.name = componentIdentifier
    if (element.closing) {
        element.closing.name = componentIdentifier
    }

    const declaration = {
        type: 'VariableDeclaration',
        span: safeSpan,
        kind: 'const',
        declarations: [
            {
                type: 'VariableDeclarator',
                span: safeSpan,
                id: componentIdentifier,
                init: asExpression,
            },
        ],
    } as const

    const returnStatement = {
        type: 'ReturnStatement',
        span: safeSpan,
        argument: element,
    } as const

    const iife = {
        type: 'CallExpression',
        span: safeSpan,
        callee: {
            type: 'FunctionExpression',
            span: safeSpan,
            identifier: undefined,
            params: [],
            body: {
                type: 'BlockStatement',
                span: safeSpan,
                stmts: [declaration, returnStatement],
            },
            generator: false,
            async: false,
        },
        arguments: [],
    } as CallExpression

    if (context.inJsxChild) {
        return {
            type: 'JSXExpressionContainer',
            span: safeSpan,
            expression: iife,
        }
    }

    return iife
}
