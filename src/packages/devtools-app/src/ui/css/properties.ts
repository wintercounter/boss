import csstype from 'boss-css/prop/css/csstype.json'

const dashToCamel = (value: string) =>
    value.replace(/-([a-z0-9])/g, (_, char) => (char ? char.toUpperCase() : ''))

export const cssProperties = Object.keys(csstype.props || {}).filter(name => !name.startsWith('--'))
export const cssPropertySet = new Set(cssProperties)
export const cssPropertySetCamel = new Set(cssProperties.map(dashToCamel))

export const isCssProperty = (name: string) =>
    cssPropertySet.has(name) || cssPropertySetCamel.has(name)

export const toDashCase = (value: string) =>
    value
        .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
        .replace(/\s+/g, '-')
        .toLowerCase()

export const toCamelCase = (value: string) =>
    value
        .replace(/-([a-z0-9])/g, (_, char) => (char ? char.toUpperCase() : ''))
        .replace(/\s+/g, '')

const syntaxKeywordCache = new Map<string, string[]>()
const syntaxDescriptionRegex = /\*\*Syntax\*\*:\s*`([^`]+)`/i

const manualSyntaxKeywords: Record<string, string[]> = {
    'transition-timing-function': [
        'linear',
        'ease',
        'ease-in',
        'ease-out',
        'ease-in-out',
        'step-start',
        'step-end',
        'steps()',
        'cubic-bezier()',
    ],
    'animation-timing-function': [
        'linear',
        'ease',
        'ease-in',
        'ease-out',
        'ease-in-out',
        'step-start',
        'step-end',
        'steps()',
        'cubic-bezier()',
    ],
}

const parseSyntaxKeywords = (description: string) => {
    const match = description.match(syntaxDescriptionRegex)
    if (!match) return []

    return match[1]
        .split('|')
        .map(value => value.trim())
        .map(value => value.replace(/[?!*]$/, ''))
        .filter(
            value =>
                value &&
                !value.includes('<') &&
                !value.includes('>') &&
                !value.includes('(') &&
                !value.includes(')') &&
                !value.includes('[') &&
                !value.includes(']'),
        )
        .filter(value => /^[a-z0-9-]+$/i.test(value))
}

const syntaxKeywordCounts = new Map<string, number>()
const globalKeywords = new Set(parseSyntaxKeywords((csstype.props as Record<string, { description?: string }> | undefined)?.all?.description ?? ''))

for (const value of Object.values(csstype.props || {})) {
    const keywords = parseSyntaxKeywords(value?.description ?? '')
    for (const keyword of keywords) {
        syntaxKeywordCounts.set(keyword, (syntaxKeywordCounts.get(keyword) ?? 0) + 1)
    }
}

const frequentKeywords = new Set(
    Array.from(syntaxKeywordCounts.entries())
        .filter(([, count]) => count >= 10)
        .map(([keyword]) => keyword),
)
const commonKeywordSet = new Set([...globalKeywords, ...frequentKeywords])

export const getCssSyntaxKeywords = (prop: string) => {
    const normalized = cssPropertySet.has(prop) ? prop : toDashCase(prop)
    const cached = syntaxKeywordCache.get(normalized)
    if (cached) return cached
    const manual = manualSyntaxKeywords[normalized] ?? []

    const description = (csstype.props as Record<string, { description?: string }> | undefined)?.[normalized]
        ?.description
    if (!description) {
        syntaxKeywordCache.set(normalized, manual)
        return manual
    }

    const unique = Array.from(new Set([...parseSyntaxKeywords(description), ...manual]))
    syntaxKeywordCache.set(normalized, unique)
    return unique
}

export const splitCssSyntaxKeywords = (prop: string) => {
    const keywords = getCssSyntaxKeywords(prop)
    return {
        common: keywords.filter(keyword => commonKeywordSet.has(keyword)),
        native: keywords.filter(keyword => !commonKeywordSet.has(keyword)),
    }
}
