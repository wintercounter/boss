import { createBossMerge } from 'boss-css/merge'
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
import { splitClassList } from '../utils/boss-classes.js'
import { sortTokens } from '../utils/order.js'

const RULE_NAME = 'format-classnames'

const defaultOptions = {
    attributes: DEFAULT_ATTRIBUTE_PATTERNS,
    callees: DEFAULT_CALLEE_PATTERNS,
    variables: DEFAULT_VARIABLE_PATTERNS,
    tags: DEFAULT_TAG_PATTERNS,
    merge: {},
    order: 'improved',
    additionalProps: [],
}

const createPatterns = options => ({
    attributes: compilePatterns(options.attributes),
    callees: compilePatterns(options.callees),
    variables: compilePatterns(options.variables),
    tags: compilePatterns(options.tags),
})

const formatClassList = (merge, literal, options) => {
    if (!literal.value) return null
    const merged = merge(literal.value)
    const tokens = splitClassList(merged)
    const sorted = sortTokens(tokens, options)
    const next = sorted.join(' ')
    if (next === literal.value) return null
    return next
}

const create = context => {
    const sourceCode = context.getSourceCode()
    const options = { ...defaultOptions, ...(context.options[0] || {}) }
    const patterns = createPatterns(options)
    const merge = createBossMerge(options.merge || {})

    const reportLiteral = literal => {
        if (!literal || !literal.canFix) return

        const next = formatClassList(merge, literal, options)
        if (!next) return

        context.report({
            node: literal.node,
            messageId: 'format',
            data: {
                original: literal.value,
                formatted: next,
            },
            fix: fixer => fixer.replaceText(literal.node, buildLiteralReplacement(literal.node, sourceCode, next)),
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

export default {
    name: RULE_NAME,
    meta: {
        type: 'layout',
        docs: {
            description: 'Normalize Boss class lists using boss-css/merge.',
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
                    merge: { type: 'object', additionalProperties: true },
                    order: { type: 'string', enum: ['none', 'asc', 'desc', 'official', 'improved'] },
                    additionalProps: { type: 'array', items: { type: 'string' } },
                },
            },
        ],
        messages: {
            format: 'Boss class list is not normalized.',
        },
    },
    create,
}
