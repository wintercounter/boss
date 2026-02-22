import { SourceMapConsumer } from 'source-map-js'
import type { SourceLocation } from './types'

type ReadFile = (path: string) => Promise<string | null>

type StackFrame = [string, string, number, number, number, number, boolean]

export function createSourceResolver(readFile: ReadFile) {
    const sourceFetchCache = new Map<string, Promise<string | null>>()

    const fetchWithCache = async (url: string): Promise<string | null> => {
        if (sourceFetchCache.has(url)) {
            return sourceFetchCache.get(url) ?? null
        }
        const promise = fetchResource(url)
        sourceFetchCache.set(url, promise)
        return promise
    }

    const fetchResource = async (resource: string): Promise<string | null> => {
        if (resource.startsWith('http://') || resource.startsWith('https://')) {
            return fetch(resource)
                .then(response => (response.ok ? response.text() : null))
                .catch(() => null)
        }

        const filePath = toFilePath(resource)
        if (!filePath) return null
        try {
            return await readFile(filePath)
        } catch {
            return null
        }
    }

    const symbolicateSourceLocation = async (source: SourceLocation): Promise<SourceLocation | null> => {
        if (!shouldSymbolicateSource(source.fileName)) {
            return source
        }
        const mapped = await symbolicateSource(source.fileName, source.lineNumber, source.columnNumber)
        return mapped ?? source
    }

    const symbolicateSource = async (
        sourceURL: string,
        lineNumber: number,
        columnNumber: number,
    ): Promise<SourceLocation | null> => {
        if (!sourceURL || sourceURL.startsWith('<anonymous')) {
            return null
        }
        const resource = await fetchWithCache(sourceURL)
        if (!resource) return null

        const sourceMapURL = findSourceMapURL(resource, sourceURL)
        if (!sourceMapURL) return null
        const sourceMap = await fetchWithCache(sourceMapURL)
        if (!sourceMap) return null

        let parsed: any
        try {
            parsed = JSON.parse(sourceMap)
        } catch {
            return null
        }
        const consumer = new SourceMapConsumer(parsed)
        const original = consumer.originalPositionFor({
            line: lineNumber,
            column: Math.max(0, columnNumber - 1),
        })
        if (typeof (consumer as any).destroy === 'function') {
            ;(consumer as any).destroy()
        }
        if (!original?.source || !original.line || original.column == null) {
            return null
        }
        const mappedFile = resolveSourceURL(original.source, sourceMapURL)
        return {
            fileName: mappedFile,
            lineNumber: original.line,
            columnNumber: original.column + 1,
        }
    }

    const resolveSourceFromCandidates = async (candidates: SourceLocation[]): Promise<SourceLocation | null> => {
        for (const candidate of candidates) {
            const normalized = normalizeStackPath(candidate.fileName)
            const resolved = await symbolicateSourceLocation({
                fileName: normalized,
                lineNumber: candidate.lineNumber,
                columnNumber: candidate.columnNumber,
            })
            const finalSource = resolved ?? {
                fileName: normalized,
                lineNumber: candidate.lineNumber,
                columnNumber: candidate.columnNumber,
            }
            const normalizedFinal = normalizeStackPath(finalSource.fileName)
            if (shouldSkipStackPath(normalizedFinal)) continue
            return { ...finalSource, fileName: normalizedFinal }
        }
        return null
    }

    return {
        collectSourceCandidates,
        resolveSourceFromCandidates,
        describeFiber,
        collectStackSamples,
    }
}

export function collectSourceCandidates(fiber: any): SourceLocation[] {
    const candidates: SourceLocation[] = []
    for (let current = fiber; current; current = current.return) {
        const infoSources = extractDebugInfoSources(current)
        if (infoSources.length) {
            candidates.push(...infoSources)
        }
        const ownerInfoSources = extractDebugInfoSources(current?._debugOwner)
        if (ownerInfoSources.length) {
            candidates.push(...ownerInfoSources)
        }
        const stack = extractDebugStack(current)
        if (stack) {
            candidates.push(...extractOwnerStackLocations(stack))
            candidates.push(...extractComponentStackLocations(stack))
        }
        const ownerStackFallback = extractDebugStack(current?._debugOwner)
        if (ownerStackFallback) {
            candidates.push(...extractOwnerStackLocations(ownerStackFallback))
        }
    }
    return candidates
}

