import type { BossBrowserApi, Plugin } from '@/types'
let baseStyleElement: HTMLStyleElement | null = null
let baseSheet: CSSStyleSheet | null = null
let atStyleElement: HTMLStyleElement | null = null
let atSheet: CSSStyleSheet | null = null
let atRuleIndex = 0
const atRules: Array<{ key: string; order: { group: number; primary: number; secondary: number; index: number } }> =
    []
const inserted = new Set<string>()

const canUseDom = () => typeof document !== 'undefined' && typeof document.createElement === 'function'
const GLOBAL_STYLE_ATTR = 'data-boss-globals'

const ensureBaseSheet = () => {
    if (baseSheet || !canUseDom()) return baseSheet

    baseStyleElement = document.querySelector('style[data-boss-runtime]') as HTMLStyleElement | null
    if (!baseStyleElement) {
        baseStyleElement = document.createElement('style')
        baseStyleElement.setAttribute('data-boss-runtime', '')
        document.head.appendChild(baseStyleElement)
    }

    baseSheet = baseStyleElement.sheet as CSSStyleSheet | null
    return baseSheet
}

export const applyGlobals = (payload?: { cssText?: string } | string | null) => {
    if (!payload || !canUseDom()) return
    const cssText = typeof payload === 'string' ? payload : payload.cssText
    if (!cssText) return

    let style = document.querySelector(`style[${GLOBAL_STYLE_ATTR}]`) as HTMLStyleElement | null
    if (!style) {
        style = document.createElement('style')
        style.setAttribute(GLOBAL_STYLE_ATTR, '')
        document.head.appendChild(style)
    }

    if (style.textContent !== cssText) {
        style.textContent = cssText
    }
}

const ensureAtSheet = () => {
    if (atSheet || !canUseDom()) return atSheet

    ensureBaseSheet()
    atStyleElement = document.querySelector('style[data-boss-runtime-at]') as HTMLStyleElement | null
    if (!atStyleElement) {
        atStyleElement = document.createElement('style')
        atStyleElement.setAttribute('data-boss-runtime-at', '')
        const parent = baseStyleElement?.parentNode
        if (parent) {
            parent.insertBefore(atStyleElement, baseStyleElement?.nextSibling ?? null)
        } else {
            document.head.appendChild(atStyleElement)
        }
    }

    atSheet = atStyleElement.sheet as CSSStyleSheet | null
    return atSheet
}

const compareAtRuleOrder = (
    a: { group: number; primary: number; secondary: number; index: number },
    b: { group: number; primary: number; secondary: number; index: number },
) => {
    if (a.group !== b.group) return a.group - b.group
    if (a.primary !== b.primary) return a.primary - b.primary
    if (a.secondary !== b.secondary) return a.secondary - b.secondary
    return a.index - b.index
}

const getAtRuleOrder = (query: string, index: number) => {
    const normalized = query.trim().toLowerCase()
    if (!normalized.startsWith('@media')) return { group: 4, primary: 0, secondary: 0, index }

    const minMatch = normalized.match(/min-width\s*:\s*(\d+(?:\.\d+)?)px/)
    const maxMatch = normalized.match(/max-width\s*:\s*(\d+(?:\.\d+)?)px/)
    const min = minMatch ? Number(minMatch[1]) : null
    const max = maxMatch ? Number(maxMatch[1]) : null

    if (min !== null && max !== null) {
        return { group: 1, primary: min, secondary: max, index }
    }
    if (max !== null) {
        return { group: 0, primary: -max, secondary: 0, index }
    }
    if (min !== null) {
        return { group: 2, primary: min, secondary: 0, index }
    }
    return { group: 3, primary: 0, secondary: 0, index }
}

