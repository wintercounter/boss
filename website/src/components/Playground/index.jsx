import React, { useEffect, useMemo, useRef, useState } from 'react'
import { WebContainer } from '@webcontainer/api'
import { Terminal } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import { compressToEncodedURIComponent } from 'lz-string'
import 'xterm/css/xterm.css'
import styles from './styles.module.css'
import { createBossProject, templates as templateCatalog } from './template'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import {
    FilePlusIcon,
    FolderPlusIcon,
    LayoutPanelLeftIcon,
    MonitorIcon,
    PanelBottomIcon,
    PanelRightIcon,
    RefreshCcwIcon,
    Share2Icon,
} from 'lucide-react'
import {
    DEFAULT_DEV,
    DEFAULT_HEIGHT,
    DEFAULT_INIT,
    DEFAULT_INSTALL,
    DEFAULT_OPEN_FILE,
    MIN_PREVIEW,
    MIN_SIDEBAR,
    MIN_TERMINAL,
    MONACO_BASE,
} from './constants'
import FileTree from './FileTree'
import EditorTabs from './EditorTabs'
import TerminalPanel from './TerminalPanel'
import {
    buildInitialState,
    decodeState,
    decodeTemplateId,
    filterSharedFiles,
    getDefaultOpenFile,
    isBossConfigPath,
} from './state'
import {
    cloneFiles,
    collectFoldersFromFiles,
    decodeFsName,
    formatStatus,
    getStatusTone,
    inferLanguage,
    normalizeFileMapKeys,
    normalizeFilePath,
    shouldIgnorePath,
    toFileTree,
} from './utils'

let sharedWebcontainer = null
let sharedWebcontainerPromise = null
let sharedTeardownPromise = null

const ensureWebcontainer = async () => {
    if (sharedTeardownPromise) {
        await sharedTeardownPromise
    }

    if (sharedWebcontainer) return sharedWebcontainer

    if (!sharedWebcontainerPromise) {
        sharedWebcontainerPromise = WebContainer.boot()
            .then(container => {
                sharedWebcontainer = container
                return container
            })
            .catch(error => {
                sharedWebcontainer = null
                throw error
            })
            .finally(() => {
                sharedWebcontainerPromise = null
            })
    }

    return sharedWebcontainerPromise
}

const teardownSharedWebcontainer = async () => {
    if (sharedWebcontainerPromise) {
        await sharedWebcontainerPromise
    }

    const current = sharedWebcontainer
    if (!current) return
    sharedWebcontainer = null
    sharedTeardownPromise = Promise.resolve(current.teardown?.())
        .catch(error => {
            console.warn('Playground teardown failed', error)
        })
        .finally(() => {
            sharedTeardownPromise = null
        })
    return sharedTeardownPromise
}

const isProxyReleasedError = error => {
    const message = String(error?.message || error || '')
    return message.includes('Proxy has been released') || message.includes('released and is not useable')
}

const withCacheBust = url => {
    if (!url) return url
    const separator = url.includes('?') ? '&' : '?'
    return `${url}${separator}t=${Date.now()}`
}

const loadMonaco = () => {
    if (typeof window === 'undefined') return Promise.reject(new Error('No window'))
    if (window.monaco) return Promise.resolve(window.monaco)
    if (window.__bossMonacoPromise) return window.__bossMonacoPromise

    const bases = [MONACO_BASE, 'https://cdn.jsdelivr.net/npm/monaco-editor@0.55.1/min'].filter(
        (value, index, array) => array.indexOf(value) === index,
    )

    const attemptLoad = base =>
        new Promise((resolve, reject) => {
            const loaderUrl = `${base}/vs/loader.js`
            const script = document.createElement('script')
            script.src = loaderUrl
            script.async = true
            script.onload = () => {
                if (!window.require) {
                    reject(new Error('Monaco loader did not expose window.require'))
                    return
                }
                window.MonacoEnvironment = {
                    getWorkerUrl(_moduleId, _label) {
                        const workerSource = `self.MonacoEnvironment = { baseUrl: '${base}/' };importScripts('${base}/vs/base/worker/workerMain.js');`
                        return `data:text/javascript;charset=utf-8,${encodeURIComponent(workerSource)}`
                    },
                }

                window.require.config({ paths: { vs: `${base}/vs` } })
                window.require(
                    [
                        'vs/editor/editor.main',
                        'vs/language/typescript/monaco.contribution',
                        'vs/basic-languages/monaco.contribution',
                    ],
                    () => {
                        resolve(window.monaco)
                    },
                )
            }
            script.onerror = () => reject(new Error(`Failed to load Monaco from ${base}`))
            document.head.appendChild(script)
        })

    window.__bossMonacoPromise = bases.reduce(
        (promise, base) => promise.catch(() => attemptLoad(base)),
        Promise.reject(new Error('Monaco load failed')),
    )

    return window.__bossMonacoPromise
}

const rehomeFlatFiles = (files, templateFiles) => {
    const normalized = normalizeFileMapKeys(files)
    const template = normalizeFileMapKeys(templateFiles)
    const rootBasenames = new Set(
        Object.keys(template)
            .filter(path => !path.includes('/'))
            .map(path => path.split('/').pop())
            .filter(Boolean),
    )
    const candidates = new Map()
    Object.keys(template).forEach(path => {
        const basename = path.split('/').pop()
        if (!basename) return
        if (!candidates.has(basename)) {
            candidates.set(basename, [path])
            return
        }
        candidates.get(basename).push(path)
    })

    let changed = false
    const next = {}
    Object.entries(normalized).forEach(([path, contents]) => {
        if (!path.includes('/')) {
            const basename = path
            const options = candidates.get(basename) || []
            const nested = options.filter(option => option.includes('/'))
            if (!rootBasenames.has(basename) && nested.length) {
                const target = nested.sort((a, b) => a.length - b.length || a.localeCompare(b))[0]
                if (target && target !== path) {
                    next[target] = contents
                    changed = true
                    return
                }
            }
        }
        next[path] = contents
    })
    return { files: next, changed }
}

const ensureBossConfigTokens = async (webcontainer, updateFile, options = {}) => {
    const { skipTokens = false } = options
    const configPath = 'src/.bo$$/config.js'
    let content = null
    try {
        content = await webcontainer.fs.readFile(configPath, 'utf8')
    } catch (error) {
        return
    }
    if (typeof content !== 'string' || !content.includes('export default')) return
    // Ensure we don't accidentally store the variable family name in config,
    // otherwise the fontsource API lookup fails.
    content = content.replaceAll('Material Symbols Rounded Variable', 'Material Symbols Rounded')

    const findMatchingBracket = (source, startIndex) => {
        let depth = 0
        for (let i = startIndex; i < source.length; i += 1) {
            const char = source[i]
            if (char === '[') depth += 1
            if (char === ']') {
                depth -= 1
                if (depth === 0) return i
            }
        }
        return -1
    }

    const injectFontEntry = (source, matchText, entryLines) => {
        if (!source.includes('fonts:') || source.includes(matchText)) return source
        const fontsIndex = source.indexOf('fonts:')
        const openIndex = source.indexOf('[', fontsIndex)
        if (openIndex === -1) return source
        const closeIndex = findMatchingBracket(source, openIndex)
        if (closeIndex === -1) return source
        const lineStart = source.lastIndexOf('\n', fontsIndex) + 1
        const baseIndent = source.slice(lineStart, fontsIndex).match(/^\s*/)?.[0] ?? ''
        const entryIndent = `${baseIndent}    `
        const trimmedBefore = source.slice(0, closeIndex).trimEnd()
        const needsComma =
            trimmedBefore[trimmedBefore.length - 1] !== '[' && trimmedBefore[trimmedBefore.length - 1] !== ','
        const entryText = entryLines
            .split('\n')
            .map(line => `${entryIndent}${line}`)
            .join('\n')
        const insertion = `${needsComma ? ',' : ''}\n${entryText}\n${baseIndent}`
        return `${source.slice(0, closeIndex)}${insertion}${source.slice(closeIndex)}`
    }

    const additions = []
    if (!content.includes('fonts:')) {
        additions.push(`    fonts: [
        {
            name: 'Space Grotesk',
            token: 'brand',
            weights: [400, 500, 600, 700],
            subsets: ['latin'],
        },
        {
            name: 'Material Symbols Rounded',
            token: 'icon',
            variable: true,
            variableAxes: { FILL: 0, GRAD: 0, opsz: 20 },
            subsets: ['latin'],
        },
    ],`)
    } else {
        content = injectFontEntry(
            content,
            'Space Grotesk',
            `{
    name: 'Space Grotesk',
    token: 'brand',
    weights: [400, 500, 600, 700],
    subsets: ['latin'],
}`,
        )
        content = injectFontEntry(
            content,
            'Material Symbols Rounded',
            `{
    name: 'Material Symbols Rounded',
    token: 'icon',
    variable: true,
    variableAxes: { FILL: 0, GRAD: 0, opsz: 20 },
    subsets: ['latin'],
}`,
        )
    }
    if (!skipTokens && !content.includes('tokens:')) {
        additions.push(`    tokens: {
        color: {
            surface: {
                900: '#0b0e14',
                800: '#111827',
                700: '#1f2937',
                600: '#334155',
            },
            ink: {
                100: '#f8fafc',
                200: '#e2e8f0',
                400: '#94a3b8',
                500: '#64748b',
            },
            accent: {
                500: '#38bdf8',
                400: '#7dd3fc',
                300: '#bae6fd',
            },
            teal: {
                400: '#2dd4bf',
                500: '#14b8a6',
            },
        },
        background: {
            hero: 'radial-gradient(circle at top, rgba(56, 189, 248, 0.35) 0%, rgba(11, 14, 20, 0.9) 55%), linear-gradient(135deg, #0b0e14 0%, #111827 45%, #0b0e14 100%)',
        },
        borderRadius: {
            sm: 10,
            md: 14,
            lg: 18,
            xl: 24,
            pill: 999,
        },
        boxShadow: {
            soft: '0 12px 32px rgba(2, 6, 23, 0.45)',
            lift: '0 18px 45px rgba(2, 6, 23, 0.6)',
        },
    },`)
    }

    if (!additions.length) return

    const nextContent = content.replace('export default {', `export default {\n${additions.join('\n')}`)

    if (nextContent === content) return

    try {
        await webcontainer.fs.writeFile(configPath, nextContent)
        updateFile(configPath, nextContent)
    } catch (error) {
        // ignore
    }
}

