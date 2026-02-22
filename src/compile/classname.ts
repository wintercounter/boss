import { parseSync, printSync } from '@swc/core'
import type {
    CallExpression,
    Expression,
    JSXAttribute,
    JSXElement,
    JSXExpressionContainer,
    Program,
} from '@swc/types'

const tokenPrefix = '$$.token.'

type RewriteOptions = {
    filename: string
    classNameProp?: string
    mapToken?: (token: string) => string | undefined
}

type TextRewriteOptions = {
    mapToken?: (token: string) => string | undefined
}

export const rewriteClassNameTokens = (input: string) => {
    if (!input.includes(tokenPrefix) && !input.includes('{')) return input

    const selectors = splitSelectors(input)
    const rewritten = selectors.flatMap(selector => rewriteSelector(selector, { expandSingleGroup: false }))

    return rewritten.join(' ')
}

export const rewriteClassNameTokensInText = (source: string, options: TextRewriteOptions = {}) => {
    return rewriteQuotedSegments(source, ({ value, hasTemplateExpression }) => {
        if (hasTemplateExpression) return null
        return rewriteClassNameTokensWithMap(value, options.mapToken)
    })
}

export const rewriteClassNameTokensInSource = (source: string, options: RewriteOptions) => {
    const ext = options.filename.split('.').pop() ?? ''
    const isTs = ext === 'ts' || ext === 'tsx'
    const isJsx = ['jsx', 'tsx', 'js', 'mjs', 'cjs'].includes(ext)
    const classNameProp = options.classNameProp ?? 'className'
    const mapToken = options.mapToken

    const parsed = parseSync(source, {
        syntax: isTs ? 'typescript' : 'ecmascript',
        tsx: isTs && isJsx,
        jsx: !isTs && isJsx,
    }) as Program

    const visit = (node: unknown, context: { inModuleSpecifier?: boolean } = {}) => {
        if (!node || typeof node !== 'object') return
        if (Array.isArray(node)) {
            node.forEach(child => visit(child, context))
            return
        }

        const current = node as Record<string, unknown>

        if (current.type === 'JSXElement') {
            rewriteClassNameTokensInElement(current as unknown as JSXElement, classNameProp, mapToken)
        }

        if (current.type === 'CallExpression') {
            rewriteClassNameTokensInCall(current as unknown as CallExpression, mapToken)
        }

        if (!context.inModuleSpecifier) {
            if (current.type === 'StringLiteral') {
                const literal = current as { value: string; raw?: string }
                updateStringLiteral(literal, rewriteClassNameTokensWithMap(literal.value, mapToken))
            }
            if (
                current.type === 'TemplateLiteral' &&
                Array.isArray((current as { expressions?: unknown[] }).expressions) &&
                (current as { expressions: unknown[] }).expressions.length === 0 &&
                Array.isArray((current as { quasis?: unknown[] }).quasis) &&
                (current as { quasis: unknown[] }).quasis.length
            ) {
                const template = current as { quasis: Array<{ cooked?: string; raw?: string }> }
                const firstQuasi = template.quasis[0]
                if (firstQuasi) {
                    const cooked = firstQuasi.cooked ?? ''
                    const rewritten = rewriteClassNameTokensWithMap(cooked, mapToken)
                    firstQuasi.cooked = rewritten
                    firstQuasi.raw = rewritten
                }
            }
        }

        for (const key of Object.keys(current)) {
            const nextContext =
                (current.type === 'ImportDeclaration' ||
                    current.type === 'ExportAllDeclaration' ||
                    current.type === 'ExportNamedDeclaration') &&
                key === 'source'
                    ? { ...context, inModuleSpecifier: true }
                    : context
            visit(current[key], nextContext)
        }
    }

    visit(parsed)

    return printSync(parsed).code
}

const rewriteClassNameTokensInCall = (expr: CallExpression, mapToken?: (token: string) => string | undefined) => {
    const callee = expr.callee
    if (callee.type !== 'Identifier' || callee.value !== '$$') return
    if (expr.arguments.length !== 1) return
    const arg = expr.arguments[0].expression
    rewriteStringExpression(arg, mapToken)
}