const insertRule = (rule: string, key: string = rule, query: string | null = null) => {
    if (inserted.has(key)) return
    inserted.add(key)

    if (!query) {
        const activeSheet = ensureBaseSheet()
        if (!activeSheet) return
        try {
            activeSheet.insertRule(rule, activeSheet.cssRules.length)
        } catch {
            baseStyleElement?.appendChild(document.createTextNode(rule))
        }
        return
    }

    const activeSheet = ensureAtSheet()
    if (!activeSheet) return

    const order = getAtRuleOrder(query, atRuleIndex)
    atRuleIndex += 1
    let insertIndex = atRules.length
    for (let i = 0; i < atRules.length; i += 1) {
        if (compareAtRuleOrder(order, atRules[i].order) < 0) {
            insertIndex = i
            break
        }
    }

    try {
        activeSheet.insertRule(rule, insertIndex)
        atRules.splice(insertIndex, 0, { key, order })
    } catch {
        atStyleElement?.appendChild(document.createTextNode(rule))
        atRules.push({ key, order })
    }
}

export class RuntimeCSS {
    api: BossBrowserApi
    current: {
        className: string | null
        selector: string | null
        pseudos: string[]
        values: Set<string>
        query: string | null
    } | null = null
    root = new Set<string>()
    imports = new Set<string>()

    constructor(api: BossBrowserApi) {
        this.api = api
    }

    get text() {
        return ''
    }

    addImport(_url?: string) {}

    addRoot(value?: string, _source?: string | null) {
        if (!value) return
        if (this.root.has(value)) return
        this.root.add(value)
        if (!canUseDom()) return
        const selector = typeof this.api.selectorScope === 'string' && this.api.selectorScope.length > 0 ? this.api.selectorScope : ':root'
        insertRule(`${selector} { ${value} }`, `root|${selector}|${value}`)
    }

    removeSource(_source?: string | null) {}

    reset() {}

    selector({ className, selector = null, pseudos = [], query = null }: { className?: string | null; selector?: string | null; pseudos?: string[]; query?: string | null }) {
        if (!this.current) {
            this.current = {
                className: null,
                selector: null,
                pseudos: [],
                values: new Set(),
                query: null,
            }
        }

        const current = this.current
        if (query && current.query && query !== current.query) {
            throw new Error(
                `RuntimeCSS:selector Selector already has a query. Existing: ${current.query} Incoming: ${query}`,
            )
        }

        const mergedPseudos: string[] = []
        for (const pseudo of [...current.pseudos, ...pseudos]) {
            if (!mergedPseudos.includes(pseudo)) mergedPseudos.push(pseudo)
        }
        const next = {
            pseudos: mergedPseudos,
            query: query || current.query,
        }
        if (selector) {
            Object.assign(next, { selector, className: null })
        } else if (className) {
            Object.assign(next, { className })
        }

        Object.assign(current, next)
    }

    rule(property: string, value: unknown, options?: { important?: boolean }) {
        if (!this.current) throw new Error('RuntimeCSS:rule No current selector')

        const suffix = options?.important ? ' !important' : ''
        this.current.values.add(`${property}: ${this.api.dictionary.toValue(value, property)}${suffix}`)
    }

    addRule(rule: string, query: string | null = null, _source?: string | null) {
        const wrapped = query ? `${query} { ${rule} }` : rule
        insertRule(wrapped, wrapped, query)
    }

    write() {
        if (!this.current) throw new Error('RuntimeCSS:write No current selector')

        const current = this.current
        const baseSelector = current.selector || (current.className ? `.${current.className}` : null)

        if (!baseSelector) throw new Error('RuntimeCSS:write No className or selector')

        const selector = [baseSelector, ...current.pseudos].join(':')
        const selectorScope = typeof this.api.selectorScope === 'string' ? this.api.selectorScope : ''
        const scopedSelector = selectorScope ? `${selectorScope}${selector}` : selector
        let rule = `${scopedSelector} { ${[...current.values].join(';')} }`
        if (current.query) {
            rule = `${current.query} { ${rule} }`
        }
        const key = `${current.query ?? ''}|${scopedSelector}|${[...current.values].join(';')}`
        insertRule(rule, key, current.query)
        this.current = null
    }
}

export const onInit: Plugin<'onInit'> = api => {
    if (!api.css || !(api.css instanceof RuntimeCSS)) {
        api.css = new RuntimeCSS(api)
    }
}
