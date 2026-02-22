import {
    collectClassLiteralsFromExpression,
    compilePatterns,
    matchesPattern,
    getCalleeName,
    getJSXAttributeName,
    getLiteralInfo,
} from '../utils/ast.js'
import {
    DEFAULT_ATTRIBUTE_PATTERNS,
    DEFAULT_CALLEE_PATTERNS,
    DEFAULT_VARIABLE_PATTERNS,
    DEFAULT_TAG_PATTERNS,
} from '../utils/defaults.js'
import { buildLiteralReplacement } from '../utils/format.js'
import { getApi } from '../utils/api.js'
import { isCssPropName, parseGroupedSelector, splitClassList, splitFragments } from '../utils/boss-classes.js'

const RULE_NAME = 'prefer-unitless-values'

const defaultOptions = {
    attributes: DEFAULT_ATTRIBUTE_PATTERNS,
    callees: DEFAULT_CALLEE_PATTERNS,
    variables: DEFAULT_VARIABLE_PATTERNS,
    tags: DEFAULT_TAG_PATTERNS,
    additionalProps: [],
    unit: null,
}

const createPatterns = options => ({
    attributes: compilePatterns(options.attributes),
    callees: compilePatterns(options.callees),
    variables: compilePatterns(options.variables),
    tags: compilePatterns(options.tags),
})

const normalizeUnit = value => {
    if (typeof value !== 'string') return null
    const trimmed = value.trim()
    return trimmed.length ? trimmed : null
}

const escapeRegExp = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const createUnitValuePattern = unit => new RegExp(`(^|_)([+-]?(?:\\d*\\.\\d+|\\d+))${escapeRegExp(unit)}(?=(_|$))`, 'g')

const stripDefaultUnitSuffixes = (rawValue, unit, pattern = createUnitValuePattern(unit)) => {
    if (!rawValue || !unit) return null

    let changed = false
    const nextValue = rawValue.replace(pattern, (_, prefix, numberValue) => {
        changed = true
        return `${prefix}${numberValue}`
    })

    return changed ? nextValue : null
}

const getSimpleTokenValueInfo = (token, extraProps) => {
    const fragments = splitFragments(token)
    if (!fragments.length) return null

    let propIndex = -1
    for (let i = 0; i < fragments.length; i += 1) {
        if (isCssPropName(fragments[i], extraProps)) {
            propIndex = i
            break
        }
    }

    if (propIndex === -1 || propIndex >= fragments.length - 1) return null

    return {
        prop: fragments[propIndex],
        value: fragments.slice(propIndex + 1).join(':'),
        prefix: fragments.slice(0, propIndex + 1).join(':'),
    }
}

const rewriteGroupedToken = (token, unit, extraProps, pattern) => {
    const grouped = parseGroupedSelector(token)
    if (!grouped) return null

    let changed = false
    const entries = []
    const issues = []

    for (const entry of grouped.entries) {
        const current = entry.rawValue
        const nextValue = isCssPropName(entry.name, extraProps)
            ? stripDefaultUnitSuffixes(current, unit, pattern)
            : null

        if (!nextValue) {
            entries.push(entry)
            continue
        }

        changed = true
        entries.push({ ...entry, rawValue: nextValue })
        issues.push({
            prop: entry.name,
            value: current,
            nextValue,
        })
    }

    if (!changed) return null

    return {
        nextToken: `${grouped.prefix}:{${entries.map(entry => `${entry.name}:${entry.rawValue}`).join(';')}}`,
        issues,
    }
}

const rewriteSimpleToken = (token, unit, extraProps, pattern) => {
    const valueInfo = getSimpleTokenValueInfo(token, extraProps)
    if (!valueInfo) return null

    const nextValue = stripDefaultUnitSuffixes(valueInfo.value, unit, pattern)
    if (!nextValue) return null

    return {
        nextToken: `${valueInfo.prefix}:${nextValue}`,
        issues: [
            {
                prop: valueInfo.prop,
                value: valueInfo.value,
                nextValue,
            },
        ],
    }
}

const rewriteTokenUnitValues = (token, unit, extraProps, pattern = createUnitValuePattern(unit)) =>
    rewriteGroupedToken(token, unit, extraProps, pattern) || rewriteSimpleToken(token, unit, extraProps, pattern)

