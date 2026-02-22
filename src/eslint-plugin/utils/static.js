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

const isStaticValue = node => {
    const resolved = unwrapExpression(node)

    if (!resolved) return true

    if (resolved.type === 'Literal' && typeof resolved.value !== 'undefined') return true
    if (resolved.type === 'StringLiteral') return true

    if (resolved.type === 'TemplateLiteral') {
        return resolved.expressions.length === 0
    }

    if (resolved.type === 'ArrayExpression') {
        return resolved.elements.every(element => isStaticValue(element))
    }

    if (resolved.type === 'ObjectExpression') {
        for (const property of resolved.properties) {
            if (!property) return false
            if (property.type === 'SpreadElement') return false
            if (property.type !== 'Property') return false
            if (!isStaticValue(property.value)) return false
        }
        return true
    }

    if (resolved.type === 'UnaryExpression') {
        return isStaticValue(resolved.argument)
    }

    return false
}

export { isStaticValue }
