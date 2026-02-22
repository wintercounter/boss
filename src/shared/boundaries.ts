import path from 'node:path'
import fastGlob from 'fast-glob'

const DEFAULT_CRITICALITY = 2
const GLOBAL_SOURCE = '<global>'
const BOUNDARY_PATTERN = '**/*.boss.css'

type BoundaryConfig = {
    ignore?: string[]
    criticality?: number
}

type BoundaryNode = {
    id: number
    path: string
    dir: string
    depth: number
    parentId: number | null
}

type BoundaryIndex = {
    global: BoundaryNode
    byId: Map<number, BoundaryNode>
    byPath: Map<string, BoundaryNode>
    byDir: Map<string, BoundaryNode[]>
    primaryByDir: Map<string, BoundaryNode>
    nodes: BoundaryNode[]
}

type CssRuleEntry = {
    rule: string
    query: string | null
    index: number
    sources: Set<string>
}

type RootEntry = {
    declaration: string
    sources: Set<string>
    order: number
}

type CustomEntry = {
    cssText: string
    sources: Set<string>
    order: number
}

type AssignedBuckets = {
    rules: Map<number, Set<string>>
    root: Map<number, Set<string>>
    custom: Map<number, CustomEntry[]>
}

export type BoundaryOutput = {
    path: string
    text: string
}

export type BoundaryOutputsResult = {
    outputs: BoundaryOutput[]
    boundaryFiles: string[]
    hasBoundaries: boolean
}

const normalizePath = (filePath: string) => path.resolve(filePath)

const getDepth = (dir: string) => dir.split(path.sep).filter(Boolean).length

const normalizeCssText = (value: string) => {
    return value
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\s+/g, ' ')
        .replace(/\s*([{}:;,>+~])\s*/g, '$1')
        .replace(/;}/g, '}')
        .trim()
}

export const findBoundaryFiles = async (rootDir: string, config: BoundaryConfig = {}) => {
    const ignore = [...(config.ignore ?? [])]
    ignore.push('**/node_modules/**')

    const files = await fastGlob(BOUNDARY_PATTERN, {
        cwd: rootDir,
        absolute: true,
        onlyFiles: true,
        ignore,
    })

    return files.map(normalizePath).sort((a, b) => a.localeCompare(b))
}

const buildBoundaryIndex = (boundaryFiles: string[], stylesheetPath: string): BoundaryIndex => {
    const normalizedStylesheet = normalizePath(stylesheetPath)
    const globalNode: BoundaryNode = {
        id: 0,
        path: normalizedStylesheet,
        dir: path.dirname(normalizedStylesheet),
        depth: getDepth(path.dirname(normalizedStylesheet)),
        parentId: null,
    }

    const byId = new Map<number, BoundaryNode>([[globalNode.id, globalNode]])
    const byPath = new Map<string, BoundaryNode>([[globalNode.path, globalNode]])
    const byDir = new Map<string, BoundaryNode[]>()
    const primaryByDir = new Map<string, BoundaryNode>()

    const nodes = boundaryFiles.map((file, index) => {
        const dir = path.dirname(file)
        const node: BoundaryNode = {
            id: index + 1,
            path: file,
            dir,
            depth: getDepth(dir),
            parentId: null,
        }
        byId.set(node.id, node)
        byPath.set(node.path, node)
        const list = byDir.get(dir) ?? []
        list.push(node)
        byDir.set(dir, list)
        return node
    })

    for (const [dir, list] of byDir.entries()) {
        list.sort((a, b) => a.path.localeCompare(b.path))
        primaryByDir.set(dir, list[0])
        if (list.length > 1) {
            console.warn(
                `[boss-css] Multiple .boss.css files found in ${dir}. Using ${path.basename(
                    list[0].path,
                )} for boundary mapping.`,
            )
        }
    }

    for (const node of nodes) {
        let current = path.dirname(node.dir)
        while (true) {
            const parent = primaryByDir.get(current)
            if (parent) {
                node.parentId = parent.id
                break
            }
            const next = path.dirname(current)
            if (!next || next === current) {
                node.parentId = globalNode.id
                break
            }
            current = next
        }
    }

    return { global: globalNode, byId, byPath, byDir, primaryByDir, nodes }
}

const resolveBoundaryForSource = (source: string | null | undefined, index: BoundaryIndex) => {
    if (!source || source === GLOBAL_SOURCE) return index.global
    if (source.startsWith('<') && source.endsWith('>')) return index.global
    const resolved = normalizePath(source)
    let current = path.dirname(resolved)
    while (true) {
        const boundary = index.primaryByDir.get(current)
        if (boundary) return boundary
        const next = path.dirname(current)
        if (!next || next === current) break
        current = next
    }
    return index.global
}