const analyzeClassList = (classList, unit, extraProps) => {
    const tokens = splitClassList(classList)
    if (!tokens.length) return { issues: [], nextClassList: null }

    const pattern = createUnitValuePattern(unit)
    let changed = false
    const issues = []

    const nextTokens = tokens.map(token => {
        const rewritten = rewriteTokenUnitValues(token, unit, extraProps, pattern)
        if (!rewritten) return token
        changed = true
        issues.push(...rewritten.issues)
        return rewritten.nextToken
    })

    return {
        issues,
        nextClassList: changed ? nextTokens.join(' ') : null,
    }
}

const create = context => {
    const sourceCode = context.getSourceCode()
    const options = { ...defaultOptions, ...(context.options[0] || {}) }
    const patterns = createPatterns(options)
    const extraProps = options.additionalProps?.length ? new Set(options.additionalProps) : null
    const { api } = getApi()
    const unit = normalizeUnit(options.unit) || normalizeUnit(api?.unit) || 'px'

    if (!unit) {
        return {}
    }

    const reportLiteral = literal => {
        if (!literal || !literal.value) return

        const { issues, nextClassList } = analyzeClassList(literal.value, unit, extraProps)
        if (!issues.length) return

        const preview = issues
            .slice(0, 3)
            .map(issue => `${issue.prop}:${issue.value} -> ${issue.prop}:${issue.nextValue}`)
            .join(', ')
        const remainder = issues.length > 3 ? ` (+${issues.length - 3} more)` : ''

        context.report({
            node: literal.node,
            messageId: 'preferUnitlessValues',
            data: {
                unit,
                values: preview + remainder,
            },
            fix:
                literal.canFix && nextClassList
                    ? fixer => fixer.replaceText(literal.node, buildLiteralReplacement(literal.node, sourceCode, nextClassList))
                    : null,
        })
    }

    return {
        JSXAttribute(node) {
            const name = getJSXAttributeName(node)
            if (!name || !matchesPattern(patterns.attributes, name)) return

            if (!node.value) return

            const literals = []
            collectClassLiteralsFromExpression(node.value, sourceCode, literals)

            for (const literal of literals) {
                reportLiteral(literal)
            }
        },
        CallExpression(node) {
            const calleeName = getCalleeName(node.callee)
            if (!calleeName || !matchesPattern(patterns.callees, calleeName)) return

            const literals = []
            for (const argument of node.arguments) {
                collectClassLiteralsFromExpression(argument, sourceCode, literals)
            }

            for (const literal of literals) {
                reportLiteral(literal)
            }
        },
        VariableDeclarator(node) {
            if (!node.id || node.id.type !== 'Identifier') return
            if (!matchesPattern(patterns.variables, node.id.name)) return

            const literals = []
            collectClassLiteralsFromExpression(node.init, sourceCode, literals)

            for (const literal of literals) {
                reportLiteral(literal)
            }
        },
        TaggedTemplateExpression(node) {
            const tagName = getCalleeName(node.tag)
            if (!tagName || !matchesPattern(patterns.tags, tagName)) return

            const literal = getLiteralInfo(node.quasi, sourceCode)
            if (literal) {
                reportLiteral(literal)
            }
        },
    }
}

export { stripDefaultUnitSuffixes, rewriteTokenUnitValues, analyzeClassList }

export default {
    name: RULE_NAME,
    meta: {
        type: 'suggestion',
        docs: {
            description:
                'Prefer unitless numeric class values for the configured default unit (for example border:1_solid over border:1px_solid).',
        },
        fixable: 'code',
        schema: [
            {
                type: 'object',
                additionalProperties: false,
                properties: {
                    attributes: { type: 'array', items: { type: 'string' } },
                    callees: { type: 'array', items: { type: 'string' } },
                    variables: { type: 'array', items: { type: 'string' } },
                    tags: { type: 'array', items: { type: 'string' } },
                    additionalProps: { type: 'array', items: { type: 'string' } },
                    unit: { type: 'string' },
                },
            },
        ],
        messages: {
            preferUnitlessValues: 'Avoid hardcoded "{{unit}}" in Boss class values: {{values}}.',
        },
    },
    create,
}
