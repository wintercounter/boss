import type {
    ArrayExpression,
    CallExpression,
    Expression,
    KeyValueProperty,
    MemberExpression,
    ObjectExpression,
    ParenthesisExpression,
    TaggedTemplateExpression,
    TemplateLiteral,
    UnaryExpression,
} from '@swc/types'

type StaticValue = string | number | boolean | null | StaticValue[] | { [key: string]: StaticValue }

type StaticResult = {
    value: StaticValue
    dynamic: boolean
}

const isCssMemberExpression = (node: Expression): node is MemberExpression => {
    if (!node || node.type !== 'MemberExpression') return false
    if (node.object?.type !== 'Identifier' || node.object.value !== '$$') return false
    const property = node.property as Expression
    if (property.type === 'Identifier') return property.value === 'css'
    if (property.type === 'StringLiteral') return property.value === 'css'
    return false
}

export const isCustomCssCall = (node: Expression): node is CallExpression => {
    return node.type === 'CallExpression' && isCssMemberExpression(node.callee as Expression)
}

export const isCustomCssTag = (node: Expression): node is TaggedTemplateExpression => {
    return node.type === 'TaggedTemplateExpression' && isCssMemberExpression(node.tag as Expression)
}

const extractTemplateLiteral = (literal: TemplateLiteral) => {
    if (literal.expressions.length) return null
    const first = literal.quasis[0]
    if (!first) return ''
    const raw = first.cooked ?? first.raw ?? ''
    return raw
}

const parseStaticExpression = (expression: Expression): StaticResult => {
    if (!expression || typeof expression !== 'object') return { value: null, dynamic: true }

    switch (expression.type) {
        case 'StringLiteral':
            return { value: expression.value, dynamic: false }
        case 'NumericLiteral':
            return { value: expression.value, dynamic: false }
        case 'BooleanLiteral':
            return { value: expression.value, dynamic: false }
        case 'NullLiteral':
            return { value: null, dynamic: false }
        case 'TemplateLiteral': {
            const text = extractTemplateLiteral(expression)
            if (text === null) return { value: '', dynamic: true }
            return { value: text, dynamic: false }
        }
        case 'ArrayExpression':
            return parseStaticArray(expression)
        case 'ObjectExpression':
            return parseStaticObject(expression)
        case 'UnaryExpression':
            return parseStaticUnary(expression)
        case 'ParenthesisExpression':
            return parseStaticExpression((expression as ParenthesisExpression).expression)
        case 'MemberExpression':
            return parseStaticMemberExpression(expression)
        default:
            return { value: null, dynamic: true }
    }
}

const parseStaticArray = (expression: ArrayExpression): StaticResult => {
    const values: StaticValue[] = []
    let dynamic = false
    for (const entry of expression.elements) {
        if (!entry || entry.expression == null) {
            dynamic = true
            continue
        }
        const parsed = parseStaticExpression(entry.expression as Expression)
        dynamic ||= parsed.dynamic
        values.push(parsed.value)
    }
    return { value: values, dynamic }
}

const parseStaticUnary = (expression: UnaryExpression): StaticResult => {
    if (expression.operator !== '-') return { value: null, dynamic: true }
    const parsed = parseStaticExpression(expression.argument as Expression)
    if (parsed.dynamic || typeof parsed.value !== 'number') return { value: null, dynamic: true }
    return { value: -parsed.value, dynamic: false }
}

const parseStaticObject = (expression: ObjectExpression): StaticResult => {
    const value: Record<string, StaticValue> = {}
    let dynamic = false

    for (const prop of expression.properties) {
        if (prop.type !== 'KeyValueProperty') {
            dynamic = true
            continue
        }
        const { key, value: propValue } = prop as KeyValueProperty
        if (!key) {
            dynamic = true
            continue
        }
        let keyName = ''
        switch (key.type) {
            case 'Identifier':
                keyName = key.value
                break
            case 'StringLiteral':
                keyName = key.value
                break
            case 'NumericLiteral':
                keyName = String(key.value)
                break
            case 'BigIntLiteral':
                keyName = String(key.value)
                break
            default:
                dynamic = true
                continue
        }
        const parsed = parseStaticExpression(propValue as Expression)
        dynamic ||= parsed.dynamic
        value[keyName] = parsed.value
    }

    return { value, dynamic }
}

