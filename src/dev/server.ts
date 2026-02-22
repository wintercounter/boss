import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { WebSocketServer } from 'ws'
import type { RawData } from 'ws'

import { DEFAULT_DEV_PORT } from '@/dev/shared.js'
import { createApi } from '@/api/server'
import { loadConfig } from '@/api/config'
import { getTokens, propMap } from '@/use/token/server'

type SourceLocation = {
    fileName: string
    lineNumber: number
    columnNumber: number
}

type SelectRequest = {
    type: 'select'
    id?: number
    source: SourceLocation
}

type EditRequest = {
    type: 'edit'
    id?: number
    source: SourceLocation
    path: string[]
    value: unknown
    kind: string
}

type ReadFileRequest = {
    type: 'read-file'
    id?: number
    path: string
}

type WriteFileRequest = {
    type: 'write-file'
    id?: number
    path: string
    content: string
}

type TokensRequest = {
    type: 'tokens'
    id?: number
}

type BossTypesRequest = {
    type: 'boss-types'
    id?: number
}

type HelloRequest = {
    type: 'hello'
    id?: number
    role?: 'devtools' | 'ai' | 'client' | 'unknown'
    page?: string
}

type EvalClientRequest = {
    type: 'eval-client'
    id?: number
    code?: string
    target?: string
}

type EvalClientResult = {
    type: 'eval-client-result'
    id?: number
    ok?: boolean
    result?: unknown
    error?: string
}

type AddPropRequest = {
    type: 'add-prop'
    id?: number
    source: SourceLocation
    path: string[]
    value: unknown
    kind: string
}

type ClientMessage =
    | SelectRequest
    | EditRequest
    | ReadFileRequest
    | WriteFileRequest
    | TokensRequest
    | BossTypesRequest
    | HelloRequest
    | EvalClientRequest
    | EvalClientResult
    | AddPropRequest

type PropEntry = {
    path: string[]
    value: string | number | boolean | null | Array<string | number | boolean>
    editable: boolean
    kind: string
    code?: string
}


type DevServerOptions = {
    port?: number
    maxPort?: number
    host?: string
}

const DEFAULT_MAX_PORT = DEFAULT_DEV_PORT + 49

