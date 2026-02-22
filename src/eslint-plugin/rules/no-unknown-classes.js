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
import { findInvalidTokens } from '../utils/boss-classes.js'

const RULE_NAME = 'no-unknown-classes'

const defaultOptions = {
    attributes: DEFAULT_ATTRIBUTE_PATTERNS,
    callees: DEFAULT_CALLEE_PATTERNS,
    variables: DEFAULT_VARIABLE_PATTERNS,
    tags: DEFAULT_TAG_PATTERNS,
    allowCustomContexts: false,
    additionalContexts: [],
    additionalProps: [],
    singleProps: [],
}

const createPatterns = options => ({
    attributes: compilePatterns(options.attributes),
    callees: compilePatterns(options.callees),
    variables: compilePatterns(options.variables),
    tags: compilePatterns(options.tags),
})

const create = context => {
    const sourceCode = context.getSourceCode()
    const options = { ...defaultOptions, ...(context.options[0] || {}) }
    const patterns = createPatterns(options)

    const reportInvalid = literal => {
        if (!literal || !literal.value) return

        const invalid = findInvalidTokens(literal.value, options)
        if (!invalid.length) return

        const preview = invalid.slice(0, 3).join(', ')
        const remainder = invalid.length > 3 ? ` (+${invalid.length - 3} more)` : ''

        context.report({
            node: literal.node,
            messageId: 'invalid',
            data: {
                classes: preview + remainder,
            },
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
                reportInvalid(literal)
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
                reportInvalid(literal)
            }
        },
        VariableDeclarator(node) {
            if (!node.id || node.id.type !== 'Identifier') return
            if (!matchesPattern(patterns.variables, node.id.name)) return

            const literals = []
            collectClassLiteralsFromExpression(node.init, sourceCode, literals)

            for (const literal of literals) {
                reportInvalid(literal)
            }
        },
        TaggedTemplateExpression(node) {
            const tagName = getCalleeName(node.tag)
            if (!tagName || !matchesPattern(patterns.tags, tagName)) return

            const literal = getLiteralInfo(node.quasi, sourceCode)
            if (literal) {
                reportInvalid(literal)
            }
        },
    }
}

export default {
    name: RULE_NAME,
    meta: {
        type: 'problem',
        docs: {
            description: 'Disallow unknown or non-Boss class names.',
        },
        schema: [
            {
                type: 'object',
                additionalProperties: false,
                properties: {
                    attributes: { type: 'array', items: { type: 'string' } },
                    callees: { type: 'array', items: { type: 'string' } },
                    variables: { type: 'array', items: { type: 'string' } },
                    tags: { type: 'array', items: { type: 'string' } },
                    allowCustomContexts: { type: 'boolean' },
                    additionalContexts: { type: 'array', items: { type: 'string' } },
                    additionalProps: { type: 'array', items: { type: 'string' } },
                    singleProps: { type: 'array', items: { type: 'string' } },
                },
            },
        ],
        messages: {
            invalid: 'Invalid Boss class names: {{classes}}.',
        },
    },
    create,
}