const getAncestorIds = (id: number, index: BoundaryIndex) => {
    const ids: number[] = []
    let current: BoundaryNode | undefined = index.byId.get(id)
    while (current) {
        ids.push(current.id)
        if (current.parentId == null) break
        current = index.byId.get(current.parentId)
    }
    return ids
}

const resolveCommonAncestor = (ids: number[], index: BoundaryIndex) => {
    if (!ids.length) return index.global.id
    const ancestorLists = ids.map(id => getAncestorIds(id, index))
    const [first, ...rest] = ancestorLists
    for (const candidate of first) {
        if (rest.every(list => list.includes(candidate))) {
            return candidate
        }
    }
    return index.global.id
}

const ensureBucket = <T>(map: Map<number, T>, id: number, factory: () => T) => {
    const existing = map.get(id)
    if (existing) return existing
    const created = factory()
    map.set(id, created)
    return created
}

const assignRulesToBoundaries = (
    entries: Iterable<CssRuleEntry>,
    index: BoundaryIndex,
    criticality: number,
): AssignedBuckets['rules'] => {
    const buckets = new Map<number, Set<string>>()

    for (const entry of entries) {
        const boundaryIds = new Set<number>()
        for (const source of entry.sources) {
            boundaryIds.add(resolveBoundaryForSource(source, index).id)
        }

        if (!boundaryIds.size) {
            boundaryIds.add(index.global.id)
        }

        const ids = Array.from(boundaryIds)
        if (ids.length >= criticality) {
            const target = resolveCommonAncestor(ids, index)
            ensureBucket(buckets, target, () => new Set()).add(entry.rule)
        } else {
            for (const id of ids) {
                ensureBucket(buckets, id, () => new Set()).add(entry.rule)
            }
        }
    }

    return buckets
}

const assignRootToBoundaries = (
    entries: Iterable<RootEntry>,
    index: BoundaryIndex,
    criticality: number,
): AssignedBuckets['root'] => {
    const buckets = new Map<number, Set<string>>()

    for (const entry of entries) {
        const boundaryIds = new Set<number>()
        for (const source of entry.sources) {
            boundaryIds.add(resolveBoundaryForSource(source, index).id)
        }

        if (!boundaryIds.size) {
            boundaryIds.add(index.global.id)
        }

        const ids = Array.from(boundaryIds)
        if (ids.length >= criticality) {
            const target = resolveCommonAncestor(ids, index)
            ensureBucket(buckets, target, () => new Set()).add(entry.declaration)
        } else {
            for (const id of ids) {
                ensureBucket(buckets, id, () => new Set()).add(entry.declaration)
            }
        }
    }

    return buckets
}

const assignCustomToBoundaries = (
    entries: Iterable<CustomEntry>,
    index: BoundaryIndex,
    criticality: number,
): AssignedBuckets['custom'] => {
    const buckets = new Map<number, CustomEntry[]>()

    for (const entry of entries) {
        const boundaryIds = new Set<number>()
        for (const source of entry.sources) {
            boundaryIds.add(resolveBoundaryForSource(source, index).id)
        }

        if (!boundaryIds.size) {
            boundaryIds.add(index.global.id)
        }

        const ids = Array.from(boundaryIds)
        if (ids.length >= criticality) {
            const target = resolveCommonAncestor(ids, index)
            ensureBucket(buckets, target, () => []).push(entry)
        } else {
            for (const id of ids) {
                ensureBucket(buckets, id, () => []).push(entry)
            }
        }
    }

    return buckets
}