const rewriteStringExpression = (
    expression: JSXExpressionContainer['expression'] | Expression,
    mapToken?: (token: string) => string | undefined,
) => {
    if (!expression) return
    if (expression.type === 'StringLiteral') {
        updateStringLiteral(expression, rewriteClassNameTokensWithMap(expression.value, mapToken))
        return
    }
    if (expression.type === 'TemplateLiteral' && expression.expressions.length === 0 && expression.quasis.length) {
        const firstQuasi = expression.quasis[0]
        if (!firstQuasi) return
        const cooked = firstQuasi.cooked ?? ''
        const rewritten = rewriteClassNameTokensWithMap(cooked, mapToken)
        firstQuasi.cooked = rewritten
        firstQuasi.raw = rewritten
    }
}

export const rewriteClassNameTokensInElement = (
    element: JSXElement,
    classNameProp = 'className',
    mapToken?: (token: string) => string | undefined,
) => {
    const attributes = element.opening.attributes
    for (const attr of attributes) {
        if (attr.type !== 'JSXAttribute') continue
        if (!isClassAttribute(attr, classNameProp)) continue
        if (!attr.value) continue

        if (attr.value.type === 'StringLiteral') {
            updateStringLiteral(attr.value, rewriteClassNameTokensWithMap(attr.value.value, mapToken))
            continue
        }

        if (attr.value.type === 'JSXExpressionContainer') {
            const expression = attr.value.expression
            rewriteStringExpression(expression, mapToken)
        }
    }
}

const isClassAttribute = (attr: JSXAttribute, classNameProp: string) => {
    return attr.name.type === 'Identifier' && attr.name.value === classNameProp
}

const rewriteSelector = (selector: string, options: { expandSingleGroup: boolean }): string[] => {
    const grouped = parseGroupedSelector(selector)
    if (grouped) {
        const nextEntries = grouped.entries.map(entry => ({
            name: entry.name,
            rawValue: rewriteTokenValue(entry.rawValue),
        }))
        if (nextEntries.length > 1 || options.expandSingleGroup) {
            const sortedEntries = [...nextEntries].sort((a, b) => a.name.localeCompare(b.name))
            return sortedEntries.map(entry => `${grouped.prefix}:${entry.name}:${entry.rawValue}`)
        }
        const [entry] = nextEntries
        return [`${grouped.prefix}:{${entry.name}:${entry.rawValue}}`]
    }

    const fragments = splitFragments(selector)
    if (fragments.length < 2) return [selector]

    const rawValue = fragments.at(-1) ?? ''
    const nextValue = rewriteTokenValue(rawValue)
    if (nextValue === rawValue) return [selector]

    return [`${fragments.slice(0, -1).join(':')}:${nextValue}`]
}

export const rewriteClassNameTokensWithMap = (input: string, mapToken?: (token: string) => string | undefined) => {
    if (!mapToken) {
        return rewriteClassNameTokens(input)
    }
    const selectors = splitSelectors(input).flatMap(selector =>
        rewriteSelector(selector, { expandSingleGroup: true }),
    )
    const normalized = selectors.join(' ')
    let didChange = normalized !== input

    const mapped = selectors.map(selector => {
        if (!mapToken) return selector
        const next = mapToken(selector)
        if (next && next !== selector) {
            didChange = true
            return next
        }
        return selector
    })

    if (!didChange) return input
    return mapped.join(' ')
}

const rewriteTokenValue = (rawValue: string) => {
    if (!rawValue.startsWith(tokenPrefix)) return rawValue
    const tokenPath = rawValue.slice(tokenPrefix.length)
    const fragments = tokenPath.split('.').filter(Boolean)
    if (fragments.length < 2) return rawValue
    return fragments.slice(1).join('.')
}

const updateStringLiteral = (
    literal: { value: string; raw?: string | undefined },
    nextValue: string,
) => {
    literal.value = nextValue
    literal.raw = JSON.stringify(nextValue)
}

const splitSelectors = (input: string) => splitOutside(input, ' ')

const splitFragments = (selector: string) => splitOutside(selector, ':')

const splitGroupedEntries = (body: string) => splitOutside(body, ';')

const splitGroupedEntry = (entry: string) => splitOnceOutside(entry, ':')

