import fs from 'node:fs/promises'
import path from 'node:path'

import type { FontConfig, FontConfigStatic, FontVariableAxes } from '@/fontsource/types'
import { fontDirectory } from '@/fontsource/directory'
import type { BossServerApi, Plugin } from '@/types'

export const name = 'fontsource'

const API_BASE = 'https://api.fontsource.org'
const CDN_NPM_BASE = 'https://cdn.jsdelivr.net/npm'

type FontDirectoryEntry = {
    id: string
    family: string
    defSubset?: string
    subsets?: ReadonlyArray<string>
    weights?: ReadonlyArray<string | number>
    styles?: ReadonlyArray<string>
}

const fontDirectoryEntries = fontDirectory as unknown as ReadonlyArray<FontDirectoryEntry>

const fontById = new Map<string, FontDirectoryEntry>(fontDirectoryEntries.map(entry => [entry.id, entry]))

const versionCache = new Map<string, { latest?: string; latestVariable?: string }>()
const cssCache = new Map<string, string>()

const normalizeFontName = (value: string) =>
    value
        .toLowerCase()
        .replace(/["']/g, '')
        .replace(/[_\s]+/g, '-')
        .replace(/-+/g, '-')
        .trim()

const fontByFamily = new Map<string, FontDirectoryEntry>(
    fontDirectoryEntries.map(entry => [normalizeFontName(entry.family), entry]),
)

const ensureArray = <T>(value: T | readonly T[] | null | undefined): T[] => {
    if (value == null) return []
    return Array.isArray(value) ? Array.from(value) : [value as T]
}

const isVariableConfig = (font: FontConfig) => font.variable === true

const getFontEntry = (name: string) => {
    if (!name) return null
    const normalized = normalizeFontName(name)
    return fontById.get(normalized) || fontByFamily.get(normalized) || null
}

const isValidNpmVersion = (value?: string | null) => {
    if (!value) return false
    if (value === 'latest') return true
    return /^\d+\.\d+\.\d+/.test(value)
}

const fetchJson = async (url: string): Promise<any> => {
    const response = await fetch(url)
    if (!response.ok) {
        throw new Error(`Fontsource request failed: ${response.status} ${response.statusText} (${url})`)
    }
    return response.json()
}

const resolveNpmVersion = async (id: string, variable: boolean, version?: string) => {
    if (isValidNpmVersion(version)) return version
    const cached = versionCache.get(id)
    if (cached) {
        return variable ? cached.latestVariable || cached.latest || 'latest' : cached.latest || 'latest'
    }
    const data = await fetchJson(`${API_BASE}/v1/version/${id}`)
    versionCache.set(id, data)
    return variable ? data.latestVariable || data.latest || 'latest' : data.latest || 'latest'
}

const resolveSubsets = (font: FontConfig, entry?: FontDirectoryEntry | null) => {
    const subsets = ensureArray(font.subsets)
    if (subsets.length) return subsets
    if (entry?.defSubset) return [entry.defSubset]
    return entry?.subsets?.length ? Array.from(entry.subsets) : []
}

const resolveWeights = (font: FontConfig, entry?: FontDirectoryEntry | null) => {
    const weights = ensureArray((font as FontConfigStatic).weights as Array<string | number> | undefined)
    if (weights.length) return weights
    return entry?.weights?.length ? Array.from(entry.weights) : []
}

const resolveStyles = (font: FontConfig, entry?: FontDirectoryEntry | null) => {
    const styles = ensureArray((font as FontConfigStatic).styles)
    if (styles.length) return styles
    return entry?.styles?.length ? Array.from(entry.styles) : []
}

const buildStaticCssFiles = (subsets: string[], weights: Array<string | number>, styles: string[]) => {
    const files = []
    const hasSubsets = subsets.length > 0
    const normalizedWeights = weights.length ? weights : ['400']
    const normalizedStyles = styles.length ? styles : ['normal']

    for (const weight of normalizedWeights) {
        const weightValue = String(weight)
        for (const style of normalizedStyles) {
            const styleSuffix = style && style !== 'normal' ? `-${style}` : ''
            if (hasSubsets) {
                for (const subset of subsets) {
                    files.push(`${subset}-${weightValue}${styleSuffix}.css`)
                }
            } else {
                files.push(`${weightValue}${styleSuffix}.css`)
            }
        }
    }

    return files
}

const buildVariableCssFiles = (_font?: FontConfig) => {
    return ['index.css']
}

const buildCssFiles = (font: FontConfig, entry?: FontDirectoryEntry | null) => {
    if (isVariableConfig(font)) {
        return buildVariableCssFiles(font)
    }
    const subsets = resolveSubsets(font, entry)
    const weights = resolveWeights(font, entry)
    const styles = resolveStyles(font, entry)
    return buildStaticCssFiles(subsets, weights, styles)
}

const buildPackageName = (font: FontConfig, entry?: FontDirectoryEntry | null) => {
    const id = entry?.id ?? normalizeFontName(font.name)
    return font.variable ? `@fontsource-variable/${id}` : `@fontsource/${id}`
}

const resolveTokenFamily = (font: FontConfig, entry?: FontDirectoryEntry | null) => {
    if (!entry) return font.name
    if (font.variable && entry.family.startsWith('Material Symbols')) {
        return `${entry.family} Variable`
    }
    return entry.family
}

const toVariationSettings = (axes: FontVariableAxes | undefined) => {
    if (!axes) return null
    const pairs = []
    for (const [axis, rawValue] of Object.entries(axes)) {
        if (axis === 'wght' || axis === 'wdth' || axis === 'ital') continue
        const value = Array.isArray(rawValue) ? rawValue[0] : rawValue
        if (value === undefined) continue
        pairs.push(`"${axis}" ${value}`)
    }
    return pairs.length ? pairs.join(', ') : null
}

const updateDeclaration = (block: string, property: string, value: string) => {
    const pattern = new RegExp(`${property}\\s*:[^;]*;`, 'i')
    if (pattern.test(block)) {
        return block.replace(pattern, `${property}: ${value};`)
    }
    return block.replace(/}\s*$/, `  ${property}: ${value};\n}`)
}

const applyVariableAxes = (block: string, axes?: FontVariableAxes) => {
    if (!axes) return block
    let next = block

    if (axes.wght !== undefined) {
        const value = Array.isArray(axes.wght) ? `${axes.wght[0]} ${axes.wght[1]}` : `${axes.wght}`
        next = updateDeclaration(next, 'font-weight', value)
    }

    if (axes.wdth !== undefined) {
        const value = Array.isArray(axes.wdth)
            ? `${axes.wdth[0]}% ${axes.wdth[1]}%`
            : `${axes.wdth}%`
        next = updateDeclaration(next, 'font-stretch', value)
    }

    if (axes.ital !== undefined) {
        const value = axes.ital === 1 ? 'italic' : 'normal'
        next = updateDeclaration(next, 'font-style', value)
    }

    const variationSettings = toVariationSettings(axes)
    if (variationSettings) {
        next = updateDeclaration(next, 'font-variation-settings', variationSettings)
    }

    return next
}

const rewriteFontFace = (
    block: string,
    cssUrl: string,
    downloads: Map<string, string>,
    axes?: FontVariableAxes,
    fontFolder?: string,
) => {
    const replaced = block.replace(/url\(([^)]+)\)/g, (match, rawUrl) => {
        const cleaned = rawUrl.trim().replace(/^['"]|['"]$/g, '')
        const resolvedUrl = new URL(cleaned, cssUrl)
        const filename = path.basename(resolvedUrl.pathname)
        const targetPath = fontFolder ? `${fontFolder}/${filename}` : filename
        downloads.set(resolvedUrl.href, targetPath)
        return `url("./fonts/${targetPath}")`
    })
    return applyVariableAxes(replaced, axes)
}

const fetchCss = async (url: string) => {
    const cached = cssCache.get(url)
    if (cached) return cached
    const response = await fetch(url)
    if (!response.ok) {
        throw new Error(`Fontsource CSS fetch failed: ${response.status} ${response.statusText} (${url})`)
    }
    const text = await response.text()
    cssCache.set(url, text)
    return text
}

const fetchFontFiles = async (downloads: Map<string, string>, fontsDir: string) => {
    if (!downloads.size) return
    await fs.mkdir(fontsDir, { recursive: true })

    for (const [url, filename] of downloads.entries()) {
        const filePath = path.join(fontsDir, filename)
        try {
            await fs.access(filePath)
            continue
        } catch {
            // file doesn't exist
        }
        const response = await fetch(url)
        if (!response.ok) {
            throw new Error(`Fontsource download failed: ${response.status} ${response.statusText} (${url})`)
        }
        const buffer = Buffer.from(await response.arrayBuffer())
        await fs.writeFile(filePath, buffer)
    }
}

const readTextIfExists = async (filePath: string) => {
    try {
        return await fs.readFile(filePath, 'utf-8')
    } catch {
        return null
    }
}

const writeTextFile = async (filePath: string, text: string) => {
    await fs.mkdir(path.dirname(filePath), { recursive: true })
    await fs.writeFile(filePath, text)
}

const buildFontFolderName = (id: string, version: string, variable: boolean) =>
    `${id}-${version}${variable ? '-variable' : ''}`

const parseVersionFromFolder = (id: string, folderName: string, variable: boolean) => {
    const prefix = `${id}-`
    const suffix = variable ? '-variable' : ''
    if (!folderName.startsWith(prefix)) return null
    if (suffix && !folderName.endsWith(suffix)) return null
    const raw = folderName.slice(prefix.length, suffix ? -suffix.length : undefined)
    return raw || null
}

const compareSemver = (a: string, b: string) => {
    const aParts = a.split('.').map(v => Number(v))
    const bParts = b.split('.').map(v => Number(v))
    const length = Math.max(aParts.length, bParts.length)
    for (let i = 0; i < length; i += 1) {
        const aVal = Number.isFinite(aParts[i]) ? aParts[i] : 0
        const bVal = Number.isFinite(bParts[i]) ? bParts[i] : 0
        if (aVal !== bVal) return aVal - bVal
    }
    return 0
}

const findCachedVersion = async (fontsDir: string, id: string, variable: boolean) => {
    try {
        const entries = await fs.readdir(fontsDir, { withFileTypes: true })
        const versions = entries
            .filter(entry => entry.isDirectory())
            .map(entry => parseVersionFromFolder(id, entry.name, variable))
            .filter((value): value is string => Boolean(value))
        if (!versions.length) return null
        versions.sort(compareSemver)
        return versions[versions.length - 1] ?? null
    } catch {
        return null
    }
}

const mergeFontTokens = (api: BossServerApi, tokens: Record<string, string>) => {
    if (!tokens || Object.keys(tokens).length === 0) return

    const existing = api.tokens
    if (typeof existing === 'function') {
        api.tokens = (valueMap: unknown) => {
            const base = existing(valueMap) as Record<string, unknown> | undefined
            const font = { ...((base?.font as Record<string, unknown> | undefined) ?? {}), ...tokens }
            return { ...(base ?? {}), font }
        }
        return
    }

    const existingRecord = (existing ?? {}) as Record<string, unknown>
    const existingFont = (existingRecord.font ?? {}) as Record<string, unknown>
    api.tokens = { ...existingRecord, font: { ...existingFont, ...tokens } }
}

const addFontFaceBlocks = (
    api: BossServerApi,
    cssText: string,
    cssUrl: string,
    downloads: Map<string, string>,
    axes?: FontVariableAxes,
    fontFolder?: string,
) => {
    const blocks = cssText.match(/@font-face\s*{[^}]*}/g) || []
    for (const block of blocks) {
        const next = rewriteFontFace(block, cssUrl, downloads, axes, fontFolder)
        api.css.addRule(next.trim())
    }
}

export const onBoot: Plugin<'onBoot'> = async api => {
    if (api.runtime?.only && api.runtime?.globals === 'none') return
    const fonts = api.fonts
    if (!Array.isArray(fonts) || fonts.length === 0) return

    const importUrls: string[] = []
    const importSet = new Set<string>()
    const downloads = new Map<string, string>()
    const stylesDir = api.stylesheetPath
        ? path.dirname(api.stylesheetPath)
        : path.join(process.cwd(), api.folder ?? '.bo$$')
    const fontsDir = path.join(stylesDir, 'fonts')
    const fontTokens: Record<string, string> = {}

    for (const font of fonts as FontConfig[]) {
        if (!font?.name) continue
        const entry = getFontEntry(font.name)
        const id = entry?.id ?? normalizeFontName(font.name)
        const packageName = buildPackageName(font, entry)
        const isLocal = font.delivery === 'local'
        let npmVersion = isValidNpmVersion(font.version) ? font.version : null
        if (!npmVersion && isLocal) {
            const cachedVersion = await findCachedVersion(fontsDir, id, font.variable === true)
            if (isValidNpmVersion(cachedVersion)) {
                npmVersion = cachedVersion
            }
        }
        if (!npmVersion) {
            npmVersion = await resolveNpmVersion(id, font.variable === true, font.version)
        }
        const resolvedVersion = npmVersion ?? 'latest'
        const cssFiles = buildCssFiles(font, entry)
        const axes = font.variable ? font.variableAxes : undefined
        const fontFolder = isLocal ? buildFontFolderName(id, resolvedVersion, font.variable === true) : null

        if (font.token) {
            fontTokens[font.token] = resolveTokenFamily(font, entry)
        }

        for (const file of cssFiles) {
            const cssUrl = `${CDN_NPM_BASE}/${packageName}@${resolvedVersion}/${file}`
            if (isLocal) {
                const cachePath = path.join(fontsDir, fontFolder ?? '', file)
                let cssText = await readTextIfExists(cachePath)
                if (!cssText) {
                    cssText = await fetchCss(cssUrl)
                    await writeTextFile(cachePath, cssText)
                }
                addFontFaceBlocks(api, cssText, cssUrl, downloads, axes, fontFolder ?? undefined)
            } else {
                if (!importSet.has(cssUrl)) {
                    importSet.add(cssUrl)
                    importUrls.push(cssUrl)
                }
            }
        }
    }

    for (const url of importUrls) {
        api.css.addImport(url)
    }

    mergeFontTokens(api, fontTokens)
    await fetchFontFiles(downloads, fontsDir)
}
