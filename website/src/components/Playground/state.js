import { decompressFromEncodedURIComponent } from 'lz-string'
import {
    collectFoldersFromFiles,
    normalizeFileMapKeys,
    normalizeFilePath,
} from './utils'

const BOSS_CONFIG_PATTERN = /^(?:src\/)?\.bo\$\$\/config\.(?:js|cjs|mjs|ts)$/
const PNPM_LOCKFILE = 'pnpm-lock.yaml'

export const isBossConfigPath = filePath => BOSS_CONFIG_PATTERN.test(normalizeFilePath(filePath || ''))

const isBossGeneratedPath = filePath => {
    const normalized = normalizeFilePath(filePath || '')
    if (!normalized) return false
    if (normalized === '.bo$$' || normalized === 'src/.bo$$') return true
    return normalized.startsWith('.bo$$/') || normalized.startsWith('src/.bo$$/')
}

export const filterSharedFiles = files => {
    const normalized = normalizeFileMapKeys(files)
    const next = {}
    Object.entries(normalized).forEach(([path, contents]) => {
        if (path === PNPM_LOCKFILE) return
        if (isBossGeneratedPath(path) && !isBossConfigPath(path)) return
        next[path] = contents
    })
    return next
}

export const getDefaultOpenFile = (files, preferred) => {
    if (preferred && files[preferred]) return preferred
    return Object.keys(files)[0]
}

export const decodeState = hash => {
    if (!hash || !hash.startsWith('#state=')) return null
    const payload = hash.replace('#state=', '')
    const decoded = decompressFromEncodedURIComponent(payload)
    if (!decoded) return null
    try {
        return JSON.parse(decoded)
    } catch (error) {
        console.error('Failed to parse shared state', error)
        return null
    }
}

export const decodeTemplateId = hash => {
    if (!hash || hash.startsWith('#state=')) return null
    const payload = hash.startsWith('#') ? hash.slice(1) : hash
    if (!payload) return null
    const params = new URLSearchParams(payload)
    const templateId = params.get('template')
    return templateId && templateId.trim() ? templateId.trim() : null
}

export const normalizeTerminalTabs = tabs => {
    const normalized = Array.isArray(tabs) ? tabs.filter(Boolean) : []
    const withKind = normalized.map(tab => ({
        kind: tab.id === 'dev' ? 'dev' : 'shell',
        title: tab.title || (tab.id === 'dev' ? 'Dev' : 'Shell'),
        ...tab,
    }))
    const hasDev = withKind.some(tab => tab.id === 'dev')
    if (!hasDev) {
        withKind.unshift({ id: 'dev', title: 'Dev', kind: 'dev' })
    }
    return withKind
}

const buildTemplateBasenameMap = templateFiles => {
    const map = new Map()
    Object.keys(templateFiles || {}).forEach(path => {
        const basename = path.split('/').pop()
        if (!basename) return
        if (!map.has(basename)) {
            map.set(basename, [path])
            return
        }
        map.get(basename).push(path)
    })
    return map
}

const pickTemplatePath = (paths = []) => {
    if (!paths.length) return null
    if (paths.length === 1) return paths[0]
    const sorted = [...paths].sort((a, b) => a.length - b.length || a.localeCompare(b))
    return sorted[0]
}

const applyTemplateOverlay = (rawFiles, templateFiles) => {
    const normalizedRaw = normalizeFileMapKeys(rawFiles)
    const template = normalizeFileMapKeys(templateFiles)
    const result = { ...template }
    const basenameMap = buildTemplateBasenameMap(template)
    const rootBasenames = new Set(
        Object.keys(template)
            .filter(path => !path.includes('/'))
            .map(path => path.split('/').pop())
            .filter(Boolean),
    )

    Object.entries(normalizedRaw).forEach(([path, contents]) => {
        if (template[path]) {
            result[path] = contents
            return
        }
        if (!path.includes('/')) {
            const basename = path.split('/').pop()
            if (basename && basenameMap.has(basename)) {
                if (rootBasenames.has(basename)) {
                    result[path] = contents
                    return
                }
                const candidates = basenameMap
                    .get(basename)
                    .filter(candidate => candidate.includes('/'))
                const target = pickTemplatePath(candidates)
                if (target) {
                    result[target] = contents
                    return
                }
            }
        }
        result[path] = contents
    })

    return result
}

export const buildInitialState = (baseProject, openFile, { rawState, templateId } = {}) => {
    const raw = rawState ?? (typeof window !== 'undefined' ? decodeState(window.location.hash) : null)
    const normalizedTemplateId = raw?.templateId === 'boss' ? 'boss-basic' : raw?.templateId
    const rawFiles = raw?.files && typeof raw.files === 'object' ? filterSharedFiles(raw.files) : null
    const rawFolders = Array.isArray(raw?.folders)
        ? raw.folders.map(folder => normalizeFilePath(folder)).filter(Boolean)
        : []
    const templateFiles = normalizeFileMapKeys(baseProject.files)
    let resolvedTemplateFiles = templateFiles
    const rawPackage = rawFiles?.['package.json']
    const templatePackage = templateFiles['package.json']
    if (rawPackage && templatePackage && rawPackage.trim() !== templatePackage.trim()) {
        resolvedTemplateFiles = { ...templateFiles }
        delete resolvedTemplateFiles[PNPM_LOCKFILE]
    }
    const files = rawFiles
        ? applyTemplateOverlay(rawFiles, resolvedTemplateFiles)
        : normalizeFileMapKeys(resolvedTemplateFiles)
    const hasBossConfig = Object.keys(files).some(path => isBossConfigPath(path))
    const folders = [...new Set([...rawFolders, ...collectFoldersFromFiles(files)])].filter(folder => {
        const normalized = normalizeFilePath(folder)
        if (normalized === '.bo$$' || normalized === 'src/.bo$$') {
            return hasBossConfig
        }
        if (normalized.startsWith('.bo$$/') || normalized.startsWith('src/.bo$$/')) {
            return false
        }
        return true
    })
    const preferredActive = raw?.activeFile
    const activeFile = files[preferredActive] ? preferredActive : getDefaultOpenFile(files, openFile)
    const openFiles = Array.isArray(raw?.openFiles) ? raw.openFiles.filter(path => files[path]) : []
    const ensuredOpenFiles = openFiles.length ? openFiles : [activeFile]
    const dirtyFiles = new Set(Array.isArray(raw?.dirtyFiles) ? raw.dirtyFiles.filter(path => files[path]) : [])
    const ui = raw?.ui || {}
    const sizes = raw?.sizes || {}
    const terminalTabs = normalizeTerminalTabs(raw?.terminalTabs)
    const activeTerminalId = terminalTabs.some(tab => tab.id === raw?.activeTerminalId) ? raw.activeTerminalId : 'dev'

    return {
        fromHash: Boolean(raw),
        templateId: normalizedTemplateId || templateId || (raw ? 'custom' : 'boss-basic'),
        files,
        folders,
        activeFile,
        openFiles: ensuredOpenFiles,
        dirtyFiles,
        terminalTabs,
        activeTerminalId,
        showSidebar: ui.showSidebar ?? true,
        showEditor: ui.showEditor ?? true,
        showPreview: ui.showPreview ?? true,
        showTerminal: ui.showTerminal ?? true,
        sidebarWidth: Number.isFinite(sizes.sidebarWidth) ? sizes.sidebarWidth : 220,
        previewWidth: Number.isFinite(sizes.previewWidth) ? sizes.previewWidth : 340,
        terminalHeight: Number.isFinite(sizes.terminalHeight) ? sizes.terminalHeight : 180,
    }
}