const parseGroupedSelector = (selector: string) => {
    if (!selector.endsWith('}')) return null

    const groupStart = findGroupStart(selector)
    if (groupStart === -1) return null

    const prefix = selector.slice(0, groupStart)
    const body = selector.slice(groupStart + 2, -1)

    const entries = splitGroupedEntries(body)
        .map(entry => entry.trim())
        .filter((entry): entry is string => Boolean(entry))
        .map(entry => {
            const parts = splitGroupedEntry(entry)
            if (!parts) return null
            const [name, rawValue] = parts
            return {
                name: name.trim(),
                rawValue: rawValue.trim(),
            }
        })
        .filter((entry): entry is { name: string; rawValue: string } => Boolean(entry))

    if (!entries.length) return null

    return { prefix, entries }
}

const splitOutside = (input: string, delimiter: string) => {
    const results = []
    let current = ''
    let braceDepth = 0
    let bracketDepth = 0

    for (const char of input) {
        if (char === '{') braceDepth += 1
        if (char === '}') braceDepth = Math.max(0, braceDepth - 1)
        if (char === '[') bracketDepth += 1
        if (char === ']') bracketDepth = Math.max(0, bracketDepth - 1)

        if (char === delimiter && braceDepth === 0 && bracketDepth === 0) {
            if (current) results.push(current)
            current = ''
            continue
        }

        current += char
    }

    if (current) results.push(current)

    return results
}

const splitOnceOutside = (input: string, delimiter: string) => {
    let braceDepth = 0
    let bracketDepth = 0

    for (let i = 0; i < input.length; i += 1) {
        const char = input[i]
        if (char === '{') braceDepth += 1
        if (char === '}') braceDepth = Math.max(0, braceDepth - 1)
        if (char === '[') bracketDepth += 1
        if (char === ']') bracketDepth = Math.max(0, bracketDepth - 1)

        if (char === delimiter && braceDepth === 0 && bracketDepth === 0) {
            return [input.slice(0, i), input.slice(i + 1)]
        }
    }

    return null
}

const findGroupStart = (selector: string) => {
    let bracketDepth = 0

    for (let i = 0; i < selector.length - 1; i += 1) {
        const char = selector[i]
        if (char === '[') bracketDepth += 1
        if (char === ']') bracketDepth = Math.max(0, bracketDepth - 1)

        if (bracketDepth === 0 && selector[i] === ':' && selector[i + 1] === '{') {
            return i
        }
    }

    return -1
}

const stripImportantSuffix = (fragment: string) => {
    return fragment && fragment.endsWith('!') ? fragment.slice(0, -1) : fragment
}

const getChildSelector = (fragment: string) => {
    if (!fragment || !fragment.startsWith('[') || !fragment.endsWith(']')) return null
    return fragment.slice(1, -1)
}

const isSingleWordToken = (token: string) => /^[a-zA-Z]+$/.test(token)

const isBossSelectorToken = (selector: string, api: { dictionary: { resolve: (name: string) => { descriptor?: any } } }) => {
    if (isSingleWordToken(selector)) return false

    const grouped = parseGroupedSelector(selector)
    if (grouped) return true

    const rawFragments = splitFragments(selector)
    if (!rawFragments.length) return false

    const resolveDescriptor = (fragment: string) => {
        if (getChildSelector(fragment)) return api.dictionary.resolve('child')
        return api.dictionary.resolve(fragment)
    }

    const firstDescriptor = resolveDescriptor(stripImportantSuffix(rawFragments[0])).descriptor
    if (!firstDescriptor) return false
    if (rawFragments.length === 1) {
        return firstDescriptor.single === true
    }

    const path: string[] = []
    for (const [index, fragment] of Object.entries(rawFragments)) {
        const isLast = rawFragments.length === +index + 1
        if (path.length && isLast) {
            continue
        }
        const cleanedFragment = stripImportantSuffix(fragment)
        const childSelector = getChildSelector(cleanedFragment)
        if (childSelector) {
            path.push('child', childSelector)
        } else {
            path.push(cleanedFragment)
        }
    }

    if (!path.length) return false

    const lastProp = path.at(-1)
    const lastDescriptor = lastProp ? resolveDescriptor(lastProp).descriptor : null
    return Boolean(lastDescriptor?.isCSSProp)
}

