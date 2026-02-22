import { getContextSet, isCssPropName } from '../utils/boss-classes.js'
import { getJSXRootName, getJSXAttributeName, getLiteralInfo } from '../utils/ast.js'
import { DEFAULT_COMPONENTS } from '../utils/defaults.js'
import { getApi } from '../utils/api.js'

const RULE_NAME = 'prefer-token-values'

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

const getPropertyName = node => {
    if (!node) return null
    if (node.type === 'Identifier') return node.name
    if (node.type === 'Literal' && typeof node.value === 'string') return node.value
    if (node.type === 'StringLiteral') return node.value
    return null
}

const getMemberPath = node => {
    const resolved = unwrapExpression(node)
    if (!resolved) return null

    if (resolved.type === 'CallExpression') {
        return getMemberPath(resolved.callee)
    }

    if (resolved.type !== 'MemberExpression' && resolved.type !== 'OptionalMemberExpression') {
        return null
    }

    const parts = []
    let current = resolved

    while (current) {
        if (current.type === 'MemberExpression' || current.type === 'OptionalMemberExpression') {
            const propName = getPropertyName(current.property)
            if (!propName) return null
            parts.unshift(propName)
            current = unwrapExpression(current.object)
            continue
        }

        if (current.type === 'Identifier') {
            parts.unshift(current.name)
            break
        }

        return null
    }

    return parts
}

const getTokenPathFromNode = (node, sourceCode) => {
    const resolved = unwrapExpression(node)
    if (!resolved) return null

    const literalInfo = getLiteralInfo(resolved, sourceCode)
    if (literalInfo?.value && typeof literalInfo.value === 'string') {
        if (literalInfo.value.startsWith('$$.token.')) {
            return literalInfo.value.slice('$$.token.'.length)
        }
        return null
    }

    const parts = getMemberPath(resolved)
    if (!parts || parts.length < 3) return null
    if (parts[0] !== '$$' || parts[1] !== 'token') return null
    return parts.slice(2).join('.')
}

const isContainerContextKey = name =>
    name === 'container' || name.startsWith('container ') || name.startsWith('container_')

const isContextKey = (name, contextSet) => {
    if (!name) return false
    if (name.startsWith('[') && name.endsWith(']')) return true
    if (isContainerContextKey(name)) return true
    return contextSet.has(name)
}

const dashToCamelCase = str => str.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())

const getPropAliases = (api, name) => {
    if (!name) return []
    const aliases = new Set([name])

    const dictionary = api?.dictionary
    if (dictionary) {
        const entry =
            (typeof dictionary.resolve === 'function' &&
                (dictionary.resolve(name).descriptor || dictionary.resolve(dashToCamelCase(name)).descriptor)) ||
            dictionary.get(name) ||
            dictionary.get(dashToCamelCase(name))
        if (entry?.property) aliases.add(entry.property)
        if (Array.isArray(entry?.aliases)) {
            entry.aliases.forEach(alias => aliases.add(alias))
        }
    }

    return Array.from(aliases)
}

const resolveTokenValue = (groupValues, tokenPath) => {
    let current = groupValues
    for (const key of tokenPath) {
        if (!current || typeof current !== 'object') return undefined
        const next = current[key]
        current = next && typeof next === 'object' && 'value' in next ? next.value : next
    }
    return current
}

const create = context => {
    const sourceCode = context.getSourceCode()
    const options = { ...defaultOptions, ...(context.options[0] || {}) }
    const componentSet = new Set(options.components)
    const contextSet = getContextSet(options)
    const extraProps = options.additionalProps?.length ? new Set(options.additionalProps) : null
    const { api } = getApi()
    const tokenGroups = api?.tokens && typeof api.tokens === 'object' ? api.tokens : null

    if (!api || !tokenGroups) {
        return {}
    }

    const reportTokenUsage = (node, propName, tokenKey) => {
        context.report({
            node,
            messageId: 'preferTokenValues',
            data: { prop: propName, token: tokenKey },
        })
    }

    const checkValue = (valueNode, propName) => {
        if (!valueNode) return
        const tokenPath = getTokenPathFromNode(valueNode, sourceCode)
        if (!tokenPath) return

        const [groupName, ...rest] = tokenPath.split('.')
        if (!groupName || rest.length === 0) return

        const aliases = getPropAliases(api, propName)
        if (!aliases.includes(groupName)) return

        const groupValues = tokenGroups[groupName]
        if (!groupValues) return

        const tokenValue = resolveTokenValue(groupValues, rest)
        if (tokenValue === undefined) return

        reportTokenUsage(valueNode, propName, rest.join('.'))
    }

    const checkObjectExpression = objectExpression => {
        for (const property of objectExpression.properties || []) {
            if (!property || property.type !== 'Property') continue
            if (property.kind && property.kind !== 'init') continue
            if (property.computed) continue

            const key = getPropertyName(property.key)
            if (!key) continue

            const value = property.value
            const resolved = unwrapExpression(value)

            if (isCssPropName(key, extraProps)) {
                checkValue(value, key)
                continue
            }

            if (resolved?.type === 'ObjectExpression' && isContextKey(key, contextSet)) {
                checkObjectExpression(resolved)
                continue
            }

            if (resolved?.type === 'ObjectExpression') {
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
        type: 'suggestion',
        docs: {
            description: 'Prefer token keys instead of $$.token proxies when the prop has tokens.',
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
            preferTokenValues: 'Use {{prop}}="{{token}}" instead of $$.token for this prop.',
        },
    },
    create,
}