export async function startDevServer({
    port = DEFAULT_DEV_PORT,
    maxPort = DEFAULT_MAX_PORT,
    host = '127.0.0.1',
}: DevServerOptions = {}) {
    let currentPort = port
    let server: WebSocketServer | null = null

    while (currentPort <= maxPort) {
        try {
            server = await listenOnPort(currentPort, host)
            break
        } catch (error) {
            if (isAddressInUse(error)) {
                currentPort += 1
                continue
            }
            throw error
        }
    }

    if (!server) {
        throw new Error(`No available ports in range ${port}-${maxPort}`)
    }

    const clients = new Map<any, { role: string; page?: string; lastSeen: number }>()
    const pendingEval = new Map<number, any>()

    const pickEvalTarget = (requester: any, target?: string | null) => {
        const candidates = Array.from(clients.entries()).filter(([socket, info]) => {
            if (socket === requester) return false
            if (!info) return false
            if (target && info.role !== target) return false
            return info.role === 'devtools' || info.role === 'client'
        })
        if (!candidates.length) return null
        candidates.sort((a, b) => (b[1]?.lastSeen ?? 0) - (a[1]?.lastSeen ?? 0))
        return candidates[0][0]
    }

    const cleanupClient = (socket: any) => {
        clients.delete(socket)
        for (const [id, requester] of pendingEval.entries()) {
            if (requester === socket) {
                pendingEval.delete(id)
            }
        }
    }

    server.on('connection', (socket: any) => {
        clients.set(socket, { role: 'unknown', lastSeen: Date.now() })
        socket.on('close', () => cleanupClient(socket))
        socket.on('error', () => cleanupClient(socket))
        socket.on('message', async (data: RawData) => {
            const message = parseClientMessage(data)
            if (!message) return

            const info = clients.get(socket)
            if (info) info.lastSeen = Date.now()

            try {
                if (message.type === 'select') {
                    const entries = await inspectSelection(message.source)
                    socket.send(
                        JSON.stringify({
                            type: 'select-result',
                            id: message.id,
                            props: entries,
                        }),
                    )
                } else if (message.type === 'edit') {
                    await applyEdit(message)
                    socket.send(JSON.stringify({ type: 'edit-result', id: message.id, ok: true }))
                } else if (message.type === 'add-prop') {
                    await applyAddProp(message)
                    socket.send(JSON.stringify({ type: 'add-prop-result', id: message.id, ok: true }))
                } else if (message.type === 'read-file') {
                    const content = await readFileForClient(message.path)
                    socket.send(JSON.stringify({ type: 'read-file-result', id: message.id, content }))
                } else if (message.type === 'write-file') {
                    await writeFileForClient(message.path, message.content)
                    socket.send(JSON.stringify({ type: 'write-file-result', id: message.id, ok: true }))
                } else if (message.type === 'tokens') {
                    const tokens = await getTokenSnapshot()
                    socket.send(JSON.stringify({ type: 'tokens-result', id: message.id, tokens }))
                } else if (message.type === 'boss-types') {
                    const content = await getBossTypes()
                    socket.send(JSON.stringify({ type: 'boss-types-result', id: message.id, content }))
                } else if (message.type === 'hello') {
                    const role = typeof message.role === 'string' ? message.role : 'unknown'
                    const page = typeof message.page === 'string' ? message.page : undefined
                    clients.set(socket, { role, page, lastSeen: Date.now() })
                } else if (message.type === 'eval-client') {
                    const id = typeof message.id === 'number' ? message.id : null
                    if (id === null) {
                        socket.send(JSON.stringify({ type: 'error', id: message.id, message: 'eval-client missing id.' }))
                        return
                    }
                    const code = typeof message.code === 'string' ? message.code : ''
                    if (!code) {
                        socket.send(
                            JSON.stringify({
                                type: 'eval-client-result',
                                id,
                                ok: false,
                                error: 'eval-client missing code.',
                            }),
                        )
                        return
                    }
                    const targetSocket = pickEvalTarget(socket, message.target ?? null)
                    if (!targetSocket) {
                        socket.send(
                            JSON.stringify({
                                type: 'eval-client-result',
                                id,
                                ok: false,
                                error: 'No devtools client connected for eval.',
                            }),
                        )
                        return
                    }
                    pendingEval.set(id, socket)
                    targetSocket.send(JSON.stringify({ type: 'eval-client', id, code }))
                } else if (message.type === 'eval-client-result') {
                    const id = typeof message.id === 'number' ? message.id : null
                    if (id === null) return
                    const requester = pendingEval.get(id)
                    if (!requester) return
                    pendingEval.delete(id)
                    requester.send(
                        JSON.stringify({
                            type: 'eval-client-result',
                            id,
                            ok: message.ok ?? true,
                            result: message.result,
                            error: message.error,
                        }),
                    )
                }
            } catch (error) {
                const err = error instanceof Error ? error.message : String(error)
                socket.send(JSON.stringify({ type: 'error', id: message.id, message: err }))
            }
        })
    })

    return { server, port: currentPort }
}

const listenOnPort = (port: number, host: string) => {
    return new Promise<WebSocketServer>((resolve, reject) => {
        const server = new WebSocketServer({ port, host })
        const onError = (error: Error) => {
            server.removeListener('listening', onListening)
            server.close()
            reject(error)
        }
        const onListening = () => {
            server.removeListener('error', onError)
            resolve(server)
        }
        server.once('error', onError)
        server.once('listening', onListening)
    })
}

const isAddressInUse = (error: unknown) => {
    return Boolean(error && typeof error === 'object' && 'code' in error && error.code === 'EADDRINUSE')
}