export const collectBossClassTokensInSource = (
    source: string,
    options: { filename: string; api: { dictionary: { resolve: (name: string) => { descriptor?: any } } } },
) => {
    const ext = options.filename.split('.').pop() ?? ''
    const isTs = ext === 'ts' || ext === 'tsx'
    const isJsx = ['jsx', 'tsx', 'js', 'mjs', 'cjs'].includes(ext)
    const parsed = parseSync(source, {
        syntax: isTs ? 'typescript' : 'ecmascript',
        tsx: isTs && isJsx,
        jsx: !isTs && isJsx,
    }) as Program

    const tokens = new Set<string>()

    const visit = (node: unknown, context: { inModuleSpecifier?: boolean } = {}) => {
        if (!node || typeof node !== 'object') return
        if (Array.isArray(node)) {
            node.forEach(child => visit(child, context))
            return
        }

        const current = node as Record<string, unknown>

        if (!context.inModuleSpecifier) {
            if (current.type === 'StringLiteral') {
                const literal = current as { value: string }
                const selectors = splitSelectors(literal.value).flatMap(selector =>
                    rewriteSelector(selector, { expandSingleGroup: true }),
                )
                selectors.forEach(selector => {
                    if (isBossSelectorToken(selector, options.api)) {
                        tokens.add(selector)
                    }
                })
            }
            if (
                current.type === 'TemplateLiteral' &&
                Array.isArray((current as { expressions?: unknown[] }).expressions) &&
                (current as { expressions: unknown[] }).expressions.length === 0 &&
                Array.isArray((current as { quasis?: unknown[] }).quasis) &&
                (current as { quasis: unknown[] }).quasis.length
            ) {
                const template = current as { quasis: Array<{ cooked?: string }> }
                const firstQuasi = template.quasis[0]
                if (firstQuasi?.cooked != null) {
                    const selectors = splitSelectors(firstQuasi.cooked).flatMap(selector =>
                        rewriteSelector(selector, { expandSingleGroup: true }),
                    )
                    selectors.forEach(selector => {
                        if (isBossSelectorToken(selector, options.api)) {
                            tokens.add(selector)
                        }
                    })
                }
            }
        }

        for (const key of Object.keys(current)) {
            const nextContext =
                (current.type === 'ImportDeclaration' ||
                    current.type === 'ExportAllDeclaration' ||
                    current.type === 'ExportNamedDeclaration') &&
                key === 'source'
                    ? { ...context, inModuleSpecifier: true }
                    : context
            visit(current[key], nextContext)
        }
    }

    visit(parsed)

    return tokens
}

export const collectBossClassTokensInText = (
    source: string,
    options: { api: { dictionary: { resolve: (name: string) => { descriptor?: any } } } },
) => {
    const tokens = new Set<string>()

    rewriteQuotedSegments(source, ({ value, hasTemplateExpression }) => {
        if (hasTemplateExpression) return null
        const selectors = splitSelectors(value).flatMap(selector =>
            rewriteSelector(selector, { expandSingleGroup: true }),
        )
        selectors.forEach(selector => {
            if (isBossSelectorToken(selector, options.api)) {
                tokens.add(selector)
            }
        })
        return null
    })

    return tokens
}

const rewriteQuotedSegments = (
    input: string,
    rewrite: (segment: { value: string; quote: string; hasTemplateExpression: boolean }) => string | null,
) => {
    let output = ''
    let index = 0
    const length = input.length

    while (index < length) {
        const char = input[index]
        if (char !== '"' && char !== "'" && char !== '`') {
            output += char
            index += 1
            continue
        }

        const quote = char
        const start = index
        index += 1
        let value = ''
        let escaped = false
        let hasTemplateExpression = false

        while (index < length) {
            const current = input[index]
            if (escaped) {
                value += current
                escaped = false
                index += 1
                continue
            }
            if (current === '\\') {
                value += current
                escaped = true
                index += 1
                continue
            }
            if (quote === '`' && current === '$' && input[index + 1] === '{') {
                hasTemplateExpression = true
            }
            if (current === quote) {
                break
            }
            value += current
            index += 1
        }

        if (index >= length) {
            output += input.slice(start)
            break
        }

        const replacement = rewrite({ value, quote, hasTemplateExpression })
        if (replacement === null) {
            output += quote + value + quote
        } else {
            output += quote + replacement + quote
        }
        index += 1
    }

    return output
}
