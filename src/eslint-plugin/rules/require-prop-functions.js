import { getContextSet, isCssPropName } from '../utils/boss-classes.js'
import { getJSXRootName, getJSXAttributeName } from '../utils/ast.js'
import { isStaticValue } from '../utils/static.js'
import { DEFAULT_COMPONENTS } from '../utils/defaults.js'
import { getApi } from '../utils/api.js'

const RULE_NAME = 'require-prop-functions'

const defaultOptions = {
    components: DEFAULT_COMPONENTS,
    additionalContexts: [],
    additionalProps: [],
}

const unwrapExpression = node => {
    if (!node) return node

    switch (node.type) {
        case 'JSXExpressionContainer':
            return unwrapExpression(node.expression)
        case 'ChainExpression':
            return unwrapExpression(node.expression)
        case 'ParenthesizedExpression':
            return unwrapExpression(node.expression)
        case 'TSAsExpression':
        case 'TSTypeAssertion':
        case 'TSNonNullExpression':
            return unwrapExpression(node.expression)
        default:
            return node
    }
}

const isFunctionValue = node => {
    const resolved = unwrapExpression(node)
    return resolved?.type === 'ArrowFunctionExpression' || resolved?.type === 'FunctionExpression'
}

const getPropertyKey = property => {
    const key = property.key
    if (!key) return null
    if (key.type === 'Identifier') return key.name
    if (key.type === 'Literal') return `${key.value}`
    return null
}

const isContainerContextKey = name =>
    name === 'container' || name.startsWith('container ') || name.startsWith('container_')

const isContextKey = (name, contextSet) => {
    if (!name) return false
    if (name.startsWith('[') && name.endsWith(']')) return true
    if (isContainerContextKey(name)) return true
    return contextSet.has(name)
}

const create = context => {
    const options = { ...defaultOptions, ...(context.options[0] || {}) }
    const componentSet = new Set(options.components)
    const contextSet = getContextSet(options)
    const extraProps = options.additionalProps?.length ? new Set(options.additionalProps) : null
    const { api } = getApi()
    const hasClassnameFirst = Boolean(api?.plugins?.some?.(plugin => plugin?.name === 'classname-first'))

    if (!hasClassnameFirst) {
        return {}
    }

    const reportDynamicValue = (node, propName) => {
        context.report({
            node,
            messageId: 'requirePropFunctions',
            data: { prop: propName },
        })
    }

    const checkValue = (valueNode, propName) => {
        if (!valueNode) return
        if (isStaticValue(valueNode)) return
        if (isFunctionValue(valueNode)) return
        reportDynamicValue(valueNode, propName)
    }

    const checkObjectExpression = objectExpression => {
        for (const property of objectExpression.properties || []) {
            if (!property || property.type !== 'Property') continue
            if (property.kind && property.kind !== 'init') continue

            const propName = getPropertyKey(property)
            if (!propName) continue

            const value = property.value
            if (isCssPropName(propName, extraProps)) {
                checkValue(value, propName)
                continue
            }

            const resolved = unwrapExpression(value)
            if (resolved?.type === 'ObjectExpression' && isContextKey(propName, contextSet)) {
                checkObjectExpression(resolved)
            } else if (resolved?.type === 'ObjectExpression') {
                checkObjectExpression(resolved)
            }
        }
    }

    return {
        JSXOpeningElement(node) {
            const rootName = getJSXRootName(node.name)
            if (!rootName || !componentSet.has(rootName)) return

            for (const attribute of node.attributes) {
                if (!attribute || attribute.type !== 'JSXAttribute') continue

                const name = getJSXAttributeName(attribute)
                if (!name) continue
                if (name === 'className' || name === 'class') continue

                if (isCssPropName(name, extraProps)) {
                    checkValue(attribute.value, name)
                    continue
                }

                if (!isContextKey(name, contextSet)) continue

                const value = unwrapExpression(attribute.value)
                if (value?.type === 'ObjectExpression') {
                    checkObjectExpression(value)
                }
            }
        },
    }
}

export default {
    name: RULE_NAME,
    meta: {
        type: 'problem',
        docs: {
            description: 'Require dynamic Boss props to use functions when classname-first is enabled.',
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
            requirePropFunctions: 'Use {{prop}}={() => value} for dynamic Boss props with classname-first.',
        },
    },
    create,
}