const parseClientMessage = (data: RawData): ClientMessage | null => {
    try {
        const parsed = JSON.parse(data.toString())
        if (!parsed || typeof parsed.type !== 'string') return null
        return parsed
    } catch {
        return null
    }
}

async function readFileForClient(filePath: string) {
    if (!filePath || typeof filePath !== 'string') return null
    const resolved = await resolveSourcePath(filePath)
    if (!(await fileExists(resolved))) return null
    return fs.readFile(resolved, 'utf8')
}

async function writeFileForClient(filePath: string, content: string) {
    if (!filePath || typeof filePath !== 'string') {
        throw new Error('Missing file path for write.')
    }
    const resolved = await resolveSourcePath(filePath)
    await fs.writeFile(resolved, content ?? '')
}

async function getTokenSnapshot() {
    const config = await loadConfig()
    await createApi(config)

    const tokens = getTokens() || {}
    const propGroups = Array.from(propMap.entries()).reduce(
        (acc, [group, values]) => {
            acc[group] = Array.from(values)
            return acc
        },
        {} as Record<string, string[]>,
    )

    return { tokens, propGroups }
}

async function getBossTypes() {
    const config = await loadConfig()
    const baseDir = process.cwd()
    const typesPath = path.join(baseDir, config.configDir ?? '.bo$$', 'index.d.ts')
    if (!(await fileExists(typesPath))) return null
    return fs.readFile(typesPath, 'utf8')
}

async function inspectSelection(source: SourceLocation): Promise<PropEntry[]> {
    const { code, offset, filePath, lineNumber, columnNumber, lineRange } = await readSourceFile(source)
    const tag = findBossTagAtOffset(code, offset, lineRange)
    if (!tag) {
        throw new Error(`Unable to find <$$> element in ${filePath}:${lineNumber}:${columnNumber}`)
    }
    return buildPropEntries(tag, code).entries
}

async function applyEdit(message: EditRequest) {
    const { source, path: propPath, value: rawValue, kind } = message
    const { code, offset, filePath, lineNumber, columnNumber, lineRange } = await readSourceFile(source)
    const tag = findBossTagAtOffset(code, offset, lineRange)
    if (!tag) {
        throw new Error(`Unable to find <$$> element in ${filePath}:${lineNumber}:${columnNumber}`)
    }

    const { index } = buildPropEntries(tag, code)
    const target = index.get(propPath.join('.'))
    if (!target) {
        throw new Error(`Unable to find prop "${propPath.join('.')}" for edit.`)
    }

    const parsedValue = parseValue(rawValue, kind)
    const replacement = formatValue(parsedValue, kind, target.meta)

    let start = 0
    let end = 0

    if (target.range) {
        start = target.range.start
        end = target.range.end
    } else if (target.attrRange) {
        start = target.attrRange.start
        end = target.attrRange.end
        const attrName = target.attrName ?? propPath[0] ?? 'prop'
        const valueText = kind === 'boolean' && parsedValue === true ? '' : `={${replacement}}`
        const nextAttr = `${attrName}${valueText}`
        const updated = replaceText(code, start, end, nextAttr)
        await fs.writeFile(filePath, updated)
        return
    }

    const updated = replaceText(code, start, end, replacement)
    await fs.writeFile(filePath, updated)
}

async function applyAddProp(message: AddPropRequest) {
    const { source, path: propPath, value: rawValue, kind } = message
    if (!propPath?.length) throw new Error('Missing prop path for add.')
    if (propPath.length > 1) {
        throw new Error('Nested prop insertion is not supported yet.')
    }

    const { code, offset, filePath, lineNumber, columnNumber, lineRange } = await readSourceFile(source)
    const tag = findBossTagAtOffset(code, offset, lineRange)
    if (!tag) {
        throw new Error(`Unable to find <$$> element in ${filePath}:${lineNumber}:${columnNumber}`)
    }

    const { index } = buildPropEntries(tag, code)
    const propKey = propPath.join('.')
    const target = index.get(propKey)
    if (target) {
        await applyEdit({ ...message, type: 'edit' })
        return
    }

    const parsedValue = parseValue(rawValue, kind)
    const replacement = formatValue(parsedValue, kind)
    const attrName = propPath[0]
    const attrText = formatAttribute(attrName, parsedValue, kind, replacement)

    const insertAt = code[tag.end - 2] === '/' ? tag.end - 2 : tag.end - 1
    const needsSpace = insertAt > 0 && !/\s/.test(code[insertAt - 1])
    const insertText = `${needsSpace ? ' ' : ''}${attrText}`
    const updated = replaceText(code, insertAt, insertAt, insertText)
    await fs.writeFile(filePath, updated)
}