const getStaticTokenPath = (expression: Expression): string | null => {
    const parts: string[] = []
    let current: Expression | null = expression

    while (current && current.type === 'MemberExpression') {
        const member = current as MemberExpression
        const property = member.property as Expression
        let propName: string | null = null
        if (property.type === 'Identifier') propName = property.value
        if (property.type === 'StringLiteral') propName = property.value
        if (property.type === 'NumericLiteral') propName = String(property.value)
        if (!propName) return null
        parts.unshift(propName)
        current = member.object as Expression
    }

    if (!current || current.type !== 'Identifier' || current.value !== '$$') return null
    parts.unshift('$$')

    if (parts.length < 3) return null
    if (parts[0] !== '$$' || parts[1] !== 'token') return null

    return parts.slice(2).join('.')
}

const parseStaticMemberExpression = (expression: MemberExpression): StaticResult => {
    const tokenPath = getStaticTokenPath(expression as unknown as Expression)
    if (tokenPath) {
        return { value: `$$.token.${tokenPath}`, dynamic: false }
    }
    return { value: null, dynamic: true }
}

const normalizePropertyName = (api: any, name: string) => {
    if (name.startsWith('--')) return name
    return api.camelCaseToDash ? api.camelCaseToDash(name) : name
}

const resolveNestedSelector = (parent: string | null, child: string) => {
    if (!parent) return child
    if (child.includes('&')) {
        return child.split('&').join(parent)
    }
    return `${parent} ${child}`
}

const resolveDeclarations = async (
    api: any,
    declarations: Record<string, StaticValue>,
    filePath?: string,
): Promise<Record<string, unknown>> => {
    const tree = api.objectToPropTree(declarations)
    await api.trigger('onPropTree', {
        input: api.propTreeToObject(tree),
        tree,
        preferVariables: false,
        parser: 'custom-css',
        ...(filePath ? { file: { path: filePath } } : {}),
    })
    return api.propTreeToObject(tree)
}

const serializeCssObject = async (
    api: any,
    value: StaticValue,
    selector: string | null = null,
    filePath?: string,
): Promise<string> => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return ''
    const entries = Object.entries(value as Record<string, StaticValue>)
    if (!entries.length) return ''

    const declarations: Record<string, StaticValue> = {}
    let nested = ''

    for (const [key, entry] of entries) {
        if (entry == null) continue
        if (typeof entry === 'object' && !Array.isArray(entry)) {
            if (key.startsWith('@')) {
                const inner = await serializeCssObject(api, entry, selector, filePath)
                if (inner.trim()) {
                    nested += `${key} { ${inner} }`
                }
            } else {
                const nextSelector = resolveNestedSelector(selector, key)
                const inner = await serializeCssObject(api, entry, nextSelector, filePath)
                if (inner.trim()) {
                    nested += inner
                }
            }
            continue
        }
        declarations[key] = entry
    }

    let output = ''
    if (Object.keys(declarations).length) {
        const processed = await resolveDeclarations(api, declarations, filePath)
        const declarationEntries = Object.entries(processed).reduce<string[]>((acc, [key, entry]) => {
            if (entry == null) return acc
            const propertyName = normalizePropertyName(api, key)
            const propertyValue = api.dictionary?.toValue ? api.dictionary.toValue(entry, propertyName) : entry
            if (propertyValue == null) return acc
            acc.push(`${propertyName}: ${propertyValue}`)
            return acc
        }, [])
        if (!declarationEntries.length) {
            if (nested.trim()) return nested
            return ''
        }
        const targetSelector = selector || ':root'
        output += `${targetSelector} { ${declarationEntries.join('; ')} }`
    }
    if (nested.trim()) {
        output += output ? `\n${nested}` : nested
    }
    return output
}

export const extractCustomCssText = async (expression: Expression, api: any, filePath?: string) => {
    if (isCustomCssTag(expression)) {
        const raw = extractTemplateLiteral(expression.template)
        if (raw === null) {
            console.warn('[boss-css] $$.css template literals must be static (no expressions).')
            return null
        }
        return raw
    }

    if (!isCustomCssCall(expression)) return null

    if (expression.arguments.length !== 1) {
        console.warn('[boss-css] $$.css expects a single argument.')
        return null
    }

    const arg = expression.arguments[0]?.expression as Expression | undefined
    if (!arg) return null

    if (arg.type === 'StringLiteral') return arg.value
    if (arg.type === 'TemplateLiteral') {
        const raw = extractTemplateLiteral(arg)
        if (raw === null) {
            console.warn('[boss-css] $$.css template literals must be static (no expressions).')
            return null
        }
        return raw
    }
    if (arg.type === 'ObjectExpression') {
        const parsed = parseStaticObject(arg)
        if (parsed.dynamic) {
            console.warn('[boss-css] $$.css object arguments must be static.')
            return null
        }
        return await serializeCssObject(api, parsed.value, null, filePath)
    }

    console.warn('[boss-css] $$.css only accepts string, template literal, or object arguments.')
    return null
}
