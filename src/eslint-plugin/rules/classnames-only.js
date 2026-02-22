import { getContextSet, isCssPropName } from '../utils/boss-classes.js'
import { getJSXRootName, getJSXAttributeName } from '../utils/ast.js'
import { DEFAULT_COMPONENTS } from '../utils/defaults.js'

const RULE_NAME = 'classnames-only'

const defaultOptions = {
    components: DEFAULT_COMPONENTS,
    additionalContexts: [],
    additionalProps: [],
}

const isStyleProp = (name, options) => {
    if (!name || name === 'className' || name === 'class') return false

    const contextSet = getContextSet(options)
    if (contextSet.has(name)) return true

    const extraProps = options.additionalProps?.length ? new Set(options.additionalProps) : null

    return isCssPropName(name, extraProps)
}

const create = context => {
    const options = { ...defaultOptions, ...(context.options[0] || {}) }
    const componentSet = new Set(options.components)

    return {
        JSXOpeningElement(node) {
            const rootName = getJSXRootName(node.name)
            if (!rootName || !componentSet.has(rootName)) return

            for (const attribute of node.attributes) {
                if (!attribute || attribute.type !== 'JSXAttribute') continue

                const name = getJSXAttributeName(attribute)
                if (!name) continue
                if (!isStyleProp(name, options)) continue

                context.report({
                    node: attribute,
                    messageId: 'classnamesOnly',
                    data: { prop: name },
                })
            }
        },
    }
}

export default {
    name: RULE_NAME,
    meta: {
        type: 'problem',
        docs: {
            description: 'Disallow Boss style props; require className instead.',
        },
        schema: [
            {
                type: 'object',
                additionalProperties: false,
                properties: {
                    components: { type: 'array', items: { type: 'string' } },
                    additionalContexts: { type: 'array', items: { type: 'string' } },
                    additionalProps: { type: 'array', items: { type: 'string' } },
                },
            },
        ],
        messages: {
            classnamesOnly: 'Use className instead of the "{{prop}}" Boss prop.',
        },
    },
    create,
}
