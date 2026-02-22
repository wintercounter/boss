import type { BossApiBase, BossCssRuleOptions, BossCssSelectorInput, BossLogger } from '@/types'

export class CSS extends Set {
    api: BossApiBase
    log: BossLogger

    current: {
        className: string | null
        selector: string | null
        pseudos: string[]
        values: Set<string>
        query: string | null
        source: string | null
    } | null = null
    source: string | null = null
    ruleMeta = new Map<string, { query: string | null; index: number }>()
    ruleSources = new Map<string, Set<string>>()
    ruleIndex = 0
    imports = new Set<string>()
    customBlocks = new Map<string, { cssText: string; file: string; start: number; end: number }>()
    customByFile = new Map<string, Set<string>>()
    rootSources = new Map<string, Set<string>>()

    get text() {
        const importRules = this.imports.size ? Array.from(this.imports).join('\n') : ''
        const entries = Array.from(this).map(rule => {
            const meta = this.ruleMeta.get(rule)
            return {
                rule,
                query: meta?.query ?? null,
                index: meta?.index ?? 0,
            }
        })
        const baseRules = entries
            .filter(entry => !entry.query)
            .sort((a, b) => a.index - b.index)
            .map(entry => entry.rule)
        const atRules = entries
            .filter(entry => entry.query)
            .sort((a, b) => this.compareAtRuleOrder(a, b))
            .map(entry => entry.rule)
        const orderedRules = [...baseRules, ...atRules].join('\n')
        const rootRules = this.root.size
            ? `${this.api.selectorScope || ':root'} {
  ${Array.from(this.root).join('\n  ')}
}
${orderedRules}`
            : orderedRules
        const customRules = this.getCustomText()
        if (!importRules && !rootRules && !customRules) return ''
        if (!importRules && !customRules) return rootRules
        if (!importRules && !rootRules) return customRules
        if (!customRules) return importRules ? `${importRules}\n${rootRules}` : rootRules
        if (!rootRules) return importRules ? `${importRules}\n${customRules}` : customRules
        return `${importRules}\n${rootRules}\n${customRules}`
    }

    root = new Set<string>()

    constructor(api: BossApiBase) {
        super()
        this.api = api
        this.log = api.log.child('css')
    }

    setSource(source: string | null) {
        this.source = source
    }

    rule(property: string, value: unknown, options?: BossCssRuleOptions) {
        if (!this.current) throw new Error('CSS:rule No current selector')

        const suffix = options?.important ? ' !important' : ''
        this.current.values.add(`${property}: ${this.api.dictionary.toValue(value, property)}${suffix}`)
    }

    addImport(url: string) {
        if (!url) return
        this.imports.add(`@import url("${url}");`)
    }

    addRule(rule: string, query: string | null = null, source: string | null = null) {
        const wrapped = query ? `${query} { ${rule} }` : rule
        if (!this.has(wrapped)) {
            this.add(wrapped)
            this.ruleMeta.set(wrapped, { query, index: this.ruleIndex })
            this.ruleIndex += 1
        }
        this.trackRuleSource(wrapped, source ?? this.source)
    }

    selector({ className, selector = null, pseudos = [], query = null, source = null }: BossCssSelectorInput) {
        this.log.log('selector', { className, selector, pseudos, query })
        if (!this.current) {
            this.current = {
                className: null,
                selector: null,
                pseudos: [],
                values: new Set(),
                query: null,
                source: null,
            }
        }

        const current = this.current
        if (query && current.query && query !== current.query) {
            throw new Error(
                `CSS:selector Selector already has a query. Existing: ${current.query} Incoming: ${query}`,
            )
        }

        const mergedPseudos: string[] = []
        for (const pseudo of [...current.pseudos, ...pseudos]) {
            if (!mergedPseudos.includes(pseudo)) mergedPseudos.push(pseudo)
        }
        const next: {
            pseudos: string[]
            query: string | null
            selector?: string | null
            className?: string | null
            source?: string | null
        } = {
            pseudos: mergedPseudos,
            query: query || current.query,
        }
        if (selector) {
            Object.assign(next, { selector, className: null })
        } else if (className) {
            Object.assign(next, { className })
        }

        if (source || this.source) {
            next.source = source ?? this.source
        }

        Object.assign(current, next)
    }

    write() {
        this.log.log('write', this.current)

        if (!this.current) throw new Error('CSS:write No current selector')

        const current = this.current
        const baseSelector = current.selector || (current.className ? `.${current.className}` : null)

        if (!baseSelector) throw new Error('CSS:write No className or selector')

        const selector = [baseSelector, ...current.pseudos].join(':')
        const selectorScope = typeof this.api.selectorScope === 'string' ? this.api.selectorScope : ''
        const scopedSelector = selectorScope ? `${selectorScope}${selector}` : selector
        let string = `${scopedSelector} { ${[...current.values].join(';')} }`
        if (current.query) {
            string = `${current.query} { ${string} }`
        }
        if (!this.has(string)) {
            this.add(string)
            this.ruleMeta.set(string, { query: current.query, index: this.ruleIndex })
            this.ruleIndex += 1
        }
        this.trackRuleSource(string, current.source ?? this.source)
        this.current = null
    }

    compareAtRuleOrder(
        a: { query: string | null; index: number },
        b: { query: string | null; index: number },
    ) {
        const aOrder = this.getAtRuleOrder(a.query, a.index)
        const bOrder = this.getAtRuleOrder(b.query, b.index)
        if (aOrder.group !== bOrder.group) return aOrder.group - bOrder.group
        if (aOrder.primary !== bOrder.primary) return aOrder.primary - bOrder.primary
        if (aOrder.secondary !== bOrder.secondary) return aOrder.secondary - bOrder.secondary
        return aOrder.index - bOrder.index
    }

