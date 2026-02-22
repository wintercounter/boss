import * as React from 'react'
import type * as Monaco from 'monaco-editor'
import { darculaTheme } from './darculaTheme'

const MONACO_CDN = 'https://cdn.jsdelivr.net/npm/monaco-editor@0.55.1/min/vs'
const MONACO_THEME = 'darcula'
const BOSS_TYPES_URI = 'file:///boss/index.d.ts'

type MonacoNamespace = typeof Monaco
type MonacoAmdRequire = ((deps: string[], callback: () => void) => void) & {
    config: (options: { paths: Record<string, string> }) => void
}

type MonacoWindow = Window & {
    monaco?: MonacoNamespace
    require?: MonacoAmdRequire
    MonacoEnvironment?: { getWorkerUrl?: () => string }
    __bossMonacoPromise?: Promise<MonacoNamespace>
    __bossMonacoThemeReady?: boolean
    __bossMonacoTsConfigured?: boolean
}

type SourceEditorProps = {
    value: string
    fileName?: string | null
    bossTypes?: string | null
    className?: string
    onChange: (value: string) => void
}

export function SourceEditor({ value, fileName, bossTypes, className, onChange }: SourceEditorProps) {
    const containerRef = React.useRef<HTMLDivElement | null>(null)
    const editorRef = React.useRef<Monaco.editor.IStandaloneCodeEditor | null>(null)
    const modelRef = React.useRef<Monaco.editor.ITextModel | null>(null)
    const lastValueRef = React.useRef(value)
    const bossTypesRef = React.useRef<string | null>(null)
    const bossTypesDisposableRef = React.useRef<Monaco.IDisposable | null>(null)
    const onChangeRef = React.useRef(onChange)

    React.useEffect(() => {
        onChangeRef.current = onChange
    }, [onChange])

    const applyBossTypes = React.useCallback(
        (monaco: MonacoNamespace, nextTypes?: string | null) => {
            if (!nextTypes) return
            if (bossTypesRef.current === nextTypes) return
            bossTypesDisposableRef.current?.dispose()
            const defaults = (monaco as any).languages?.typescript?.typescriptDefaults
            if (!defaults) return
            bossTypesDisposableRef.current = defaults.addExtraLib(nextTypes, BOSS_TYPES_URI)
            bossTypesRef.current = nextTypes
        },
        [],
    )

    const applyModel = React.useCallback(
        (monaco: MonacoNamespace, nextFileName: string | null, nextValue: string) => {
            const editor = editorRef.current
            if (!editor) return
            const language = detectLanguage(nextFileName)
            const uri = nextFileName
                ? monaco.Uri.file(nextFileName)
                : monaco.Uri.parse('inmemory://boss/source.tsx')
            let model = monaco.editor.getModel(uri)
            if (!model) {
                model = monaco.editor.createModel(nextValue, language, uri)
            } else {
                monaco.editor.setModelLanguage(model, language)
                if (model.getValue() !== nextValue) {
                    lastValueRef.current = nextValue
                    model.setValue(nextValue)
                }
            }
            if (modelRef.current && modelRef.current !== model) {
                modelRef.current.dispose()
            }
            modelRef.current = model
            editor.setModel(model)
        },
        [],
    )

    React.useEffect(() => {
        if (typeof window === 'undefined') return undefined

        let disposed = false

        void loadMonaco()
            .then(monaco => {
                if (disposed) return
                ensureTheme(monaco)
                ensureTypescriptDefaults(monaco)

                const container = containerRef.current
                if (!container) return

                if (!editorRef.current) {
                    monaco.editor.setTheme(MONACO_THEME)
                    editorRef.current = monaco.editor.create(container, {
                        value,
                        language: detectLanguage(fileName),
                        theme: MONACO_THEME,
                        minimap: { enabled: false },
                        scrollBeyondLastLine: false,
                        scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8 },
                        fontSize: 12,
                        lineHeight: 18,
                        padding: { top: 10, bottom: 10 },
                        fontFamily: 'IBM Plex Mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                        wordWrap: 'on',
                        automaticLayout: true,
                    })
                    editorRef.current.onDidChangeModelContent(() => {
                        const editor = editorRef.current
                        if (!editor) return
                        const nextValue = editor.getValue()
                        if (nextValue === lastValueRef.current) return
                        lastValueRef.current = nextValue
                        onChangeRef.current(nextValue)
                    })
                }

                applyModel(monaco, fileName ?? null, value)
                applyBossTypes(monaco, bossTypes)
                monaco.editor.setTheme(MONACO_THEME)
            })
            .catch(() => {})

        return () => {
            disposed = true
            editorRef.current?.dispose()
            editorRef.current = null
            modelRef.current?.dispose()
            modelRef.current = null
            bossTypesDisposableRef.current?.dispose()
            bossTypesDisposableRef.current = null
        }
    }, [applyBossTypes, applyModel])

    React.useEffect(() => {
        if (!monacoLoaded()) return
        const win = window as unknown as MonacoWindow
        if (!win.monaco) return
        applyBossTypes(win.monaco, bossTypes)
    }, [applyBossTypes, bossTypes])

    React.useEffect(() => {
        if (!monacoLoaded()) return
        const win = window as unknown as MonacoWindow
        if (!win.monaco) return
        applyModel(win.monaco, fileName ?? null, value)
    }, [applyModel, fileName, value])

    React.useEffect(() => {
        const editor = editorRef.current
        const model = editor?.getModel()
        if (!editor || !model) return
        if (value === lastValueRef.current) return
        lastValueRef.current = value
        model.setValue(value)
    }, [value])

    return (
        <div className={className}>
            <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
        </div>
    )
}

