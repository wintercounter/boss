import { compilePatterns, matchesPattern, getCalleeName, getJSXRootName, getJSXAttributeName } from '../utils/ast.js'
import { DEFAULT_COMPONENTS } from '../utils/defaults.js'

const RULE_NAME = 'redundant-cx'

const defaultOptions = {
    components: DEFAULT_COMPONENTS,
    callees: ['^cx$', '^\\$\\$\\.cx$'],
}

const getCallExpression = node => {
    if (!node) return null
    if (node.type === 'ChainExpression') return getCallExpression(node.expression)
    if (node.type === 'CallExpression') return node
    if (node.type === 'OptionalCallExpression') return node
    return null
}

const create = context => {
    const options = { ...defaultOptions, ...(context.options[0] || {}) }
    const componentSet = new Set(options.components)
    const calleePatterns = compilePatterns(options.callees)

    return {
        JSXOpeningElement(node) {
            const rootName = getJSXRootName(node.name)
            if (!rootName || !componentSet.has(rootName)) return

            for (const attribute of node.attributes) {
                if (!attribute || attribute.type !== 'JSXAttribute') continue

                const name = getJSXAttributeName(attribute)
                if (name !== 'className') continue

                const expression =
                    attribute.value?.type === 'JSXExpressionContainer' ? attribute.value.expression : null
                const callExpression = getCallExpression(expression)
                if (!callExpression) continue

                const calleeName = getCalleeName(callExpression.callee)
                if (!calleeName || !matchesPattern(calleePatterns, calleeName)) continue

                context.report({
                    node: attribute,
                    messageId: 'redundantCx',
                })
            }
        },
    }
}

export default {
    name: RULE_NAME,
    meta: {
        type: 'suggestion',
        docs: {
            description: 'Disallow wrapping $$ className with cx; $$ already applies cx semantics.',
        },
        schema: [
            {
                type: 'object',
                additionalProperties: false,
                properties: {
                    components: { type: 'array', items: { type: 'string' } },
                    callees: { type: 'array', items: { type: 'string' } },
                },
            },
        ],
        messages: {
            redundantCx: 'Do not wrap $$ className with cx; pass values directly to className.',
        },
    },
    create,
}