export function describeFiber(fiber: any) {
    if (!fiber) return null
    return {
        type: getFiberTypeName(fiber),
        tag: fiber.tag ?? null,
        key: fiber.key ?? null,
        hasDebugSource: Boolean(fiber._debugSource),
        hasDebugStack: typeof fiber._debugStack === 'string',
        hasDebugTaskStack: typeof fiber._debugTask?.stack === 'string',
        debugInfoLength: Array.isArray(fiber._debugInfo) ? fiber._debugInfo.length : 0,
        ownerType: getFiberTypeName(fiber._debugOwner),
    }
}

export function collectStackSamples(fiber: any, bossFiber: any) {
    const current = fiber ?? bossFiber
    const owner = current?._debugOwner
    return {
        debugStack: sampleStack(current?._debugStack),
        debugTaskStack: sampleStack(current?._debugTask?.stack),
        debugInfoStack: sampleStack(extractDebugInfoStack(current)),
        ownerDebugStack: sampleStack(owner?._debugStack),
        ownerDebugTaskStack: sampleStack(owner?._debugTask?.stack),
        ownerDebugInfoStack: sampleStack(extractDebugInfoStack(owner)),
    }
}

const CHROME_STACK_REGEXP = /^\s*at .*(\S+:\d+|\(native\))/m
const chromeFrameRegExp =
    /^ *at (?:(.+) \((?:(.+):(\d+):(\d+)|\<anonymous\>)\)|(?:async )?(.+):(\d+):(\d+)|\<anonymous\>)$/
const firefoxFrameRegExp = /^((?:.*".+")?[^@]*)@(.+):(\d+):(\d+)$/

const shouldSymbolicateSource = (fileName: string) => {
    return (
        fileName.startsWith('http://') ||
        fileName.startsWith('https://') ||
        fileName.startsWith('file://') ||
        fileName.startsWith('/') ||
        /^[A-Za-z]:[\\/]/.test(fileName)
    )
}

const extractDebugStack = (node: any): string | null => {
    const stack = node?._debugStack
    if (typeof stack === 'string') return stack
    if (stack && typeof stack === 'object' && typeof (stack as any).stack === 'string') {
        return (stack as any).stack
    }
    const taskStack = node?._debugTask?.stack
    if (typeof taskStack === 'string') return taskStack
    if (taskStack && typeof taskStack === 'object' && typeof (taskStack as any).stack === 'string') {
        return (taskStack as any).stack
    }
    return null
}

const extractDebugInfoSources = (node: any): SourceLocation[] => {
    const results: SourceLocation[] = []
    const info = node?._debugInfo
    if (!Array.isArray(info)) return results
    for (const entry of info) {
        if (!entry || typeof entry !== 'object') continue
        const stack = entry.stack
        if (!Array.isArray(stack)) continue
        for (const frame of stack) {
            if (!Array.isArray(frame)) continue
            const fileName = frame[1]
            const lineNumber = frame[2]
            const columnNumber = frame[3]
            if (typeof fileName !== 'string') continue
            if (typeof lineNumber !== 'number' || typeof columnNumber !== 'number') continue
            const normalized = normalizeStackPath(fileName)
            if (shouldSkipStackPath(normalized)) continue
            results.push({
                fileName: normalized,
                lineNumber,
                columnNumber: columnNumber + 1,
            })
        }
    }
    return results
}

const extractOwnerStackLocations = (stack: string): SourceLocation[] => {
    if (!stack.includes('react_stack_bottom_frame') && !stack.includes('react-stack-bottom-frame')) {
        return []
    }
    const stackTrace = parseStackTraceFromString(stack, 1)
    const results: SourceLocation[] = []
    for (let i = stackTrace.length - 1; i >= 0; i--) {
        const [, fileName, line, col, encLine, encCol] = stackTrace[i]
        if (!fileName || fileName.indexOf(':') === -1) continue
        const normalized = normalizeStackPath(fileName)
        results.push({
            fileName: normalized,
            lineNumber: encLine || line,
            columnNumber: encCol || col,
        })
    }
    return results
}