const buildCssText = (
    css: any,
    options: { rules: Set<string>; root: Set<string>; custom: CustomEntry[]; imports?: Set<string> },
) => {
    const importRules = options.imports?.size ? Array.from(options.imports).join('\n') : ''

    const entries = Array.from(options.rules).map(rule => {
        const meta = css.ruleMeta.get(rule)
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
        .sort((a, b) => css.compareAtRuleOrder(a, b))
        .map(entry => entry.rule)

    const orderedRules = [...baseRules, ...atRules].join('\n')

    const rootSelector = css.api.selectorScope || ':root'
    const rootRules = options.root.size
        ? `${rootSelector} {\n  ${Array.from(options.root).join('\n  ')}\n}\n${orderedRules}`
        : orderedRules

    const customRules = options.custom.length ? options.custom.map(entry => entry.cssText).join('\n') : ''

    if (!importRules && !rootRules && !customRules) return ''
    if (!importRules && !customRules) return rootRules
    if (!importRules && !rootRules) return customRules
    if (!customRules) return importRules ? `${importRules}\n${rootRules}` : rootRules
    if (!rootRules) return importRules ? `${importRules}\n${customRules}` : customRules
    return `${importRules}\n${rootRules}\n${customRules}`
}

const collectRuleEntries = (css: any) => {
    const map = new Map<string, CssRuleEntry>()
    for (const rule of css as Set<string>) {
        const meta = css.ruleMeta.get(rule)
        const signature = normalizeCssText(rule)
        const sources = css.ruleSources.get(rule) ?? new Set([GLOBAL_SOURCE])
        const existing = map.get(signature)
        if (!existing) {
            map.set(signature, {
                rule,
                query: meta?.query ?? null,
                index: meta?.index ?? 0,
                sources: new Set(sources),
            })
            continue
        }
        for (const source of sources) {
            existing.sources.add(source)
        }
        if (meta && meta.index < existing.index) {
            existing.rule = rule
            existing.index = meta.index
            existing.query = meta.query ?? null
        }
    }
    return map.values()
}

const collectRootEntries = (css: any) => {
    const map = new Map<string, RootEntry>()
    const rootSelector = css.api.selectorScope || ':root'
    let order = 0
    for (const declaration of css.root as Set<string>) {
        const signature = normalizeCssText(`${rootSelector} { ${declaration} }`)
        const sources = css.rootSources.get(declaration) ?? new Set([GLOBAL_SOURCE])
        const existing = map.get(signature)
        if (!existing) {
            map.set(signature, { declaration, sources: new Set(sources), order })
        } else {
            for (const source of sources) {
                existing.sources.add(source)
            }
        }
        order += 1
    }
    return map.values()
}

const collectCustomEntries = (css: any) => {
    const map = new Map<string, CustomEntry>()
    let order = 0
    for (const entry of css.customBlocks.values()) {
        const signature = normalizeCssText(entry.cssText)
        const sources = new Set([entry.file || GLOBAL_SOURCE])
        const existing = map.get(signature)
        if (!existing) {
            map.set(signature, { cssText: entry.cssText, sources, order })
        } else {
            for (const source of sources) {
                existing.sources.add(source)
            }
        }
        order += 1
    }
    return map.values()
}

export const resolveBoundaryOutputs = async (
    api: any,
    options: { rootDir?: string; stylesheetPath: string; boundaries?: BoundaryConfig },
): Promise<BoundaryOutputsResult> => {
    const rootDir = options.rootDir ?? process.cwd()
    const boundaryConfig = options.boundaries ?? {}
    const boundaryFiles = await findBoundaryFiles(rootDir, boundaryConfig)

    if (!boundaryFiles.length) {
        return {
            outputs: [{ path: normalizePath(options.stylesheetPath), text: api.css.text }],
            boundaryFiles: [],
            hasBoundaries: false,
        }
    }

    const index = buildBoundaryIndex(boundaryFiles, options.stylesheetPath)
    const criticality = Math.max(1, boundaryConfig.criticality ?? DEFAULT_CRITICALITY)

    const ruleEntries = collectRuleEntries(api.css)
    const rootEntries = collectRootEntries(api.css)
    const customEntries = collectCustomEntries(api.css)

    const ruleBuckets = assignRulesToBoundaries(ruleEntries, index, criticality)
    const rootBuckets = assignRootToBoundaries(rootEntries, index, criticality)
    const customBuckets = assignCustomToBoundaries(customEntries, index, criticality)

    const outputs: BoundaryOutput[] = []
    const boundaryNodes = [index.global, ...index.nodes].sort((a, b) => a.path.localeCompare(b.path))

    for (const boundary of boundaryNodes) {
        const rules = ruleBuckets.get(boundary.id) ?? new Set()
        const root = rootBuckets.get(boundary.id) ?? new Set()
        const custom = customBuckets.get(boundary.id) ?? []
        custom.sort((a, b) => a.order - b.order)
        const imports = boundary.id === index.global.id ? api.css.imports : new Set()
        const text = buildCssText(api.css, { rules, root, custom, imports })
        outputs.push({ path: boundary.path, text })
    }

    return {
        outputs,
        boundaryFiles,
        hasBoundaries: true,
    }
}
