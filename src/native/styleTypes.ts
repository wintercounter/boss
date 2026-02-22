import fs from 'node:fs/promises'
import path from 'node:path'
import { createRequire } from 'node:module'
import fg from 'fast-glob'

type StyleProp = {
    name: string
    type: string
    description?: string
}

type InterfaceEntry = {
    name: string
    extends: string[]
    props: Map<string, StyleProp>
}

const interfaceNames = new Set(['ViewStyle', 'TextStyle', 'ImageStyle'])

const normalizeType = (value: string) => value.replace(/\s+/g, ' ').replace(/;$/, '').trim()

const parseInterfaces = (source: string) => {
    const interfaces = new Map<string, InterfaceEntry>()
    const lines = source.split('\n')
    let current: InterfaceEntry | null = null
    let comment: string[] = []
    let pendingProp: { name: string; type: string } | null = null

    const interfaceRegexp = /^\s*(?:export\s+)?interface\s+([A-Za-z0-9_]+)(?:\s+extends\s+([^ {]+(?:\s*,\s*[^ {]+)*))?\s*\{/
    const propRegexp = /^\s+(?:readonly\s+)?["']?([A-Za-z0-9_]+)["']?\??:\s*(.+)$/

    for (const line of lines) {
        const interfaceMatch = line.match(interfaceRegexp)
        if (interfaceMatch) {
            const [, name, extendsRaw] = interfaceMatch
            const entry: InterfaceEntry = {
                name,
                extends: extendsRaw ? extendsRaw.split(',').map(value => value.trim()) : [],
                props: new Map(),
            }
            interfaces.set(name, entry)
            current = entry
            comment = []
            pendingProp = null
            continue
        }

        if (current && line.trim() === '}') {
            current = null
            comment = []
            pendingProp = null
            continue
        }

        if (!current) continue

        if (line.trim().startsWith('/**')) {
            const trimmed = line.trim().replace(/^\/\*\* ?/, '')
            if (trimmed.includes('*/')) {
                comment = [trimmed.replace(/\*\/$/, '').trim()]
            } else {
                comment = [trimmed]
            }
            continue
        }

        if (comment.length && line.trim().startsWith('*')) {
            const trimmed = line.trim().replace(/^\* ?/, '')
            if (!trimmed.endsWith('*/')) {
                comment.push(trimmed)
                continue
            }
            comment.push(trimmed.replace(/\*\/$/, '').trim())
            continue
        }

        if (pendingProp) {
            pendingProp.type += ` ${line.trim()}`
            if (line.includes(';')) {
                const propType = normalizeType(pendingProp.type)
                current.props.set(pendingProp.name, {
                    name: pendingProp.name,
                    type: propType,
                    description: comment.join('\n').trim() || undefined,
                })
                pendingProp = null
                comment = []
            }
            continue
        }

        const propMatch = line.match(propRegexp)
        if (!propMatch) continue

        const [, rawName, typeRaw] = propMatch
        if (rawName.startsWith('[')) continue

        const typeValue = typeRaw.trim()
        if (!line.includes(';')) {
            pendingProp = { name: rawName, type: typeValue }
            continue
        }

        current.props.set(rawName, {
            name: rawName,
            type: normalizeType(typeValue),
            description: comment.join('\n').trim() || undefined,
        })
        comment = []
    }

    return interfaces
}

const mergeProps = (target: Map<string, StyleProp>, source: Map<string, StyleProp>) => {
    for (const [name, prop] of source.entries()) {
        const existing = target.get(name)
        if (!existing) {
            target.set(name, { ...prop })
            continue
        }
        if (existing.type !== prop.type) {
            const types = new Set([existing.type, prop.type])
            existing.type = Array.from(types).join(' | ')
        }
        if (!existing.description && prop.description) {
            existing.description = prop.description
        }
    }
}

const collectProps = (
    name: string,
    interfaces: Map<string, InterfaceEntry>,
    visited = new Set<string>(),
) => {
    if (visited.has(name)) return new Map()
    visited.add(name)

    const entry = interfaces.get(name)
    if (!entry) return new Map()

    const merged = new Map<string, StyleProp>()
    for (const parent of entry.extends) {
        mergeProps(merged, collectProps(parent, interfaces, visited))
    }
    mergeProps(merged, entry.props)
    return merged
}

const resolveReactNativeRoot = async () => {
    const require = createRequire(process.cwd() + '/package.json')
    let packageJsonPath: string
    try {
        packageJsonPath = require.resolve('react-native/package.json')
    } catch (error) {
        throw new Error('native: react-native is not installed in this project.')
    }
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'))
    const root = path.dirname(packageJsonPath)
    const typesEntry = packageJson.types || packageJson.typings
    return { root, typesEntry }
}

const findStyleSheetTypesFile = async (root: string, typesEntry?: string) => {
    const candidates = await fg(['**/StyleSheetTypes.d.ts', '**/StyleSheetTypes.ts'], {
        cwd: root,
        absolute: true,
        suppressErrors: true,
    })
    if (candidates.length) return candidates[0]

    if (typesEntry) {
        const entryPath = path.join(root, typesEntry)
        const entryContent = await fs.readFile(entryPath, 'utf-8').catch(() => '')
        if (entryContent.includes('interface ViewStyle')) {
            return entryPath
        }
    }

    const fallback = await fg(['**/*.d.ts'], { cwd: root, absolute: true, suppressErrors: true })
    for (const file of fallback) {
        const content = await fs.readFile(file, 'utf-8').catch(() => '')
        if (content.includes('interface ViewStyle')) {
            return file
        }
    }

    return null
}

export const loadReactNativeStyleProps = async () => {
    const { root, typesEntry } = await resolveReactNativeRoot()
    const typesFile = await findStyleSheetTypesFile(root, typesEntry)
    if (!typesFile) {
        throw new Error('native: unable to locate React Native style type definitions.')
    }

    const source = await fs.readFile(typesFile, 'utf-8')
    const interfaces = parseInterfaces(source)
    const merged = new Map<string, StyleProp>()

    for (const name of interfaceNames) {
        mergeProps(merged, collectProps(name, interfaces))
    }

    return {
        props: merged,
        sourcePath: typesFile,
    }
}