async function readSourceFile(source: SourceLocation) {
    if (!source?.fileName) {
        throw new Error('Missing source file name for selection.')
    }

    const resolvedPath = await resolveSourcePath(source.fileName)
    const lineNumber = Number.isFinite(source.lineNumber) ? Math.max(1, source.lineNumber) : 1
    const columnNumber = Number.isFinite(source.columnNumber) ? Math.max(1, source.columnNumber) : 1
    const code = await fs.readFile(resolvedPath, 'utf8')
    const lineOffsets = buildLineOffsets(code)
    const offset = offsetFromLineColumn(lineNumber, columnNumber - 1, lineOffsets)
    const lineRange = getLineRange(lineNumber, lineOffsets, code.length)

    return {
        code,
        filePath: resolvedPath,
        offset,
        lineRange,
        lineNumber,
        columnNumber,
    }
}

const decodePath = (value: string) => {
    try {
        return decodeURIComponent(value)
    } catch {
        return value
    }
}

const isExplicitSource = (value: string) => {
    return (
        value.startsWith('file://') ||
        value.startsWith('webpack://') ||
        value.startsWith('webpack-internal://') ||
        value.startsWith('http://') ||
        value.startsWith('https://') ||
        value.startsWith('[project]/') ||
        path.isAbsolute(value)
    )
}