const extractComponentStackLocations = (stack: string): SourceLocation[] => {
    const stackTrace = parseStackTraceFromString(stack, 0)
    const results: SourceLocation[] = []
    for (let i = 0; i < stackTrace.length; i++) {
        const [, fileName, line, col, encLine, encCol] = stackTrace[i]
        if (!fileName || fileName.indexOf(':') === -1) continue
        const normalized = normalizeStackPath(fileName)
        results.push({
            fileName: normalized,
            lineNumber: encLine || line,
            columnNumber: encCol || col,
        })
    }
    return results
}

const parseStackTraceFromString = (stack: string, skipFrames: number): StackFrame[] => {
    if (stack.startsWith('Error: react-stack-top-frame\n')) {
        stack = stack.slice(29)
    }
    let idx = stack.indexOf('react_stack_bottom_frame')
    if (idx === -1) {
        idx = stack.indexOf('react-stack-bottom-frame')
    }
    if (idx !== -1) {
        idx = stack.lastIndexOf('\n', idx)
        stack = stack.slice(0, idx)
    }
    if (stack.match(CHROME_STACK_REGEXP)) {
        return parseStackTraceFromChrome(stack, skipFrames)
    }
    return parseStackTraceFromFirefox(stack, skipFrames)
}

const parseStackTraceFromChrome = (stack: string, skipFrames: number): StackFrame[] => {
    const frames = stack.split('\n')
    const parsed: StackFrame[] = []
    for (let i = skipFrames; i < frames.length; i++) {
        const match = chromeFrameRegExp.exec(frames[i])
        if (!match) continue
        let name = match[1] || ''
        let isAsync = match[8] === 'async '
        if (name === '<anonymous>') {
            name = ''
        } else if (name.startsWith('async ')) {
            name = name.slice(5)
            isAsync = true
        }
        let filename = match[2] || match[5] || ''
        if (filename === '<anonymous>') {
            filename = ''
        }
        const line = +(match[3] || match[6] || 0)
        const col = +(match[4] || match[7] || 0)
        parsed.push([name, filename, line, col, 0, 0, isAsync])
    }
    return parsed
}

const parseStackTraceFromFirefox = (stack: string, skipFrames: number): StackFrame[] => {
    let idx = stack.indexOf('react_stack_bottom_frame')
    if (idx === -1) {
        idx = stack.indexOf('react-stack-bottom-frame')
    }
    if (idx !== -1) {
        idx = stack.lastIndexOf('\n', idx)
        stack = stack.slice(0, idx)
    }
    const frames = stack.split('\n')
    const parsed: StackFrame[] = []
    for (let i = skipFrames; i < frames.length; i++) {
        const match = firefoxFrameRegExp.exec(frames[i])
        if (!match) continue
        const name = match[1] || ''
        const filename = match[2] || ''
        const line = +match[3]
        const col = +match[4]
        parsed.push([name, filename, line, col, 0, 0, false])
    }
    return parsed
}

const findSourceMapURL = (resource: string, sourceURL: string): string | null => {
    const lines = resource.split(/[\r\n]+/)
    for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i]
        if (!line) continue
        if (!line.startsWith('//#')) break
        const idx = line.indexOf('sourceMappingURL=')
        if (idx === -1) continue
        const raw = line.slice(idx + 'sourceMappingURL='.length)
        return resolveSourceMapURL(raw, sourceURL)
    }
    return null
}

const resolveSourceURL = (source: string, sourceMapURL: string): string => {
    if (
        source.startsWith('webpack://') ||
        source.startsWith('webpack-internal://') ||
        source.startsWith('file://') ||
        source.startsWith('[project]/')
    ) {
        return source
    }
    if (source.startsWith('/') || /^[A-Za-z]:[\\/]/.test(source)) {
        return source
    }
    if (sourceMapURL.startsWith('http://') || sourceMapURL.startsWith('https://')) {
        try {
            return new URL(source, sourceMapURL).toString()
        } catch {
            return source
        }
    }
    const basePath = toFilePath(sourceMapURL)
    if (basePath) {
        const dir = dirnamePath(basePath)
        if (dir) {
            return joinPath(dir, source)
        }
    }
    try {
        void new URL(source)
        return source
    } catch {
        return source
    }
}