const loadMonaco = () => {
    const win = window as unknown as MonacoWindow
    if (win.monaco) return Promise.resolve(win.monaco)
    if (win.__bossMonacoPromise) return win.__bossMonacoPromise

    win.__bossMonacoPromise = new Promise((resolve, reject) => {
        const onLoaderReady = () => {
            const requireFn = win.require
            if (!requireFn) {
                reject(new Error('Monaco loader missing'))
                return
            }
            requireFn.config({ paths: { vs: MONACO_CDN } })
            win.MonacoEnvironment = win.MonacoEnvironment ?? {}
            win.MonacoEnvironment.getWorkerUrl = () => `${MONACO_CDN}/base/worker/workerMain.js`
            requireFn(['vs/editor/editor.main'], () => {
                const monaco = win.monaco
                if (!monaco) {
                    reject(new Error('Monaco failed to load'))
                    return
                }
                resolve(monaco)
            })
        }

        const existing = document.querySelector<HTMLScriptElement>('script[data-boss-monaco-loader="true"]')
        if (existing) {
            existing.addEventListener('load', onLoaderReady, { once: true })
            existing.addEventListener('error', () => reject(new Error('Monaco loader failed')), { once: true })
            return
        }

        const script = document.createElement('script')
        script.src = `${MONACO_CDN}/loader.js`
        script.async = true
        script.dataset.bossMonacoLoader = 'true'
        script.onload = onLoaderReady
        script.onerror = () => reject(new Error('Monaco loader failed'))
        document.head.appendChild(script)
    })

    return win.__bossMonacoPromise
}

const monacoLoaded = () => typeof window !== 'undefined' && Boolean((window as unknown as MonacoWindow).monaco)

const ensureTheme = (monaco: MonacoNamespace) => {
    const win = window as unknown as MonacoWindow
    if (win.__bossMonacoThemeReady) return
    monaco.editor.defineTheme(MONACO_THEME, darculaTheme)
    win.__bossMonacoThemeReady = true
}

const ensureTypescriptDefaults = (monaco: MonacoNamespace) => {
    const win = window as unknown as MonacoWindow
    if (win.__bossMonacoTsConfigured) return
    const monacoAny = monaco as any
    const defaults = monacoAny.languages?.typescript?.typescriptDefaults
    if (!defaults) return
    defaults.setCompilerOptions({
        jsx: monacoAny.languages.typescript.JsxEmit.ReactJSX,
        target: monacoAny.languages.typescript.ScriptTarget.ESNext,
        moduleResolution: monacoAny.languages.typescript.ModuleResolutionKind.NodeJs,
        allowJs: true,
        allowNonTsExtensions: true,
    })
    win.__bossMonacoTsConfigured = true
}

const detectLanguage = (fileName?: string | null) => {
    if (!fileName) return 'typescript'
    const normalized = fileName.toLowerCase()
    if (normalized.endsWith('.tsx')) return 'typescriptreact'
    if (normalized.endsWith('.ts')) return 'typescript'
    if (normalized.endsWith('.jsx')) return 'javascriptreact'
    if (normalized.endsWith('.js')) return 'javascript'
    return 'typescript'
}