    getAtRuleOrder(query: string | null, index: number) {
        if (!query) return { group: 0, primary: 0, secondary: 0, index }
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

    addRoot(value: string, source: string | null = null) {
        if (!value) return
        this.root.add(value)
        this.trackRootSource(value, source ?? this.source)
    }

    removeSource(source: string | null | undefined) {
        if (!source) return

        for (const [rule, sources] of this.ruleSources.entries()) {
            if (!sources.delete(source)) continue
            if (sources.size === 0) {
                this.ruleSources.delete(rule)
                this.ruleMeta.delete(rule)
                this.delete(rule)
            }
        }

        for (const [declaration, sources] of this.rootSources.entries()) {
            if (!sources.delete(source)) continue
            if (sources.size === 0) {
                this.rootSources.delete(declaration)
                this.root.delete(declaration)
            }
        }

        const customIds = this.customByFile.get(source)
        if (customIds) {
            for (const id of customIds) {
                this.customBlocks.delete(id)
            }
            this.customByFile.delete(source)
        }
    }

    reset() {
        this.clear()
        this.root.clear()
        this.imports.clear()
        this.customBlocks.clear()
        this.customByFile.clear()
        this.ruleMeta.clear()
        this.ruleSources.clear()
        this.rootSources.clear()
        this.ruleIndex = 0
        this.current = null
        this.source = null
    }

    snapshot() {
        const cloneSet = <T>(set: Set<T>) => new Set(set)
        const cloneSetMap = (map: Map<string, Set<string>>) => {
            const next = new Map<string, Set<string>>()
            for (const [key, value] of map.entries()) {
                next.set(key, new Set(value))
            }
            return next
        }
        const cloneRuleMeta = new Map<string, { query: string | null; index: number }>()
        for (const [key, meta] of this.ruleMeta.entries()) {
            cloneRuleMeta.set(key, { query: meta.query ?? null, index: meta.index })
        }
        const cloneCustomBlocks = new Map<string, { cssText: string; file: string; start: number; end: number }>()
        for (const [key, value] of this.customBlocks.entries()) {
            cloneCustomBlocks.set(key, { ...value })
        }
        const cloneCustomByFile = new Map<string, Set<string>>()
        for (const [key, value] of this.customByFile.entries()) {
            cloneCustomByFile.set(key, new Set(value))
        }

        return {
            rules: cloneSet(this),
            root: cloneSet(this.root),
            imports: cloneSet(this.imports),
            ruleMeta: cloneRuleMeta,
            ruleSources: cloneSetMap(this.ruleSources),
            rootSources: cloneSetMap(this.rootSources),
            customBlocks: cloneCustomBlocks,
            customByFile: cloneCustomByFile,
            ruleIndex: this.ruleIndex,
        }
    }

    restore(snapshot: unknown) {
        const data = snapshot as ReturnType<CSS['snapshot']> | null | undefined
        if (!data) return
        this.reset()
        for (const rule of data.rules ?? []) this.add(rule)
        for (const value of data.root ?? []) this.root.add(value)
        for (const value of data.imports ?? []) this.imports.add(value)
        if (data.ruleMeta) {
            this.ruleMeta = new Map(data.ruleMeta)
        }
        if (data.ruleSources) {
            this.ruleSources = new Map(data.ruleSources)
        }
        if (data.rootSources) {
            this.rootSources = new Map(data.rootSources)
        }
        if (data.customBlocks) {
            this.customBlocks = new Map(data.customBlocks)
        }
        if (data.customByFile) {
            this.customByFile = new Map(data.customByFile)
        }
        this.ruleIndex = data.ruleIndex ?? 0
    }

    syncCustomBlocks(file: string | undefined, blocks: Array<{ start: number; end: number; cssText: string }>) {
        const fileKey = file || '<unknown>'
        const nextIds = new Set<string>()

        for (const block of blocks) {
            const cssText = block.cssText
            if (!cssText.trim()) continue
            const id = `${fileKey}:${block.start}-${block.end}`
            nextIds.add(id)
            const existing = this.customBlocks.get(id)
            if (!existing || existing.cssText !== cssText) {
                this.customBlocks.set(id, { cssText, file: fileKey, start: block.start, end: block.end })
            }
        }

        const previous = this.customByFile.get(fileKey)
        if (previous) {
            for (const id of previous) {
                if (!nextIds.has(id)) {
                    this.customBlocks.delete(id)
                }
            }
        }

        if (nextIds.size) {
            this.customByFile.set(fileKey, nextIds)
        } else {
            this.customByFile.delete(fileKey)
        }
    }

    getCustomText() {
        if (!this.customBlocks.size) return ''
        return Array.from(this.customBlocks.values())
            .map(entry => entry.cssText)
            .join('\n')
    }

    trackRuleSource(rule: string, source: string | null | undefined) {
        if (!source) return
        const existing = this.ruleSources.get(rule)
        if (existing) {
            existing.add(source)
            return
        }
        this.ruleSources.set(rule, new Set([source]))
    }

    trackRootSource(rule: string, source: string | null | undefined) {
        if (!source) return
        const existing = this.rootSources.get(rule)
        if (existing) {
            existing.add(source)
            return
        }
        this.rootSources.set(rule, new Set([source]))
    }
}
