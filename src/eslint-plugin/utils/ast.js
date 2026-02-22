const isStringLiteral = node =>
    (node && node.type === 'Literal' && typeof node.value === 'string') ||
    (node && node.type === 'StringLiteral' && typeof node.value === 'string')

const isTemplateLiteral = node => node && node.type === 'TemplateLiteral'

const getLiteralInfo = (node, sourceCode) => {
    if (isStringLiteral(node)) {
        return {
            value: node.value,
            node,
            raw: sourceCode.getText(node),
            canFix: true,
        }
    }

    if (isTemplateLiteral(node) && node.expressions.length === 0) {
        const quasi = node.quasis[0]
        const value = quasi?.value?.cooked ?? quasi?.value?.raw ?? ''
        return {
            value,
            node,
            raw: sourceCode.getText(node),
            canFix: true,
        }
    }

    return null
}

const getPropertyKeyInfo = (property, sourceCode) => {
    if (!property || property.type !== 'Property') return null
    if (property.computed) return null

    const key = property.key

    if (isStringLiteral(key)) {
        return {
            value: key.value,
            node: key,
            raw: sourceCode.getText(key),
            canFix: false,
        }
    }

    if (key && key.type === 'Identifier') {
        return {
            value: key.name,
            node: key,
            raw: sourceCode.getText(key),
            canFix: false,
        }
    }

    return null
}

const collectClassLiteralsFromExpression = (expression, sourceCode, results) => {
    if (!expression) return

    if (expression.type === 'JSXExpressionContainer') {
        collectClassLiteralsFromExpression(expression.expression, sourceCode, results)
        return
    }

    const literal = getLiteralInfo(expression, sourceCode)
    if (literal) {
        results.push(literal)
        return
    }

    if (expression.type === 'ArrayExpression') {
        for (const element of expression.elements) {
            if (element) {
                collectClassLiteralsFromExpression(element, sourceCode, results)
            }
        }
        return
    }

    if (expression.type === 'LogicalExpression') {
        collectClassLiteralsFromExpression(expression.left, sourceCode, results)
        collectClassLiteralsFromExpression(expression.right, sourceCode, results)
        return
    }

    if (expression.type === 'ConditionalExpression') {
        collectClassLiteralsFromExpression(expression.consequent, sourceCode, results)
        collectClassLiteralsFromExpression(expression.alternate, sourceCode, results)
        return
    }

    if (expression.type === 'BinaryExpression' && expression.operator === '+') {
        collectClassLiteralsFromExpression(expression.left, sourceCode, results)
        collectClassLiteralsFromExpression(expression.right, sourceCode, results)
        return
    }

    if (expression.type === 'SequenceExpression') {
        for (const item of expression.expressions) {
            collectClassLiteralsFromExpression(item, sourceCode, results)
        }
        return
    }

    if (expression.type === 'ObjectExpression') {
        for (const property of expression.properties) {
            if (property && property.type === 'Property') {
                const keyInfo = getPropertyKeyInfo(property, sourceCode)
                if (keyInfo) {
                    results.push(keyInfo)
                }
            }
        }
    }
}

const compilePatterns = patterns => {
    if (!Array.isArray(patterns)) return []
    return patterns.map(pattern => new RegExp(pattern))
}

const matchesPattern = (compiled, name) => compiled.some(pattern => pattern.test(name))

const getCalleeName = node => {
    if (!node) return null

    if (node.type === 'ChainExpression') {
        return getCalleeName(node.expression)
    }

    if (node.type === 'Identifier') {
        return node.name
    }

    if (node.type === 'MemberExpression' && !node.computed) {
        const objectName = getCalleeName(node.object)
        const propertyName = getCalleeName(node.property)
        if (!objectName || !propertyName) return null
        return `${objectName}.${propertyName}`
    }

    return null
}

const getJSXRootName = node => {
    if (!node) return null

    if (node.type === 'JSXIdentifier') {
        return node.name
    }

    if (node.type === 'JSXMemberExpression') {
        return getJSXRootName(node.object)
    }

    return null
}

const getJSXAttributeName = node => {
    if (!node || node.type !== 'JSXAttribute') return null
    if (!node.name) return null

    if (node.name.type === 'JSXIdentifier') {
        return node.name.name
    }

    return null
}

export {
    collectClassLiteralsFromExpression,
    compilePatterns,
    matchesPattern,
    getCalleeName,
    getJSXRootName,
    getJSXAttributeName,
    getLiteralInfo,
    isStringLiteral,
    isTemplateLiteral,
}