const resolveSourceMapURL = (raw: string, sourceURL: string): string | null => {
    const decodedRaw = decodePath(raw)
    if (raw.startsWith('http://') || raw.startsWith('https://')) {
        return decodedRaw
    }
    if (sourceURL.startsWith('http://') || sourceURL.startsWith('https://')) {
        try {
            return new URL(decodedRaw, sourceURL).toString()
        } catch {
            return null
        }
    }
    const basePath = toFilePath(sourceURL)
    if (!basePath) return null
    if (decodedRaw.startsWith('file://')) return decodedRaw
    if (decodedRaw.startsWith('/') || /^[A-Za-z]:[\\/]/.test(decodedRaw)) return decodedRaw
    const dir = dirnamePath(basePath)
    if (!dir) return null
    return joinPath(dir, decodedRaw)
}

const toFilePath = (value: string): string | null => {
    if (!value) return null
    if (value.startsWith('file://')) {
        const raw = value.slice('file://'.length)
        return decodePath(raw)
    }
    if (value.startsWith('/') || /^[A-Za-z]:[\\/]/.test(value)) {
        return decodePath(value)
    }
    return null
}

const dirnamePath = (value: string): string | null => {
    const normalized = value.replace(/\\/g, '/')
    const idx = normalized.lastIndexOf('/')
    if (idx === -1) return null
    return normalized.slice(0, idx + 1)
}

const joinPath = (dir: string, relative: string): string => {
    if (!dir.endsWith('/')) {
        return `${dir}/${relative}`
    }
    return `${dir}${relative}`
}

const decodePath = (value: string): string => {
    if (!value.includes('%')) return value
    try {
        return decodeURIComponent(value)
    } catch {
        return value
    }
}

const shouldSkipStackPath = (fileName: string) => {
    if (fileName.includes('/_next/static/chunks/') && fileName.includes('next_dist_compiled')) return true
    if (fileName.includes('react-server-dom') || fileName.includes('react-dom') || fileName.includes('react.')) {
        return true
    }
    if (fileName.includes('/dist/parser/jsx/runtime')) return true
    if (fileName.includes('/dist/runtime')) return true
    if (fileName.includes('/dist/dev/runtime')) return true
    if (fileName.includes('/dist/dev/client')) return true
    if (fileName.includes('/dist/devtools-app')) return true
    if (fileName.startsWith('node:')) return true
    if (fileName.includes('internal/')) return true
    if (fileName.includes('/node_modules/')) return true
    if (fileName.includes('boss-css')) return true
    if (fileName.includes('webpack-internal:///(webpack)')) return true
    if (fileName.includes('webpack://_N_E/webpack')) return true
    return false
}

const normalizeStackPath = (fileName: string) => {
    if (fileName.startsWith('about://React/Server/')) {
        const raw = fileName.slice('about://React/Server/'.length)
        try {
            return decodeURIComponent(raw)
        } catch {
            return raw
        }
    }
    return fileName
}

const getFiberTypeName = (fiber: any) => {
    const type = fiber?.type
    if (!type) return null
    if (typeof type === 'string') return type
    if (typeof type === 'function') return type.displayName || type.name || 'anonymous'
    if (typeof type === 'object') return type.displayName || type.name || 'object'
    return typeof type
}

const extractDebugInfoStack = (node: any): string | null => {
    const info = node?._debugInfo
    if (!Array.isArray(info)) return null
    for (const entry of info) {
        if (!entry || typeof entry !== 'object') continue
        if (typeof entry.stack === 'string') return entry.stack
        if (typeof entry.ownerStack === 'string') return entry.ownerStack
    }
    return null
}

const sampleStack = (stack: unknown) => {
    if (!stack) return null
    const raw =
        typeof stack === 'string' ? stack : typeof (stack as any).stack === 'string' ? (stack as any).stack : null
    if (!raw) return null
    return raw.split('\n').slice(0, 6).join('\n')
}