const getDefaultCollapsedFolders = folders => {
    const next = new Set()
    ;(folders || []).forEach(folder => {
        const normalized = normalizeFilePath(folder)
        if (!normalized || normalized === 'src') return
        next.add(normalized)
    })
    return next
}

const MOBILE_PANEL_ORDER = ['editor', 'preview', 'sidebar', 'terminal']

const getInitialMobilePanel = ({ showSidebar, showEditor, showTerminal, showPreview }) => {
    if (showEditor) return 'editor'
    if (showPreview) return 'preview'
    if (showSidebar) return 'sidebar'
    if (showTerminal) return 'terminal'
    return 'editor'
}

export default function Playground({ appCode, files, openFile, height = DEFAULT_HEIGHT, lazy = true, className }) {
    const defaultTemplateId =
        templateCatalog.find(template => template.id === 'boss-basic')?.id || templateCatalog[0]?.id || 'boss-basic'
    const hashState = useMemo(() => (typeof window !== 'undefined' ? decodeState(window.location.hash) : null), [])
    const hashTemplateId = useMemo(
        () => (typeof window !== 'undefined' ? decodeTemplateId(window.location.hash) : null),
        [],
    )
    const initialTemplateId = useMemo(() => {
        const rawTemplateId = hashState?.templateId === 'boss' ? 'boss-basic' : hashState?.templateId
        const candidate = rawTemplateId || hashTemplateId || defaultTemplateId
        return templateCatalog.some(template => template.id === candidate) ? candidate : defaultTemplateId
    }, [defaultTemplateId, hashState, hashTemplateId])
    const resolvedOpenFile =
        openFile || templateCatalog.find(template => template.id === initialTemplateId)?.openFile || DEFAULT_OPEN_FILE
    const baseProject = useMemo(
        () => createBossProject({ templateId: initialTemplateId, files, appCode }),
        [initialTemplateId, files, appCode],
    )
    const initialState = useMemo(
        () => buildInitialState(baseProject, resolvedOpenFile, { rawState: hashState, templateId: initialTemplateId }),
        [baseProject, resolvedOpenFile, hashState, initialTemplateId],
    )

    const [status, setStatus] = useState('idle')
    const [activeFile, setActiveFile] = useState(initialState.activeFile)
    const [previewUrl, setPreviewUrl] = useState('')
    const [isIsolated, setIsIsolated] = useState(null)
    const [templateId, setTemplateId] = useState(initialState.templateId)
    const [fileMap, setFileMap] = useState(() => initialState.files)
    const [folderSet, setFolderSet] = useState(() => new Set(initialState.folders))
    const [openFiles, setOpenFiles] = useState(() => initialState.openFiles)
    const [dirtyFiles, setDirtyFiles] = useState(() => initialState.dirtyFiles)
    const [savePulse, setSavePulse] = useState(false)
    const [shareCopied, setShareCopied] = useState(false)
    const [terminalTabs, setTerminalTabs] = useState(() => initialState.terminalTabs)
    const [activeTerminalId, setActiveTerminalId] = useState(initialState.activeTerminalId)
    const [containerReady, setContainerReady] = useState(false)
    const [workspaceKey, setWorkspaceKey] = useState(0)
    const [showSidebar, setShowSidebar] = useState(initialState.showSidebar)
    const [showEditor, setShowEditor] = useState(initialState.showEditor)
    const [showPreview, setShowPreview] = useState(initialState.showPreview)
    const [showTerminal, setShowTerminal] = useState(initialState.showTerminal)
    const [activeMobilePanel, setActiveMobilePanel] = useState(() =>
        getInitialMobilePanel({
            showSidebar: initialState.showSidebar,
            showEditor: initialState.showEditor,
            showTerminal: initialState.showTerminal,
            showPreview: initialState.showPreview,
        }),
    )
    const [sidebarWidth, setSidebarWidth] = useState(initialState.sidebarWidth)
    const [previewWidth, setPreviewWidth] = useState(initialState.previewWidth)
    const [terminalHeight, setTerminalHeight] = useState(initialState.terminalHeight)
    const [collapsedFolders, setCollapsedFolders] = useState(() => getDefaultCollapsedFolders(initialState.folders))
    const [dragOverPath, setDragOverPath] = useState(null)
    const showCenterPane = showEditor || showTerminal

    const workspaceRef = useRef(null)
    const editorRef = useRef(null)
    const terminalContainersRef = useRef(new Map())
    const terminalInstancesRef = useRef(new Map())
    const terminalOutputBufferRef = useRef(new Map())
    const terminalProcessesRef = useRef(new Map())
    const terminalInputAttachedRef = useRef(new WeakSet())
    const terminalOutputAttachedRef = useRef(new WeakSet())
    const terminalSpawningRef = useRef(new Set())
    const dragRef = useRef(null)
    const updateFile = (filePath, content) => {
        fileCacheRef.current.set(filePath, content)
        setFileMap(prev => ({ ...prev, [filePath]: content }))
        setFolderSet(prev => {
            const next = new Set(prev)
            const parts = filePath.split('/')
            parts.pop()
            let current = ''
            for (const part of parts) {
                current = current ? `${current}/${part}` : part
                if (current) next.add(current)
            }
            return next
        })
    }
    const dragListenersRef = useRef({ move: null, up: null })
    const monacoRef = useRef(null)
    const monacoEditorRef = useRef(null)
    const webcontainerRef = useRef(null)
    const modelsRef = useRef(new Map())
    const fileMapRef = useRef(fileMap)
    const fileCacheRef = useRef(new Map(Object.entries(initialState.files)))
    const dirtyFilesRef = useRef(dirtyFiles)
    const folderSetRef = useRef(folderSet)
    const writeTimerRef = useRef(null)
    const bootPromiseRef = useRef(null)
    const shouldRunRef = useRef(true)
    const hasBootedOnceRef = useRef(false)
    const activeFileRef = useRef(activeFile)
    const suppressEditorChangeRef = useRef(false)
    const savePulseTimerRef = useRef(null)
    const persistTimerRef = useRef(null)
    const sharePulseTimerRef = useRef(null)
    const fsSyncTimerRef = useRef(null)
    const fsSyncingRef = useRef(false)
    const fsSyncPendingRef = useRef(false)
    const terminalCounterRef = useRef(1)
    const bossTypesRef = useRef({ tsLib: null, jsLib: null, value: '' })

    const normalizeInitCommand = command => {
        if (!command || !Array.isArray(command.args)) return command
        const args = [...command.args]
        const bossIndex = args.indexOf('boss-css')
        const initIndex = args.indexOf('init')
        if (bossIndex !== -1 && initIndex !== -1) {
            const overwriteIndex = args.indexOf('--overwrite')
            if (overwriteIndex === -1) {
                args.push('--overwrite', 'false')
            } else if (!args[overwriteIndex + 1] || args[overwriteIndex + 1].startsWith('-')) {
                args.splice(overwriteIndex + 1, 0, 'false')
            }
        }
        return { ...command, args }
    }

    const normalizeCommand = (value, fallback, { forceInitDefaults = false } = {}) => {
        if (value && typeof value.command === 'string' && Array.isArray(value.args)) {
            return forceInitDefaults ? normalizeInitCommand(value) : value
        }
        return forceInitDefaults ? normalizeInitCommand(fallback) : fallback
    }

    const templates = useMemo(
        () =>
            templateCatalog.map(template => ({
                ...template,
                files: cloneFiles(template.files),
                init: normalizeCommand(template.init, DEFAULT_INIT, { forceInitDefaults: true }),
                dev: normalizeCommand(template.dev, DEFAULT_DEV),
                install: normalizeCommand(template.install, DEFAULT_INSTALL),
            })),
        [],
    )
    const templateOptions = useMemo(() => {
        if (templates.some(template => template.id === templateId)) return templates
        return [
            {
                id: templateId,
                label: 'Custom',
                description: 'Loaded from URL',
                files: fileMap,
            },
            ...templates,
        ]
    }, [templates, templateId, fileMap])

    const panelToggles = useMemo(() => {
        const next = []
        if (showSidebar) next.push('sidebar')
        if (showEditor) next.push('editor')
        if (showTerminal) next.push('terminal')
        if (showPreview) next.push('preview')
        return next
    }, [showSidebar, showEditor, showTerminal, showPreview])

    const mobilePanelTabs = useMemo(
        () => [
            { id: 'sidebar', label: 'Explorer', icon: LayoutPanelLeftIcon, enabled: showSidebar },
            { id: 'editor', label: 'Editor', icon: MonitorIcon, enabled: showEditor },
            { id: 'terminal', label: 'Terminal', icon: PanelBottomIcon, enabled: showTerminal },
            { id: 'preview', label: 'Preview', icon: PanelRightIcon, enabled: showPreview },
        ],
        [showSidebar, showEditor, showTerminal, showPreview],
    )

    const handlePanelToggle = values => {
        if (!values.length) return
        setShowSidebar(values.includes('sidebar'))
        setShowEditor(values.includes('editor'))
        setShowTerminal(values.includes('terminal'))
        setShowPreview(values.includes('preview'))
    }

    useEffect(() => {
        const enabledByPanel = {
            sidebar: showSidebar,
            editor: showEditor,
            terminal: showTerminal,
            preview: showPreview,
        }
        if (enabledByPanel[activeMobilePanel]) return
        const fallback = MOBILE_PANEL_ORDER.find(panel => enabledByPanel[panel])
        if (fallback) {
            setActiveMobilePanel(fallback)
        }
    }, [activeMobilePanel, showSidebar, showEditor, showTerminal, showPreview])

    useEffect(() => {
        setCollapsedFolders(getDefaultCollapsedFolders(folderSet))
    }, [folderSet])

    useEffect(() => {
        activeFileRef.current = activeFile
    }, [activeFile])

    useEffect(() => {
        fileMapRef.current = fileMap
    }, [fileMap])

    useEffect(() => {
        if (!monacoRef.current) return
        updateBossTypes(monacoRef.current)
    }, [fileMap])

    useEffect(() => {
        const template = templates.find(item => item.id === templateId)
        if (!template) return
        const { files: nextFiles, changed } = rehomeFlatFiles(fileMap, template.files)
        if (!changed) return
        fileCacheRef.current = new Map(Object.entries(nextFiles))
        setFileMap(nextFiles)
        setFolderSet(prev => {
            const extra = collectFoldersFromFiles(nextFiles)
            if (!extra.size) return prev
            return new Set([...prev, ...extra])
        })
    }, [fileMap, templateId, templates])

    useEffect(() => {
        dirtyFilesRef.current = dirtyFiles
    }, [dirtyFiles])

    useEffect(() => {
        folderSetRef.current = folderSet
    }, [folderSet])

    useEffect(() => {
        if (typeof window === 'undefined') return
        setIsIsolated(Boolean(window.crossOriginIsolated))
    }, [])

    useEffect(() => {
        schedulePersist()
    }, [
        templateId,
        fileMap,
        folderSet,
        openFiles,
        activeFile,
        dirtyFiles,
        showSidebar,
        showEditor,
        showPreview,
        showTerminal,
        sidebarWidth,
        previewWidth,
        terminalHeight,
        terminalTabs,
        activeTerminalId,
    ])

    const buildStatePayload = () => {
        const filteredFiles = filterSharedFiles(Object.fromEntries(fileCacheRef.current))
        const fileSet = new Set(Object.keys(filteredFiles))
        const filteredOpenFiles = openFiles.filter(path => fileSet.has(path))
        const filteredDirtyFiles = [...dirtyFiles].filter(path => fileSet.has(path))
        const nextActive = fileSet.has(activeFile)
            ? activeFile
            : getDefaultOpenFile(filteredFiles, filteredOpenFiles[0])
        const nextOpenFiles = filteredOpenFiles.length ? filteredOpenFiles : [nextActive]
        const allowedBossFolders = new Set()
        Object.keys(filteredFiles).forEach(path => {
            if (!isBossConfigPath(path)) return
            const normalized = normalizeFilePath(path)
            if (normalized.startsWith('src/.bo$$/')) allowedBossFolders.add('src/.bo$$')
            if (normalized.startsWith('.bo$$/')) allowedBossFolders.add('.bo$$')
        })
        const filteredFolders = [
            ...new Set([...folderSet].map(folder => normalizeFilePath(folder)).filter(Boolean)),
        ].filter(folder => {
            if (folder === '.bo$$' || folder === 'src/.bo$$') {
                return allowedBossFolders.has(folder)
            }
            if (folder.startsWith('.bo$$/') || folder.startsWith('src/.bo$$/')) {
                return false
            }
            return true
        })

        return {
            v: 1,
            templateId,
            files: filteredFiles,
            folders: filteredFolders,
            openFiles: nextOpenFiles,
            activeFile: nextActive,
            dirtyFiles: filteredDirtyFiles,
            terminalTabs,
            activeTerminalId,
            ui: {
                showSidebar,
                showEditor,
                showPreview,
                showTerminal,
            },
            sizes: {
                sidebarWidth,
                previewWidth,
                terminalHeight,
            },
        }
    }

    const persistState = payload => {
        if (typeof window === 'undefined') return
        const encoded = compressToEncodedURIComponent(JSON.stringify(payload))
        const hash = `#state=${encoded}`
        if (window.location.hash !== hash) {
            window.history.replaceState(null, '', hash)
        }
    }

    const schedulePersist = () => {
        if (typeof window === 'undefined') return
        if (persistTimerRef.current) clearTimeout(persistTimerRef.current)
        persistTimerRef.current = setTimeout(() => {
            persistState(buildStatePayload())
        }, 300)
    }

    const disposeTerminals = (mode = 'hard') => {
        const entries = Array.from(terminalInstancesRef.current.values())
        if (mode === 'hard') {
            terminalInstancesRef.current.clear()
            entries.forEach(entry => {
                entry.disposed = true
                if (entry.fitAddon?.dispose) {
                    try {
                        entry.fitAddon.dispose()
                    } catch (error) {
                        // ignore
                    }
                }
                entry.term.dispose()
            })
        } else {
            entries.forEach(entry => {
                entry.disposed = false
                try {
                    entry.term.reset()
                    if (typeof entry.term.clear === 'function') {
                        entry.term.clear()
                    }
                } catch (error) {
                    // ignore
                }
            })
        }
        terminalProcessesRef.current.forEach(process => {
            if (process?.kill) {
                try {
                    process.kill()
                } catch (error) {
                    // ignore
                }
            }
        })
        terminalProcessesRef.current.clear()
        terminalOutputBufferRef.current.clear()
        terminalInputAttachedRef.current = new WeakSet()
        terminalOutputAttachedRef.current = new WeakSet()
    }

    const teardownWebcontainer = async () => {
        webcontainerRef.current = null
        await teardownSharedWebcontainer()
    }

    const resetWorkspace = nextState => {
        fileCacheRef.current = new Map(Object.entries(nextState.files))
        setFileMap(nextState.files)
        setFolderSet(new Set(nextState.folders || []))
        setActiveFile(nextState.activeFile)
        setOpenFiles(nextState.openFiles || [nextState.activeFile])
        setDirtyFiles(new Set(nextState.dirtyFiles || []))
        setTerminalTabs(nextState.terminalTabs || [{ id: 'dev', title: 'Dev', kind: 'dev' }])
        setActiveTerminalId(nextState.activeTerminalId || 'dev')
        setPreviewUrl('')
        setStatus('idle')
        setContainerReady(false)
        bootPromiseRef.current = null
        shouldRunRef.current = true
        setWorkspaceKey(prev => prev + 1)
        setCollapsedFolders(getDefaultCollapsedFolders(nextState.folders || []))
        disposeTerminals('soft')
        teardownWebcontainer()
    }

    const applyTemplate = nextTemplateId => {
        const template = templates.find(item => item.id === nextTemplateId)
        if (!template) return
        const preferredOpenFile =
            openFile || templates.find(item => item.id === nextTemplateId)?.openFile || DEFAULT_OPEN_FILE
        const nextFiles = cloneFiles(template.files)
        const nextActive = getDefaultOpenFile(nextFiles, preferredOpenFile)
        setTemplateId(nextTemplateId)
        const nextFolders = Array.from(collectFoldersFromFiles(nextFiles))
        resetWorkspace({
            files: nextFiles,
            folders: nextFolders,
            activeFile: nextActive,
            openFiles: [nextActive],
            dirtyFiles: [],
            terminalTabs: [{ id: 'dev', title: 'Dev', kind: 'dev' }],
            activeTerminalId: 'dev',
        })
        schedulePersist()
    }

    const handleShare = async () => {
        const payload = buildStatePayload()
        persistState(payload)
        if (typeof window === 'undefined') return
        const url = window.location.href
        try {
            await navigator.clipboard.writeText(url)
            setShareCopied(true)
            if (sharePulseTimerRef.current) clearTimeout(sharePulseTimerRef.current)
            sharePulseTimerRef.current = setTimeout(() => setShareCopied(false), 1200)
        } catch (error) {
            window.prompt('Copy this URL', url)
        }
    }

    const writeToTerminal = (id, chunk) => {
        const entry = terminalInstancesRef.current.get(id)
        const decoder = new TextDecoder()
        const data = typeof chunk === 'string' ? chunk : decoder.decode(chunk)
        if (!entry || entry.disposed || !entry.term?.element) {
            const buffer = terminalOutputBufferRef.current.get(id) || []
            buffer.push(data)
            terminalOutputBufferRef.current.set(id, buffer)
            return
        }
        entry.term.write(data)
    }

    const pipeProcess = (process, id) => {
        if (!process?.output) return
        if (terminalOutputAttachedRef.current.has(process)) return
        terminalOutputAttachedRef.current.add(process)
        process.output.pipeTo(
            new WritableStream({
                write(data) {
                    writeToTerminal(id, data)
                },
            }),
        )
    }

    const attachTerminalInput = (id, process) => {
        if (!process?.input) return
        if (terminalInputAttachedRef.current.has(process)) return
        const entry = terminalInstancesRef.current.get(id)
        if (!entry || entry.disposed) return
        const writer = process.input.getWriter()
        entry.term.onData(data => writer.write(data))
        terminalInputAttachedRef.current.add(process)
    }

    const canFitTerminal = entry => {
        if (!entry || entry.disposed) return false
        if (!entry?.term?.element) return false
        if (!entry.container || !entry.container.isConnected) return false
        const rect = entry.container.getBoundingClientRect()
        return rect.width > 0 && rect.height > 0
    }

    const safeFitTerminal = entry => {
        if (!canFitTerminal(entry)) return
        try {
            entry.fitAddon.fit()
        } catch (error) {
            // ignore
        }
    }

    const patchViewportRefresh = term => {
        const viewport = term?._core?.viewport
        if (!viewport || viewport.__bossPatched) return
        const original = viewport._innerRefresh?.bind(viewport)
        if (typeof original !== 'function') return
        viewport._innerRefresh = (...args) => {
            try {
                return original(...args)
            } catch (error) {
                if (String(error?.message || error).includes("reading 'dimensions'")) return undefined
                throw error
            }
        }
        viewport.__bossPatched = true
    }

    const ensureTerminalInstance = id => {
        const container = terminalContainersRef.current.get(id)
        if (!container) return
        if (terminalInstancesRef.current.has(id)) {
            const entry = terminalInstancesRef.current.get(id)
            if (entry?.disposed) {
                terminalInstancesRef.current.delete(id)
                return ensureTerminalInstance(id)
            }
            if (entry.container !== container) {
                container.innerHTML = ''
                try {
                    entry.term.open(container)
                } catch (error) {
                    // ignore
                }
                patchViewportRefresh(entry.term)
                safeFitTerminal(entry)
                entry.container = container
            }
            const process = terminalProcessesRef.current.get(id)
            if (process) {
                pipeProcess(process, id)
                attachTerminalInput(id, process)
            }
            return
        }

        const term = new Terminal({
            fontFamily: "'Roboto Mono', ui-monospace, SFMono-Regular, SFMono-Regular, Menlo, monospace",
            fontSize: 12,
            lineHeight: 1.4,
            theme: {
                background: '#282a36',
                foreground: '#f8f8f2',
                cursor: '#f8f8f2',
                selectionBackground: '#44475a',
                black: '#21222c',
                red: '#ff5555',
                green: '#50fa7b',
                yellow: '#f1fa8c',
                blue: '#8be9fd',
                magenta: '#ff79c6',
                cyan: '#8be9fd',
                white: '#f8f8f2',
                brightBlack: '#6272a4',
                brightRed: '#ff6e6e',
                brightGreen: '#69ff94',
                brightYellow: '#ffffa5',
                brightBlue: '#d6acff',
                brightMagenta: '#ff92df',
                brightCyan: '#a4ffff',
                brightWhite: '#ffffff',
            },
            scrollback: 2000,
        })
        const fitAddon = new FitAddon()
        term.loadAddon(fitAddon)
        term.open(container)
        patchViewportRefresh(term)
        safeFitTerminal({ term, fitAddon, container })

        terminalInstancesRef.current.set(id, { term, fitAddon, container, disposed: false })

        const buffered = terminalOutputBufferRef.current.get(id)
        if (buffered) {
            buffered.forEach(chunk => term.write(chunk))
            terminalOutputBufferRef.current.delete(id)
        }

        const process = terminalProcessesRef.current.get(id)
        if (process) {
            pipeProcess(process, id)
            attachTerminalInput(id, process)
        }
    }

    useEffect(() => {
        if (!showTerminal) return
        ensureTerminalInstance(activeTerminalId)
        const handleResize = () => {
            const entry = terminalInstancesRef.current.get(activeTerminalId)
            safeFitTerminal(entry)
        }
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [showTerminal, activeTerminalId])

    useEffect(() => {
        if (!showEditor) return undefined
        const handleResize = () => {
            const editor = monacoEditorRef.current
            if (editor) {
                editor.layout()
            }
        }
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [showEditor, workspaceKey])

    useEffect(() => {
        if (!showTerminal) return
        const entry = terminalInstancesRef.current.get(activeTerminalId)
        if (entry) {
            entry.term.focus()
        }
    }, [showTerminal, activeTerminalId])

    useEffect(() => {
        const shellCount = terminalTabs.filter(tab => tab.kind === 'shell').length
        terminalCounterRef.current = Math.max(terminalCounterRef.current, shellCount + 1)
    }, [terminalTabs])

    useEffect(() => {
        if (!containerReady) return
        const webcontainer = webcontainerRef.current
        if (!webcontainer) return
        const spawnMissing = async () => {
            for (const tab of terminalTabs) {
                if (tab.id === 'dev') continue
                if (terminalProcessesRef.current.has(tab.id)) continue
                if (terminalSpawningRef.current.has(tab.id)) continue
                terminalSpawningRef.current.add(tab.id)
                try {
                    const process = await webcontainer.spawn('jsh')
                    terminalProcessesRef.current.set(tab.id, process)
                    pipeProcess(process, tab.id)
                    attachTerminalInput(tab.id, process)
                    ensureTerminalInstance(tab.id)
                } catch (error) {
                    writeToTerminal('dev', `\r\nFailed to spawn shell: ${error.message}\r\n`)
                } finally {
                    terminalSpawningRef.current.delete(tab.id)
                }
            }
        }
        spawnMissing()
    }, [containerReady, terminalTabs])

    useEffect(() => {
        if (!editorRef.current) return undefined
        if (!showEditor) return undefined

        let disposed = false

        const initEditor = async () => {
            try {
                const monaco = await loadMonaco()
                if (disposed || !editorRef.current) return

                monacoRef.current = monaco
                const tsDefaults = monaco.languages.typescript.typescriptDefaults
                const jsDefaults = monaco.languages.typescript.javascriptDefaults
                tsDefaults.setCompilerOptions({
                    allowNonTsExtensions: true,
                    allowJs: true,
                    checkJs: false,
                    jsx: monaco.languages.typescript.JsxEmit.Preserve,
                    module: monaco.languages.typescript.ModuleKind.ESNext,
                    moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
                    target: monaco.languages.typescript.ScriptTarget.ES2020,
                    noEmit: true,
                })
                jsDefaults.setCompilerOptions({
                    allowNonTsExtensions: true,
                    allowJs: true,
                    checkJs: false,
                    jsx: monaco.languages.typescript.JsxEmit.Preserve,
                    module: monaco.languages.typescript.ModuleKind.ESNext,
                    moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
                    target: monaco.languages.typescript.ScriptTarget.ES2020,
                    noEmit: true,
                })
                tsDefaults.setEagerModelSync(true)
                jsDefaults.setEagerModelSync(true)
                updateBossTypes(monaco)
                if (!window.__bossThemeReady) {
                    try {
                        monaco.editor.defineTheme('boss-dracula', {
                            base: 'vs-dark',
                            inherit: true,
                            rules: [
                                { token: 'comment', foreground: '6272a4' },
                                { token: 'keyword', foreground: 'ff79c6' },
                                { token: 'string', foreground: 'f1fa8c' },
                                { token: 'number', foreground: 'bd93f9' },
                                { token: 'type.identifier', foreground: '8be9fd' },
                                { token: 'identifier', foreground: 'f8f8f2' },
                            ],
                            colors: {
                                'editor.background': '#282a36',
                                'editor.foreground': '#f8f8f2',
                                'editorLineNumber.foreground': '#6272a4',
                                'editorLineNumber.activeForeground': '#f8f8f2',
                                'editorCursor.foreground': '#f8f8f2',
                                'editor.selectionBackground': '#44475a',
                                'editor.inactiveSelectionBackground': '#3e4452',
                                'editorIndentGuide.background': '#3b3f51',
                                'editorIndentGuide.activeBackground': '#4f536a',
                                'editorWhitespace.foreground': '#3b3f51',
                                'editorGutter.background': '#21222c',
                                'editorGutter.modifiedBackground': '#ffb86c',
                                'editorGutter.addedBackground': '#50fa7b',
                                'editorGutter.deletedBackground': '#ff5555',
                            },
                        })
                        window.__bossThemeReady = true
                    } catch (themeError) {
                        console.warn('Failed to define Monaco theme', themeError)
                    }
                }

                const initialPath = activeFileRef.current
                const initialValue = fileCacheRef.current.get(initialPath) || ''
                const model = monaco.editor.createModel(
                    initialValue,
                    resolveModelLanguage(monaco, initialPath),
                    monaco.Uri.parse(`file:///${initialPath}`),
                )
                modelsRef.current.set(initialPath, model)

                const editor = monaco.editor.create(editorRef.current, {
                    model,
                    theme: 'boss-dracula',
                    minimap: { enabled: false },
                    fontFamily: "'Roboto Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
                    fontSize: 13,
                    lineNumbers: 'on',
                    scrollBeyondLastLine: false,
                    padding: { top: 12, bottom: 12 },
                })

                monacoEditorRef.current = editor

                editor.onDidChangeModelContent(() => {
                    if (suppressEditorChangeRef.current) return
                    const filePath = activeFileRef.current
                    const value = editor.getValue()
                    fileCacheRef.current.set(filePath, value)
                    setDirtyFiles(prev => {
                        const next = new Set(prev)
                        next.add(filePath)
                        return next
                    })
                    schedulePersist()
                })

                editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
                    saveFile(activeFileRef.current)
                })
            } catch (error) {
                console.error('Failed to load Monaco', error)
            }
        }

        initEditor()

        return () => {
            disposed = true
            if (monacoEditorRef.current) {
                monacoEditorRef.current.dispose()
                monacoEditorRef.current = null
            }
            modelsRef.current.forEach(model => model.dispose())
            modelsRef.current.clear()
        }
    }, [workspaceKey, showEditor])

    useEffect(() => {
        const editor = monacoEditorRef.current
        const monaco = monacoRef.current
        if (!editor || !monaco || !showEditor) return

        let model = modelsRef.current.get(activeFile)
        if (!model) {
            const value = fileCacheRef.current.get(activeFile) || ''
            model = monaco.editor.createModel(
                value,
                resolveModelLanguage(monaco, activeFile),
                monaco.Uri.parse(`file:///${activeFile}`),
            )
            modelsRef.current.set(activeFile, model)
        }
        editor.setModel(model)
    }, [activeFile, showEditor])

    useEffect(() => {
        if (!workspaceRef.current) return undefined

        let observer
        let cancelled = false

        const boot = async () => {
            if (bootPromiseRef.current) return bootPromiseRef.current

            const isolated = typeof window !== 'undefined' ? Boolean(window.crossOriginIsolated) : false
            if (!isolated) {
                setStatus('blocked')
                return Promise.resolve()
            }

            hasBootedOnceRef.current = true
            setStatus('booting')

            bootPromiseRef.current = (async () => {
                try {
                    const webcontainer = await ensureWebcontainer()
                    if (cancelled) return
                    webcontainerRef.current = webcontainer
                    setContainerReady(true)

                    const isActive = () => !cancelled && webcontainerRef.current === webcontainer
                    const spawnProcess = async (command, args) => {
                        if (!isActive()) return null
                        try {
                            return await webcontainer.spawn(command, args)
                        } catch (error) {
                            if (!isActive() || isProxyReleasedError(error)) return null
                            throw error
                        }
                    }

                    webcontainer.on('server-ready', (_port, url) => {
                        setPreviewUrl(url)
                    })

                    await webcontainer.mount(toFileTree(Object.fromEntries(fileCacheRef.current)))
                    if (!isActive()) return

                    const ensurePackageJson = async () => {
                        try {
                            await webcontainer.fs.readFile('package.json', 'utf8')
                            return true
                        } catch (error) {
                            const cached = fileCacheRef.current.get('package.json')
                            if (cached) {
                                try {
                                    await webcontainer.fs.writeFile('package.json', cached)
                                } catch (writeError) {
                                    // ignore
                                }
                            }
                        }
                        const started = Date.now()
                        while (Date.now() - started < 3000) {
                            try {
                                await webcontainer.fs.readFile('package.json', 'utf8')
                                return true
                            } catch (error) {
                                await new Promise(resolve => setTimeout(resolve, 50))
                            }
                        }
                        return false
                    }

                    await ensurePackageJson()
                    if (!isActive()) return

                    setStatus('installing')

                    const activeTemplate = templates.find(item => item.id === templateId)
                    const installConfig = activeTemplate?.install ?? DEFAULT_INSTALL
                    const installProcess = await spawnProcess(installConfig.command, installConfig.args)
                    if (!installProcess) return
                    pipeProcess(installProcess, 'dev')
                    const installExit = await installProcess.exit

                    if (!isActive()) return
                    if (installExit !== 0) {
                        setStatus('error')
                        writeToTerminal('dev', '\r\nInstall failed. Boss CSS is not on npm yet.\r\n')
                        return
                    }

                    const initConfig = activeTemplate?.init
                    if (initConfig) {
                        setStatus('configuring')
                        const initProcess = await spawnProcess(initConfig.command, initConfig.args)
                        if (!initProcess) return
                        pipeProcess(initProcess, 'dev')
                        const initExit = await initProcess.exit
                        if (!isActive()) return
                        if (initExit !== 0) {
                            setStatus('error')
                            writeToTerminal('dev', '\r\nboss init failed.\r\n')
                            return
                        }
                        const skipTokens = ['boss-bosswind', 'boss-bosswind-classname-only'].includes(
                            activeTemplate?.id,
                        )
                        await ensureBossConfigTokens(webcontainer, updateFile, { skipTokens })
                    }

                    setStatus('running')
                    await ensurePackageJson()
                    const devConfig = activeTemplate?.dev ?? DEFAULT_DEV
                    const devProcess = await spawnProcess(devConfig.command, devConfig.args)
                    if (!devProcess) return
                    terminalProcessesRef.current.set('dev', devProcess)
                    pipeProcess(devProcess, 'dev')
                    await devProcess.exit
                } catch (error) {
                    if (cancelled || isProxyReleasedError(error)) return
                    console.error('Playground failed to boot', error)
                    setStatus('error')
                }
            })()

            return bootPromiseRef.current
        }

        if (lazy && !hasBootedOnceRef.current && typeof window !== 'undefined' && 'IntersectionObserver' in window) {
            observer = new IntersectionObserver(
                entries => {
                    if (entries.some(entry => entry.isIntersecting)) {
                        observer.disconnect()
                        if (shouldRunRef.current) boot()
                    }
                },
                { rootMargin: '240px' },
            )
            observer.observe(workspaceRef.current)
        } else {
            boot()
        }

        return () => {
            cancelled = true
            if (observer) observer.disconnect()
            disposeTerminals('soft')
            teardownWebcontainer()
            setContainerReady(false)
        }
    }, [workspaceKey, lazy])

    useEffect(() => {
        if (!containerReady) return undefined
        const webcontainer = webcontainerRef.current
        if (!webcontainer) return undefined
        let cancelled = false

        const readDirectory = async path => {
            try {
                const entries = await webcontainer.fs.readdir(path, { withFileTypes: true })
                return entries
            } catch (error) {
                try {
                    return await webcontainer.fs.readdir(path)
                } catch (fallbackError) {
                    return []
                }
            }
        }

        const isDirectoryEntry = entry => {
            if (!entry || typeof entry === 'string' || entry instanceof Uint8Array) return false
            if (typeof entry.isDirectory === 'function') return entry.isDirectory()
            if (typeof entry.isDirectory === 'boolean') return entry.isDirectory
            return false
        }

        const syncFileSystem = async () => {
            if (fsSyncingRef.current) {
                fsSyncPendingRef.current = true
                return
            }
            fsSyncingRef.current = true
            try {
                let files = {}
                const folders = new Set()
                const queue = ['.']
                while (queue.length) {
                    const dir = queue.pop()
                    if (!dir) continue
                    const entries = await readDirectory(dir)
                    for (const entry of entries) {
                        const name = decodeFsName(entry?.name ?? entry)
                        if (!name || name === '.' || name === '..') continue
                        const fullPath = normalizeFilePath(dir === '.' ? name : `${dir}/${name}`)
                        if (!fullPath) continue
                        if (shouldIgnorePath(fullPath)) continue
                        let isDir = isDirectoryEntry(entry)
                        if (!isDir && (typeof entry === 'string' || entry instanceof Uint8Array)) {
                            try {
                                await webcontainer.fs.readdir(fullPath)
                                isDir = true
                            } catch (error) {
                                // not a directory
                            }
                        }
                        if (isDir) {
                            folders.add(fullPath)
                            queue.push(fullPath)
                            continue
                        }
                        try {
                            const content = await webcontainer.fs.readFile(fullPath, 'utf8')
                            files[fullPath] = content
                        } catch (error) {
                            // ignore non-files
                        }
                    }
                }

                if (cancelled) return

                files = normalizeFileMapKeys(files)

                const dirty = dirtyFilesRef.current
                const prevCache = fileCacheRef.current
                const nextFiles = {}
                const nextCache = new Map()

                Object.entries(files).forEach(([path, content]) => {
                    const value = dirty.has(path) ? (prevCache.get(path) ?? content) : content
                    nextFiles[path] = value ?? ''
                    nextCache.set(path, value ?? '')
                })

                const nextFolders = new Set([...folders])
                const prevFiles = fileMapRef.current
                const prevFolders = folderSetRef.current
                const prevKeys = Object.keys(prevFiles)
                const nextKeys = Object.keys(nextFiles)
                const filesChanged =
                    prevKeys.length !== nextKeys.length || nextKeys.some(key => prevFiles[key] !== nextFiles[key])
                const foldersChanged =
                    prevFolders.size !== nextFolders.size || [...nextFolders].some(folder => !prevFolders.has(folder))

                if (filesChanged || foldersChanged) {
                    if (filesChanged) {
                        fileCacheRef.current = nextCache
                        setFileMap(nextFiles)
                    }
                    if (foldersChanged) {
                        setFolderSet(nextFolders)
                    }

                    const monaco = monacoRef.current
                    if (monaco) {
                        nextKeys.forEach(path => {
                            if (dirty.has(path)) return
                            const model = modelsRef.current.get(path)
                            if (model && model.getValue() !== nextFiles[path]) {
                                suppressEditorChangeRef.current = true
                                model.setValue(nextFiles[path])
                                suppressEditorChangeRef.current = false
                            }
                        })
                    }
                }
            } finally {
                fsSyncingRef.current = false
                if (fsSyncPendingRef.current) {
                    fsSyncPendingRef.current = false
                    scheduleFsSync()
                }
            }
        }

        const scheduleFsSync = () => {
            if (fsSyncTimerRef.current) clearTimeout(fsSyncTimerRef.current)
            fsSyncTimerRef.current = setTimeout(() => {
                syncFileSystem()
            }, 200)
        }

        scheduleFsSync()

        let watcher
        let fallbackTimer
        try {
            watcher = webcontainer.fs.watch('.', { recursive: true }, () => {
                if (!cancelled) scheduleFsSync()
            })
        } catch (error) {
            fallbackTimer = setInterval(() => {
                if (!cancelled) scheduleFsSync()
            }, 2000)
        }

        return () => {
            cancelled = true
            if (fsSyncTimerRef.current) clearTimeout(fsSyncTimerRef.current)
            if (watcher?.close) watcher.close()
            if (fallbackTimer) clearInterval(fallbackTimer)
        }
    }, [containerReady, workspaceKey])

    const handleDragMove = event => {
        if (!dragRef.current || !workspaceRef.current) return
        const { type } = dragRef.current
        const rect = workspaceRef.current.getBoundingClientRect()

        if (type === 'sidebar') {
            const next = Math.max(MIN_SIDEBAR, event.clientX - rect.left)
            setSidebarWidth(next)
        }

        if (type === 'preview') {
            const next = Math.max(MIN_PREVIEW, rect.right - event.clientX)
            setPreviewWidth(next)
        }

        if (type === 'terminal') {
            const next = Math.max(MIN_TERMINAL, rect.bottom - event.clientY)
            setTerminalHeight(next)
            const entry = terminalInstancesRef.current.get(activeTerminalId)
            if (entry) {
                requestAnimationFrame(() => safeFitTerminal(entry))
            }
        }
    }

    const handleDragEnd = () => {
        dragRef.current = null
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
        if (dragListenersRef.current.move) {
            window.removeEventListener('pointermove', dragListenersRef.current.move)
            window.removeEventListener('pointerup', dragListenersRef.current.up)
            dragListenersRef.current = { move: null, up: null }
        }
    }

    useEffect(() => {
        const editor = monacoEditorRef.current
        if (!editor || !editorRef.current || !showEditor) return undefined

        let frame
        const observer = new ResizeObserver(() => {
            if (frame) cancelAnimationFrame(frame)
            frame = requestAnimationFrame(() => editor.layout())
        })
        observer.observe(editorRef.current)
        editor.layout()

        return () => {
            observer.disconnect()
            if (frame) cancelAnimationFrame(frame)
        }
    }, [showEditor, sidebarWidth, previewWidth, terminalHeight, showSidebar, showPreview, showTerminal])

    useEffect(() => {
        if (!showTerminal) return
        const entry = terminalInstancesRef.current.get(activeTerminalId)
        if (entry) {
            requestAnimationFrame(() => safeFitTerminal(entry))
        }
    }, [terminalHeight, activeTerminalId, showTerminal, showEditor, showPreview, showSidebar])

    const startDrag = type => event => {
        if (typeof window === 'undefined') return
        dragRef.current = { type }
        document.body.style.cursor = 'col-resize'
        document.body.style.userSelect = 'none'
        if (type === 'terminal') {
            document.body.style.cursor = 'row-resize'
        }
        dragListenersRef.current.move = handleDragMove
        dragListenersRef.current.up = handleDragEnd
        window.addEventListener('pointermove', dragListenersRef.current.move)
        window.addEventListener('pointerup', dragListenersRef.current.up)
        if (event.currentTarget?.setPointerCapture) {
            event.currentTarget.setPointerCapture(event.pointerId)
        }
        event.preventDefault()
    }

    useEffect(() => {
        return () => {
            if (dragListenersRef.current.move) {
                window.removeEventListener('pointermove', dragListenersRef.current.move)
                window.removeEventListener('pointerup', dragListenersRef.current.up)
            }
        }
    }, [])

    const saveFile = async filePath => {
        if (!filePath) return
        const content = fileCacheRef.current.get(filePath) ?? ''
        if (writeTimerRef.current) {
            clearTimeout(writeTimerRef.current)
            writeTimerRef.current = null
        }
        if (!webcontainerRef.current) return
        try {
            await webcontainerRef.current.fs.writeFile(filePath, content)
        } catch (error) {
            console.error('Failed to save file', error)
        }
        setDirtyFiles(prev => {
            const next = new Set(prev)
            next.delete(filePath)
            return next
        })
        schedulePersist()
        setSavePulse(true)
        if (savePulseTimerRef.current) {
            clearTimeout(savePulseTimerRef.current)
        }
        savePulseTimerRef.current = setTimeout(() => setSavePulse(false), 900)
    }

    useEffect(() => {
        if (typeof window === 'undefined') return undefined
        const handleKeydown = event => {
            if (!showEditor) return
            if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
                event.preventDefault()
                saveFile(activeFileRef.current)
            }
        }
        window.addEventListener('keydown', handleKeydown)
        return () => window.removeEventListener('keydown', handleKeydown)
    }, [showEditor])

    useEffect(() => {
        if (typeof window === 'undefined') return undefined
        const shouldSuppress = event => {
            const message = event?.message || event?.error?.message || ''
            const stack = event?.error?.stack || ''
            const filename = event?.filename || event?.error?.fileName || ''
            if (!message.includes("reading 'dimensions'")) return false
            if (stack.includes('xterm') || filename.includes('xterm')) return true
            return true
        }
        const handleError = event => {
            if (!shouldSuppress(event)) return
            event.preventDefault()
        }
        const handleRejection = event => {
            const reason = event?.reason
            const fakeEvent = {
                message: reason?.message || String(reason || ''),
                error: reason,
            }
            if (!shouldSuppress(fakeEvent)) return
            event.preventDefault()
        }
        const originalConsoleError = console.error
        console.error = (...args) => {
            const first = args[0]
            if (typeof first === 'string' && first.includes("reading 'dimensions'")) return
            return originalConsoleError(...args)
        }
        window.addEventListener('error', handleError, true)
        window.addEventListener('unhandledrejection', handleRejection, true)
        return () => {
            window.removeEventListener('error', handleError, true)
            window.removeEventListener('unhandledrejection', handleRejection, true)
            console.error = originalConsoleError
        }
    }, [])

    useEffect(() => {
        return () => {
            if (savePulseTimerRef.current) {
                clearTimeout(savePulseTimerRef.current)
            }
            if (persistTimerRef.current) {
                clearTimeout(persistTimerRef.current)
            }
            if (sharePulseTimerRef.current) {
                clearTimeout(sharePulseTimerRef.current)
            }
        }
    }, [])

    useEffect(() => {
        return () => {
            disposeTerminals('hard')
        }
    }, [])

    const setTerminalContainer = id => node => {
        if (node) {
            terminalContainersRef.current.set(id, node)
            if (showTerminal) ensureTerminalInstance(id)
        } else {
            terminalContainersRef.current.delete(id)
        }
    }

    const addTerminalTab = async () => {
        const id = `shell-${Date.now()}`
        const label = `Shell ${terminalCounterRef.current}`
        terminalCounterRef.current += 1
        setTerminalTabs(prev => [...prev, { id, title: label, kind: 'shell' }])
        setActiveTerminalId(id)
        schedulePersist()
    }

    const openFilePath = filePath => {
        setActiveFile(filePath)
        setOpenFiles(prev => (prev.includes(filePath) ? prev : [...prev, filePath]))
    }

    const updateBossTypes = monaco => {
        if (!monaco?.languages?.typescript) return
        const contents =
            fileCacheRef.current.get('src/.bo$$/index.d.ts') ?? fileCacheRef.current.get('.bo$$/index.d.ts')
        if (!contents) return
        if (bossTypesRef.current.value === contents) return

        if (bossTypesRef.current.tsLib?.dispose) bossTypesRef.current.tsLib.dispose()
        if (bossTypesRef.current.jsLib?.dispose) bossTypesRef.current.jsLib.dispose()

        const uri = 'file:///src/.bo$$/index.d.ts'
        const tsLib = monaco.languages.typescript.typescriptDefaults.addExtraLib(contents, uri)
        const jsLib = monaco.languages.typescript.javascriptDefaults.addExtraLib(contents, uri)
        bossTypesRef.current = { tsLib, jsLib, value: contents }
    }

    const resolveModelLanguage = (monaco, filePath) => {
        const requested = inferLanguage(filePath)
        if (!monaco?.languages?.getLanguages) return requested
        const available = monaco.languages.getLanguages().some(lang => lang.id === requested)
        if (available) return requested
        if (requested === 'typescriptreact') return 'typescript'
        if (requested === 'javascriptreact') return 'javascript'
        return 'plaintext'
    }

    useEffect(() => {
        if (!activeFile) return
        setOpenFiles(prev => (prev.includes(activeFile) ? prev : [...prev, activeFile]))
    }, [activeFile])

    const closeFile = filePath => {
        setOpenFiles(prev => {
            const next = prev.filter(item => item !== filePath)
            if (filePath === activeFile) {
                const fallback = next[0] || Object.keys(fileMap)[0]
                if (fallback) {
                    setActiveFile(fallback)
                }
            }
            if (!next.length) {
                const fallback = Object.keys(fileMap)[0]
                return fallback ? [fallback] : []
            }
            return next
        })
    }

    const createEntry = async kind => {
        if (typeof window === 'undefined') return
        const label = kind === 'file' ? 'New file path' : 'New folder path'
        const input = window.prompt(label, kind === 'file' ? 'src/NewFile.jsx' : 'src/new-folder')
        if (!input) return
        const normalized = input.trim().replace(/^\/+/, '')
        if (!normalized || normalized.includes('..')) return
        if (kind === 'file' && fileMap[normalized]) {
            window.alert('File already exists.')
            return
        }

        if (kind === 'file') {
            const nextMap = { ...fileMap }
            nextMap[normalized] = ''
            setFileMap(nextMap)
            fileCacheRef.current = new Map(Object.entries(nextMap))
        } else {
            const nextFolders = new Set(folderSet)
            nextFolders.add(normalized.replace(/\/+$/, ''))
            setFolderSet(nextFolders)
        }

        if (webcontainerRef.current) {
            try {
                if (kind === 'folder') {
                    await webcontainerRef.current.fs.mkdir(normalized, { recursive: true })
                } else {
                    const dir = normalized.split('/').slice(0, -1).join('/')
                    if (dir) {
                        await webcontainerRef.current.fs.mkdir(dir, { recursive: true })
                    }
                    await webcontainerRef.current.fs.writeFile(normalized, '')
                }
            } catch (error) {
                console.error('Failed to create entry', error)
            }
        }

        if (kind === 'file') {
            openFilePath(normalized)
        }
        schedulePersist()
    }

    const getFileAccent = filePath => {
        if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) return 'text-cyan-300'
        if (filePath.endsWith('.jsx') || filePath.endsWith('.js')) return 'text-amber-300'
        if (filePath.endsWith('.css')) return 'text-emerald-300'
        if (filePath.endsWith('.json')) return 'text-violet-300'
        return 'text-muted-foreground'
    }

    const normalizePath = path => path.replace(/\\/g, '/').replace(/^\/+/, '')
    const getDragPayload = event => {
        const raw = event.dataTransfer.getData('application/x-boss')
        if (raw) {
            try {
                return JSON.parse(raw)
            } catch (error) {
                return null
            }
        }
        const fallback = event.dataTransfer.getData('text/plain')
        if (!fallback) return null
        return { type: 'file', path: fallback }
    }

    const getParentFolder = filePath => {
        const parts = normalizePath(filePath).split('/')
        parts.pop()
        return parts.join('/')
    }

    const moveFolder = async (sourcePath, targetFolder) => {
        const source = normalizePath(sourcePath)
        const targetBase = normalizePath(targetFolder || '')
        if (!source) return
        if (targetBase && (targetBase === source || targetBase.startsWith(`${source}/`))) {
            return
        }
        const baseName = source.split('/').pop()
        const targetPath = targetBase ? `${targetBase}/${baseName}` : baseName
        if (!baseName || source === targetPath) return
        const nextMap = {}
        Object.entries(fileMap).forEach(([path, value]) => {
            if (path === source || path.startsWith(`${source}/`)) {
                const suffix = path.slice(source.length)
                nextMap[`${targetPath}${suffix}`] = value
            } else {
                nextMap[path] = value
            }
        })
        const nextFolders = new Set()
        folderSet.forEach(folder => {
            if (folder === source || folder.startsWith(`${source}/`)) {
                const suffix = folder.slice(source.length)
                nextFolders.add(`${targetPath}${suffix}`)
            } else {
                nextFolders.add(folder)
            }
        })
        fileCacheRef.current = new Map(Object.entries(nextMap))
        setFileMap(nextMap)
        setFolderSet(nextFolders)
        setOpenFiles(prev =>
            prev.map(path => {
                if (path === source || path.startsWith(`${source}/`)) {
                    const suffix = path.slice(source.length)
                    return `${targetPath}${suffix}`
                }
                return path
            }),
        )
        setDirtyFiles(prev => {
            const next = new Set()
            prev.forEach(path => {
                if (path === source || path.startsWith(`${source}/`)) {
                    const suffix = path.slice(source.length)
                    next.add(`${targetPath}${suffix}`)
                } else {
                    next.add(path)
                }
            })
            return next
        })
        setCollapsedFolders(prev => {
            const next = new Set()
            prev.forEach(path => {
                if (path === source || path.startsWith(`${source}/`)) {
                    const suffix = path.slice(source.length)
                    next.add(`${targetPath}${suffix}`)
                } else {
                    next.add(path)
                }
            })
            return next
        })
        if (activeFile === source || activeFile.startsWith(`${source}/`)) {
            const suffix = activeFile.slice(source.length)
            setActiveFile(`${targetPath}${suffix}`)
        }
        if (webcontainerRef.current) {
            try {
                await webcontainerRef.current.fs.rename(source, targetPath)
            } catch (error) {
                console.error('Failed to move folder', error)
            }
        }
        schedulePersist()
    }

    const moveEntry = async (sourcePath, targetFolder) => {
        const source = normalizePath(sourcePath)
        const targetBase = normalizePath(targetFolder || '')
        const filename = source.split('/').pop()
        const targetPath = targetBase ? `${targetBase}/${filename}` : filename
        if (!filename || source === targetPath) return
        if (fileMap[targetPath]) return
        const nextMap = { ...fileMap }
        nextMap[targetPath] = nextMap[source]
        delete nextMap[source]
        fileCacheRef.current = new Map(Object.entries(nextMap))
        setFileMap(nextMap)
        setOpenFiles(prev => prev.map(path => (path === source ? targetPath : path)))
        setDirtyFiles(prev => {
            if (!prev.has(source)) return prev
            const next = new Set(prev)
            next.delete(source)
            next.add(targetPath)
            return next
        })
        if (activeFile === source) {
            setActiveFile(targetPath)
        }
        if (webcontainerRef.current) {
            try {
                await webcontainerRef.current.fs.rename(source, targetPath)
            } catch (error) {
                console.error('Failed to move file', error)
            }
        }
        schedulePersist()
    }

    const deleteEntry = async path => {
        const normalized = normalizePath(path)
        const isFolder =
            folderSet.has(normalized) || Object.keys(fileMap).some(filePath => filePath.startsWith(`${normalized}/`))
        if (isFolder) {
            const nextMap = { ...fileMap }
            Object.keys(nextMap).forEach(filePath => {
                if (filePath === normalized || filePath.startsWith(`${normalized}/`)) {
                    delete nextMap[filePath]
                }
            })
            const nextFolders = new Set(
                [...folderSet].filter(folder => folder !== normalized && !folder.startsWith(`${normalized}/`)),
            )
            setFileMap(nextMap)
            setFolderSet(nextFolders)
            fileCacheRef.current = new Map(Object.entries(nextMap))
            setCollapsedFolders(prev => {
                const next = new Set(prev)
                next.delete(normalized)
                return next
            })
            if (webcontainerRef.current) {
                try {
                    await webcontainerRef.current.fs.rm(normalized, { recursive: true, force: true })
                } catch (error) {
                    try {
                        await webcontainerRef.current.fs.rm(normalized, { recursive: true })
                    } catch (fallbackError) {
                        console.error('Failed to delete folder', fallbackError)
                    }
                }
            }
        } else {
            const nextMap = { ...fileMap }
            delete nextMap[normalized]
            setFileMap(nextMap)
            fileCacheRef.current = new Map(Object.entries(nextMap))
            if (webcontainerRef.current) {
                try {
                    await webcontainerRef.current.fs.rm(normalized)
                } catch (error) {
                    console.error('Failed to delete file', error)
                }
            }
        }
        setOpenFiles(prev => prev.filter(path => !(path === normalized || path.startsWith(`${normalized}/`))))
        setDirtyFiles(prev => {
            const next = new Set(prev)
            next.forEach(path => {
                if (path === normalized || path.startsWith(`${normalized}/`)) {
                    next.delete(path)
                }
            })
            return next
        })
        if (activeFile === normalized || activeFile.startsWith(`${normalized}/`)) {
            const fallback = Object.keys(fileMap).find(
                filePath => !(filePath === normalized || filePath.startsWith(`${normalized}/`)),
            )
            if (fallback) setActiveFile(fallback)
        }
        schedulePersist()
    }

    return (
        <section className={cn(styles.shell, className)} style={{ height }}>
            <header className={cn(styles.titleBar, 'flex items-center justify-between gap-4')}>
                <div className="flex items-center gap-4">
                    {isIsolated === false && (
                        <Badge
                            variant="outline"
                            className="border-amber-500/40 bg-amber-500/10 text-[0.65rem] uppercase text-amber-200"
                        >
                            COOP + COEP required
                        </Badge>
                    )}
                    <Select value={templateId} onValueChange={applyTemplate}>
                        <SelectTrigger className="h-8 w-[170px] border-border/60 bg-background/60 text-xs text-foreground shadow-sm backdrop-blur">
                            <SelectValue placeholder="Template" />
                        </SelectTrigger>
                        <SelectContent side="bottom" position="popper">
                            {templateOptions.map(option => (
                                <SelectItem key={option.id} value={option.id}>
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button
                        type="button"
                        variant={shareCopied ? 'secondary' : 'outline'}
                        size="sm"
                        className={cn(
                            'h-8 border-border/60 bg-background/60 text-xs text-foreground hover:bg-accent/40',
                            shareCopied && 'bg-emerald-500/20 text-emerald-100',
                        )}
                        onClick={handleShare}
                    >
                        <Share2Icon className="size-3.5" />
                        {shareCopied ? 'Copied' : 'Share'}
                    </Button>
                    <Badge
                        variant="outline"
                        className={cn('border px-2 py-1 text-[0.65rem] uppercase', getStatusTone(status))}
                    >
                        {formatStatus(status)}
                    </Badge>
                </div>
                <div className={cn('flex items-center gap-3', styles.desktopPanelControls)}>
                    <ToggleGroup
                        type="multiple"
                        value={panelToggles}
                        onValueChange={handlePanelToggle}
                        spacing={0}
                        size="sm"
                    >
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <ToggleGroupItem
                                    value="sidebar"
                                    aria-label="Toggle sidebar"
                                    className="px-2 border-0 bg-transparent text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground aria-[pressed=false]:opacity-60 aria-[pressed=false]:bg-transparent aria-[pressed=true]:bg-accent/70 aria-[pressed=true]:text-foreground aria-[pressed=true]:opacity-100 aria-[pressed=true]:shadow-[0_0_0_1px_rgba(189,147,249,0.55)]"
                                >
                                    <LayoutPanelLeftIcon className="size-4" />
                                </ToggleGroupItem>
                            </TooltipTrigger>
                            <TooltipContent sideOffset={6}>Explorer</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <ToggleGroupItem
                                    value="editor"
                                    aria-label="Toggle editor"
                                    className="px-2 border-0 bg-transparent text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground aria-[pressed=false]:opacity-60 aria-[pressed=false]:bg-transparent aria-[pressed=true]:bg-accent/70 aria-[pressed=true]:text-foreground aria-[pressed=true]:opacity-100 aria-[pressed=true]:shadow-[0_0_0_1px_rgba(189,147,249,0.55)]"
                                >
                                    <MonitorIcon className="size-4" />
                                </ToggleGroupItem>
                            </TooltipTrigger>
                            <TooltipContent sideOffset={6}>Editor</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <ToggleGroupItem
                                    value="terminal"
                                    aria-label="Toggle terminal"
                                    className="px-2 border-0 bg-transparent text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground aria-[pressed=false]:opacity-60 aria-[pressed=false]:bg-transparent aria-[pressed=true]:bg-accent/70 aria-[pressed=true]:text-foreground aria-[pressed=true]:opacity-100 aria-[pressed=true]:shadow-[0_0_0_1px_rgba(189,147,249,0.55)]"
                                >
                                    <PanelBottomIcon className="size-4" />
                                </ToggleGroupItem>
                            </TooltipTrigger>
                            <TooltipContent sideOffset={6}>Terminal</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <ToggleGroupItem
                                    value="preview"
                                    aria-label="Toggle preview"
                                    className="px-2 border-0 bg-transparent text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground aria-[pressed=false]:opacity-60 aria-[pressed=false]:bg-transparent aria-[pressed=true]:bg-accent/70 aria-[pressed=true]:text-foreground aria-[pressed=true]:opacity-100 aria-[pressed=true]:shadow-[0_0_0_1px_rgba(189,147,249,0.55)]"
                                >
                                    <PanelRightIcon className="size-4" />
                                </ToggleGroupItem>
                            </TooltipTrigger>
                            <TooltipContent sideOffset={6}>Preview</TooltipContent>
                        </Tooltip>
                    </ToggleGroup>
                </div>
            </header>

            <nav className={styles.mobilePanelTabs} aria-label="Playground panels">
                {mobilePanelTabs.map(panel => {
                    const Icon = panel.icon
                    const isActive = activeMobilePanel === panel.id
                    return (
                        <button
                            key={panel.id}
                            type="button"
                            className={styles.mobilePanelTab}
                            data-active={`${isActive}`}
                            aria-label={panel.label}
                            aria-pressed={isActive}
                            onClick={() => setActiveMobilePanel(panel.id)}
                            disabled={!panel.enabled}
                        >
                            <Icon className="size-4" />
                        </button>
                    )
                })}
            </nav>

            <div
                className={styles.workspace}
                ref={workspaceRef}
                style={{
                    '--sidebar-width': showSidebar ? `${sidebarWidth}px` : '0px',
                    '--preview-width': showPreview ? `${previewWidth}px` : '0px',
                    '--terminal-height': showTerminal ? `${terminalHeight}px` : '0px',
                }}
                data-sidebar={`${showSidebar}`}
                data-preview={`${showPreview}`}
                data-terminal={`${showTerminal}`}
                data-editor={`${showCenterPane}`}
                data-mobile-panel={activeMobilePanel}
            >
                {showSidebar && (
                    <aside className={styles.sidebar}>
                        <div className="flex items-center justify-between border-b border-border/60 px-3 py-2">
                            <div className="flex items-center gap-2 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                                Explorer
                            </div>
                            <div className="flex items-center gap-1">
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            type="button"
                                            size="icon-xs"
                                            variant="ghost"
                                            className="text-foreground/80 hover:bg-accent/40 hover:text-foreground"
                                            onClick={() => createEntry('file')}
                                        >
                                            <FilePlusIcon className="size-3.5" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent sideOffset={6}>New file</TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            type="button"
                                            size="icon-xs"
                                            variant="ghost"
                                            className="text-foreground/80 hover:bg-accent/40 hover:text-foreground"
                                            onClick={() => createEntry('folder')}
                                        >
                                            <FolderPlusIcon className="size-3.5" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent sideOffset={6}>New folder</TooltipContent>
                                </Tooltip>
                            </div>
                        </div>
                        <ScrollArea className="flex-1 min-h-0">
                            <div
                                className="px-2 py-2"
                                onDragOver={event => {
                                    event.preventDefault()
                                    setDragOverPath('')
                                }}
                                onDragLeave={() => setDragOverPath(null)}
                                onDrop={event => {
                                    event.preventDefault()
                                    const payload = getDragPayload(event)
                                    if (payload?.path) {
                                        if (payload.type === 'folder') {
                                            moveFolder(payload.path, '')
                                        } else {
                                            moveEntry(payload.path, '')
                                        }
                                    }
                                    setDragOverPath(null)
                                }}
                            >
                                <FileTree
                                    fileMap={fileMap}
                                    folderSet={folderSet}
                                    activeFile={activeFile}
                                    collapsedFolders={collapsedFolders}
                                    setCollapsedFolders={setCollapsedFolders}
                                    dragOverPath={dragOverPath}
                                    setDragOverPath={setDragOverPath}
                                    openFilePath={openFilePath}
                                    deleteEntry={deleteEntry}
                                    moveEntry={moveEntry}
                                    moveFolder={moveFolder}
                                    getParentFolder={getParentFolder}
                                    getDragPayload={getDragPayload}
                                    getFileAccent={getFileAccent}
                                />
                            </div>
                        </ScrollArea>
                    </aside>
                )}

                {showSidebar && (showCenterPane || showPreview) && (
                    <div className={styles.resizeHandle} onPointerDown={startDrag('sidebar')} />
                )}

                {showCenterPane && (
                    <main className={styles.editorPane}>
                        {showEditor && (
                            <div className={styles.editorSection}>
                                <EditorTabs
                                    openFiles={openFiles}
                                    activeFile={activeFile}
                                    dirtyFiles={dirtyFiles}
                                    savePulse={savePulse}
                                    onOpenFile={openFilePath}
                                    onCloseFile={closeFile}
                                    onSaveFile={saveFile}
                                    containerReady={containerReady}
                                />
                                <div className={styles.editor} ref={editorRef} />
                            </div>
                        )}
                        {showTerminal && (
                            <div className={styles.terminalSection}>
                                {showEditor && (
                                    <div className={styles.resizeHandleRow} onPointerDown={startDrag('terminal')} />
                                )}
                                <TerminalPanel
                                    terminalTabs={terminalTabs}
                                    activeTerminalId={activeTerminalId}
                                    onSelect={setActiveTerminalId}
                                    onAdd={addTerminalTab}
                                    containerReady={containerReady}
                                    setTerminalContainer={setTerminalContainer}
                                />
                            </div>
                        )}
                    </main>
                )}

                {showPreview && showCenterPane && (
                    <div className={styles.resizeHandle} onPointerDown={startDrag('preview')} />
                )}

                {showPreview && (
                    <aside className={styles.previewPane}>
                        <div className="flex items-center justify-between border-b border-border/60 bg-background/50 px-3 py-2 text-xs text-muted-foreground">
                            <div className="flex items-center gap-2">
                                <PanelRightIcon className="size-3.5 text-muted-foreground" />
                                Preview
                            </div>
                            <div className="flex items-center gap-2">
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                            onClick={() =>
                                                setPreviewUrl(value => (value ? withCacheBust(value) : value))
                                            }
                                            disabled={!previewUrl}
                                        >
                                            <RefreshCcwIcon className="size-3.5" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom" sideOffset={6}>
                                        Reload preview
                                    </TooltipContent>
                                </Tooltip>
                                <Badge variant="outline" className="border-border/60 text-[0.6rem] text-foreground/80">
                                    {previewUrl ? 'Live' : 'Idle'}
                                </Badge>
                            </div>
                        </div>
                        {previewUrl ? (
                            <iframe className={styles.preview} title="Boss preview" src={previewUrl} key={previewUrl} />
                        ) : (
                            <div className={styles.previewPlaceholder}>Waiting for the dev server…</div>
                        )}
                    </aside>
                )}
            </div>
        </section>
    )
}