const normalizeWebpackPath = (value: string) => {
    let cleaned = value.replace(/^webpack-internal:\/\//, '').replace(/^webpack:\/\//, '')
    cleaned = cleaned.replace(/^_N_E\//, '')
    cleaned = cleaned.replace(/^\.\//, '')
    cleaned = cleaned.replace(/^\/+/, '')
    return decodePath(cleaned)
}

const stripQueryHash = (value: string) => value.split('?')[0].split('#')[0]

const resolveSourcePath = async (fileName: string, sourceRoot?: string) => {
    let candidate = stripQueryHash(fileName)

    if (sourceRoot && !isExplicitSource(candidate)) {
        let root = sourceRoot
        if (root.startsWith('file://')) {
            root = fileURLToPath(root)
        } else if (root.startsWith('webpack://')) {
            root = normalizeWebpackPath(root)
        } else if (root.startsWith('[project]/')) {
            root = root.slice('[project]/'.length)
        }
        candidate = path.join(root, candidate)
    }

    if (candidate.startsWith('file://')) {
        return fileURLToPath(candidate)
    }

    if (candidate.startsWith('http://') || candidate.startsWith('https://')) {
        try {
            const url = new URL(candidate)
            const pathname = decodePath(url.pathname)
            const trimmed = pathname.replace(/^\/+/, '')
            const found = await findExistingPath(trimmed)
            return found ?? path.resolve(trimmed)
        } catch {
            return path.resolve(candidate)
        }
    }

    if (candidate.startsWith('webpack://')) {
        const cleaned = normalizeWebpackPath(candidate)
        const found = await findExistingPath(cleaned)
        return found ?? path.resolve(cleaned)
    }

    if (candidate.startsWith('webpack-internal://')) {
        const cleaned = normalizeWebpackPath(candidate)
        const found = await findExistingPath(cleaned)
        return found ?? path.resolve(cleaned)
    }

    if (candidate.startsWith('[project]/')) {
        const cleaned = decodePath(candidate.slice('[project]/'.length))
        const found = await findExistingPath(cleaned)
        return found ?? path.resolve(cleaned)
    }

    if (path.isAbsolute(candidate)) {
        return candidate
    }

    const found = await findExistingPath(candidate)
    return found ?? path.resolve(candidate)
}

const findExistingPath = async (relativePath: string) => {
    let current = process.cwd()
    for (let i = 0; i < 8; i++) {
        const candidate = path.resolve(current, relativePath)
        if (await fileExists(candidate)) return candidate
        const parent = path.dirname(current)
        if (parent === current) break
        current = parent
    }
    return null
}

const fileExists = async (filePath: string) => {
    try {
        await fs.access(filePath)
        return true
    } catch {
        return false
    }
}

const buildLineOffsets = (code: string) => {
    const offsets = [0]
    for (let i = 0; i < code.length; i++) {
        if (code[i] === '\n') {
            offsets.push(i + 1)
        }
    }
    return offsets
}

const offsetFromLineColumn = (lineNumber: number, columnNumber: number, offsets: number[]) => {
    const lineIndex = Math.max(0, lineNumber - 1)
    const lineStart = offsets[lineIndex] ?? offsets[offsets.length - 1] ?? 0
    return lineStart + Math.max(0, columnNumber)
}

const getLineRange = (lineNumber: number, offsets: number[], codeLength: number) => {
    const lineIndex = Math.max(0, lineNumber - 1)
    const start = offsets[lineIndex] ?? 0
    const end = offsets[lineIndex + 1] ?? codeLength
    return { start, end }
}

type TextRange = { start: number; end: number }
type ParsedNode =
    | { kind: 'string'; value: string; range: TextRange; quote: "'" | '"' }
    | { kind: 'number'; value: number; range: TextRange }
    | { kind: 'boolean'; value: boolean; range: TextRange }
    | { kind: 'array'; value: ParsedNode[]; range: TextRange }
    | { kind: 'object'; value: Record<string, ParsedNode>; range: TextRange }
    | { kind: 'unknown'; range: TextRange; code: string }
type ParsedAttr = {
    name: string
    value: ParsedNode | null
    range: TextRange
}
type ParsedTag = {
    start: number
    end: number
    attrs: ParsedAttr[]
}
type PropTarget = {
    attrName: string
    range?: TextRange
    attrRange: TextRange
    kind: string
    meta?: { quote?: "'" | '"' }
}

type ParsedStringNode = Extract<ParsedNode, { kind: 'string' }>

const findBossTagAtOffset = (code: string, offset: number, lineRange?: { start: number; end: number }) => {
    const startIndex = Math.min(Math.max(offset, 0), code.length)
    const minIndex = 0
    for (let i = startIndex; i >= minIndex; i--) {
        if (code[i] !== '<') continue
        const next = code[i + 1]
        if (next === '/' || next == null) continue
        if (!code.startsWith('$$', i + 1)) continue
        const tag = parseBossTag(code, i)
        if (!tag) continue
        if (offset >= tag.start && offset <= tag.end) return tag
        if (lineRange && tag.start <= lineRange.end && tag.end >= lineRange.start) return tag
    }
    return null
}

const parseBossTag = (code: string, start: number): ParsedTag | null => {
    let i = start + 1
    if (!code.startsWith('$$', i)) return null
    i += 2
    while (i < code.length && isTagNameChar(code[i])) i++

    const attrs: ParsedAttr[] = []
    while (i < code.length) {
        i = skipWhitespace(code, i)
        if (code[i] === '/' && code[i + 1] === '>') {
            return { start, end: i + 2, attrs }
        }
        if (code[i] === '>') {
            return { start, end: i + 1, attrs }
        }
        if (code[i] === '{' && code.slice(i, i + 4) === '{...') {
            const end = findMatchingBrace(code, i)
            if (end === -1) return null
            i = end + 1
            continue
        }

        const nameStart = i
        while (i < code.length && isAttrNameChar(code[i])) i++
        if (i === nameStart) return null
        const name = code.slice(nameStart, i)
        let attrRange: TextRange = { start: nameStart, end: i }
        i = skipWhitespace(code, i)
        let value: ParsedNode | null = null

        if (code[i] === '=') {
            i += 1
            i = skipWhitespace(code, i)
            const valueStart = i
            if (code[i] === '"' || code[i] === "'") {
                const parsed = parseStringLiteral(code, i)
                if (!parsed) return null
                value = parsed.node
                i = parsed.next
            } else if (code[i] === '{') {
                const end = findMatchingBrace(code, i)
                if (end === -1) return null
                const parsed = parseExpression(code, i + 1, end)
                value = parsed
                i = end + 1
            } else {
                const end = findAttributeValueEnd(code, i)
                value = {
                    kind: 'unknown',
                    range: { start: valueStart, end },
                    code: code.slice(valueStart, end),
                }
                i = end
            }
            attrRange = { start: nameStart, end: i }
        }

        attrs.push({ name, value, range: attrRange })
    }
    return null
}

const isTagNameChar = (char: string) => /[A-Za-z0-9_$.\-]/.test(char)
const isAttrNameChar = (char: string) => /[A-Za-z0-9_$:\-]/.test(char)
const skipWhitespace = (code: string, index: number) => {
    let i = index
    while (i < code.length && /\s/.test(code[i])) i++
    return i
}

const findAttributeValueEnd = (code: string, index: number) => {
    let i = index
    while (i < code.length && !/\s/.test(code[i]) && code[i] !== '>' && code[i] !== '/') i++
    return i
}

const findMatchingBrace = (code: string, start: number) => {
    let depth = 0
    let quote: '"' | "'" | '`' | null = null
    for (let i = start; i < code.length; i++) {
        const char = code[i]
        if (quote) {
            if (char === '\\') {
                i += 1
                continue
            }
            if (char === quote) {
                quote = null
            }
            continue
        }
        if (char === '"' || char === "'" || char === '`') {
            quote = char
            continue
        }
        if (char === '{') depth += 1
        if (char === '}') {
            depth -= 1
            if (depth === 0) return i
        }
    }
    return -1
}

const parseStringLiteral = (code: string, start: number): { node: ParsedStringNode; next: number } | null => {
    const quote = code[start]
    let i = start + 1
    let value = ''
    while (i < code.length) {
        const char = code[i]
        if (char === '\\') {
            const next = code[i + 1]
            if (next) {
                value += next
                i += 2
                continue
            }
        }
        if (char === quote) {
            const end = i + 1
            return {
                node: {
                    kind: 'string',
                    value,
                    range: { start, end },
                    quote: quote as "'" | '"',
                },
                next: end,
            }
        }
        value += char
        i += 1
    }
    return null
}

const parseExpression = (code: string, start: number, end: number): ParsedNode => {
    const parser = new ExpressionParser(code, start, end)
    const node = parser.parseValue()
    parser.skipWhitespace()
    if (!node || parser.index < end) {
        return {
            kind: 'unknown',
            range: { start, end },
            code: code.slice(start, end),
        }
    }
    return node
}

class ExpressionParser {
    code: string
    index: number
    end: number

    constructor(code: string, start: number, end: number) {
        this.code = code
        this.index = start
        this.end = end
    }

    skipWhitespace() {
        this.index = skipWhitespace(this.code, this.index)
    }

    parseValue(): ParsedNode | null {
        this.skipWhitespace()
        if (this.index >= this.end) return null
        const char = this.code[this.index]
        if (char === '"' || char === "'") {
            const parsed = parseStringLiteral(this.code, this.index)
            if (!parsed || parsed.next > this.end) return null
            this.index = parsed.next
            return parsed.node
        }
        if (char === '[') {
            return this.parseArray()
        }
        if (char === '{') {
            return this.parseObject()
        }
        if (char === '-' || /\d/.test(char)) {
            return this.parseNumber()
        }
        if (this.code.startsWith('true', this.index)) {
            const range = { start: this.index, end: this.index + 4 }
            this.index += 4
            return { kind: 'boolean', value: true, range }
        }
        if (this.code.startsWith('false', this.index)) {
            const range = { start: this.index, end: this.index + 5 }
            this.index += 5
            return { kind: 'boolean', value: false, range }
        }
        return null
    }

    parseNumber(): ParsedNode | null {
        const start = this.index
        let i = this.index
        if (this.code[i] === '-') i++
        while (i < this.end && /\d/.test(this.code[i])) i++
        if (i < this.end && this.code[i] === '.') {
            i++
            while (i < this.end && /\d/.test(this.code[i])) i++
        }
        const raw = this.code.slice(start, i)
        const value = Number(raw)
        if (Number.isNaN(value)) return null
        this.index = i
        return { kind: 'number', value, range: { start, end: i } }
    }

    parseArray(): ParsedNode | null {
        const start = this.index
        this.index += 1
        const values: ParsedNode[] = []
        while (this.index < this.end) {
            this.skipWhitespace()
            if (this.code[this.index] === ']') {
                const end = this.index + 1
                this.index = end
                return { kind: 'array', value: values, range: { start, end } }
            }
            const value = this.parseValue()
            if (!value) return null
            values.push(value)
            this.skipWhitespace()
            if (this.code[this.index] === ',') {
                this.index += 1
                continue
            }
            if (this.code[this.index] === ']') {
                continue
            }
            return null
        }
        return null
    }

    parseObject(): ParsedNode | null {
        const start = this.index
        this.index += 1
        const value: Record<string, ParsedNode> = {}
        while (this.index < this.end) {
            this.skipWhitespace()
            if (this.code[this.index] === '}') {
                const end = this.index + 1
                this.index = end
                return { kind: 'object', value, range: { start, end } }
            }
            const key = this.parseObjectKey()
            if (!key) return null
            this.skipWhitespace()
            if (this.code[this.index] !== ':') return null
            this.index += 1
            const val = this.parseValue()
            if (!val) return null
            value[key] = val
            this.skipWhitespace()
            if (this.code[this.index] === ',') {
                this.index += 1
                continue
            }
            if (this.code[this.index] === '}') {
                continue
            }
            return null
        }
        return null
    }

    parseObjectKey(): string | null {
        this.skipWhitespace()
        const char = this.code[this.index]
        if (char === '"' || char === "'") {
            const parsed = parseStringLiteral(this.code, this.index)
            if (!parsed || parsed.next > this.end) return null
            this.index = parsed.next
            return parsed.node.value
        }
        const start = this.index
        if (!/[A-Za-z_$]/.test(char)) return null
        let i = this.index + 1
        while (i < this.end && /[A-Za-z0-9_$]/.test(this.code[i])) i++
        this.index = i
        return this.code.slice(start, i)
    }
}

const buildPropEntries = (tag: ParsedTag, code: string) => {
    const entries: PropEntry[] = []
    const index = new Map<string, PropTarget>()

    for (const attr of tag.attrs) {
        if (!attr.value) {
            entries.push({ path: [attr.name], value: true, editable: true, kind: 'boolean' })
            index.set(attr.name, {
                attrName: attr.name,
                attrRange: attr.range,
                kind: 'boolean',
            })
            continue
        }
        collectParsedNode(attr.value, [attr.name], attr, entries, index, code)
    }

    return { entries, index }
}

const collectParsedNode = (
    node: ParsedNode,
    path: string[],
    attr: ParsedAttr,
    entries: PropEntry[],
    index: Map<string, PropTarget>,
    code: string,
) => {
    if (node.kind === 'string') {
        entries.push({ path, value: node.value, editable: true, kind: 'string' })
        index.set(path.join('.'), {
            attrName: attr.name,
            attrRange: attr.range,
            range: node.range,
            kind: 'string',
            meta: { quote: node.quote },
        })
        return
    }
    if (node.kind === 'number') {
        entries.push({ path, value: node.value, editable: true, kind: 'number' })
        index.set(path.join('.'), {
            attrName: attr.name,
            attrRange: attr.range,
            range: node.range,
            kind: 'number',
        })
        return
    }
    if (node.kind === 'boolean') {
        entries.push({ path, value: node.value, editable: true, kind: 'boolean' })
        index.set(path.join('.'), {
            attrName: attr.name,
            attrRange: attr.range,
            range: node.range,
            kind: 'boolean',
        })
        return
    }
    if (node.kind === 'array') {
        if (node.value.every(isPrimitiveNode)) {
            entries.push({
                path,
                value: node.value.map(item => (item as any).value),
                editable: true,
                kind: 'array',
            })
            index.set(path.join('.'), {
                attrName: attr.name,
                attrRange: attr.range,
                range: node.range,
                kind: 'array',
            })
        } else {
            entries.push({
                path,
                value: null,
                editable: false,
                kind: 'expression',
                code: codeFromRange(code, node.range),
            })
        }
        return
    }
    if (node.kind === 'object') {
        for (const [key, value] of Object.entries(node.value)) {
            collectParsedNode(value, [...path, key], attr, entries, index, code)
        }
        return
    }

    entries.push({
        path,
        value: null,
        editable: false,
        kind: 'expression',
        code: node.code,
    })
}

const isPrimitiveNode = (node: ParsedNode) => node.kind === 'string' || node.kind === 'number' || node.kind === 'boolean'

const codeFromRange = (code: string, range: TextRange) => {
    return code.slice(range.start, range.end)
}

const parseValue = (rawValue: unknown, kind: string) => {
    if (kind === 'number') {
        const num = typeof rawValue === 'number' ? rawValue : Number(rawValue)
        if (Number.isNaN(num)) throw new Error('Invalid number value.')
        return num
    }

    if (kind === 'boolean') {
        if (typeof rawValue === 'boolean') return rawValue
        if (rawValue === 'true') return true
        if (rawValue === 'false') return false
        throw new Error('Invalid boolean value.')
    }

    if (kind === 'array') {
        if (Array.isArray(rawValue)) return rawValue
        if (typeof rawValue === 'string') {
            const parsed = JSON.parse(rawValue)
            if (!Array.isArray(parsed)) throw new Error('Array value must be a JSON array.')
            return parsed
        }
        throw new Error('Invalid array value.')
    }

    if (kind === 'string') {
        return String(rawValue)
    }

    return rawValue
}

const formatValue = (value: unknown, kind: string, meta?: { quote?: "'" | '"' }) => {
    if (kind === 'string') {
        return formatString(String(value ?? ''), meta?.quote)
    }

    if (kind === 'number') {
        return String(value)
    }

    if (kind === 'boolean') {
        return value ? 'true' : 'false'
    }

    if (kind === 'array') {
        if (!Array.isArray(value)) throw new Error('Array value must be an array.')
        return `[${value.map(formatArrayItem).join(', ')}]`
    }

    return String(value)
}

const formatAttribute = (name: string, value: unknown, kind: string, formattedValue: string) => {
    if (kind === 'boolean' && value === true) {
        return name
    }
    if (kind === 'string') {
        return `${name}=${formattedValue}`
    }
    return `${name}={${formattedValue}}`
}

const formatArrayItem = (value: unknown) => {
    if (typeof value === 'string') return formatString(value, '"')
    if (typeof value === 'number') return String(value)
    if (typeof value === 'boolean') return value ? 'true' : 'false'
    return 'null'
}

const formatString = (value: string, quote?: "'" | '"') => {
    const useQuote = quote ?? '"'
    const escaped = value
        .replace(/\\/g, '\\\\')
        .replace(new RegExp(useQuote, 'g'), `\\${useQuote}`)
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
    return `${useQuote}${escaped}${useQuote}`
}

const replaceText = (code: string, start: number, end: number, replacement: string) => {
    return code.slice(0, start) + replacement + code.slice(end)
}
