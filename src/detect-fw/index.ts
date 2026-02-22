import fs from 'node:fs/promises'
import path from 'node:path'
import { parseJson } from '@/shared/json'
import type { FrameworkConfig, FrameworkFileType, FrameworkId, UserConfig } from '@/shared/types'

export type JsxTypesDescriptor = {
    importSource: string
    runtimeModule: string
    typesModule: string
    typesNamespace: string
    elementType?: string
    componentProps?: string
}

export type FrameworkDescriptor = {
    id: FrameworkId
    name: string
    label: string
    fileType: FrameworkFileType
    jsx?: JsxTypesDescriptor
    className: string
}

export type DetectedFramework = FrameworkDescriptor & {
    source: 'config' | 'tsconfig' | 'package.json' | 'default'
    notes: string[]
}

type FrameworkHint = FrameworkDescriptor & {
    detect: {
        dependencies: string[]
        importSources?: string[]
    }
}

const jsxFrameworks: FrameworkHint[] = [
    {
        id: 'react',
        name: 'react',
        label: 'React',
        fileType: 'jsx',
        className: 'className',
        jsx: {
            importSource: 'react',
            runtimeModule: 'react/jsx-runtime',
            typesModule: 'react',
            typesNamespace: 'JSX',
            elementType: 'BossJSX.ElementType',
            componentProps: 'BossJSX.ComponentPropsWithoutRef<C>',
        },
        detect: { dependencies: ['react', 'react-dom', 'react-native'], importSources: ['react'] },
    },
    {
        id: 'preact',
        name: 'preact',
        label: 'Preact',
        fileType: 'jsx',
        className: 'className',
        jsx: {
            importSource: 'preact',
            runtimeModule: 'preact/jsx-runtime',
            typesModule: 'preact',
            typesNamespace: 'JSX',
        },
        detect: { dependencies: ['preact'], importSources: ['preact'] },
    },
    {
        id: 'solid',
        name: 'solid',
        label: 'Solid',
        fileType: 'jsx',
        className: 'class',
        jsx: {
            importSource: 'solid-js',
            runtimeModule: 'solid-js/jsx-runtime',
            typesModule: 'solid-js',
            typesNamespace: 'JSX',
            elementType: 'BossJSX.ValidComponent',
            componentProps: 'BossJSX.ComponentProps<C>',
        },
        detect: { dependencies: ['solid-js'], importSources: ['solid-js'] },
    },
    {
        id: 'qwik',
        name: 'qwik',
        label: 'Qwik',
        fileType: 'jsx',
        className: 'class',
        jsx: {
            importSource: '@builder.io/qwik',
            runtimeModule: '@builder.io/qwik/jsx-runtime',
            typesModule: '@builder.io/qwik',
            typesNamespace: 'JSX',
        },
        detect: {
            dependencies: ['@builder.io/qwik', '@builder.io/qwik-city'],
            importSources: ['@builder.io/qwik'],
        },
    },
    {
        id: 'stencil',
        name: 'stencil',
        label: 'Stencil',
        fileType: 'jsx',
        className: 'class',
        jsx: {
            importSource: '@stencil/core',
            runtimeModule: '@stencil/core/internal',
            typesModule: '@stencil/core',
            typesNamespace: 'JSX',
        },
        detect: { dependencies: ['@stencil/core'], importSources: ['@stencil/core'] },
    },
]

const sfcFrameworks: FrameworkHint[] = []

const frameworkById = new Map(jsxFrameworks.map(entry => [entry.id, entry]))

const frameworkByImportSource = new Map(
    jsxFrameworks.flatMap(entry => (entry.detect.importSources ?? []).map(source => [source, entry])),
)

const defaultFramework = frameworkById.get('react') as FrameworkHint
const defaultElementType = 'keyof BossIntrinsicElements | ((props: any) => any) | (new (props: any) => any)'
const defaultComponentProps = 'C extends keyof BossIntrinsicElements ? BossIntrinsicElements[C] : any'

const stripJsonComments = (input: string) => {
    let output = ''
    let inString = false
    let stringChar = ''
    let escaped = false
    let inLineComment = false
    let inBlockComment = false

    for (let index = 0; index < input.length; index += 1) {
        const char = input[index]
        const next = input[index + 1]

        if (inLineComment) {
            if (char === '\n') {
                inLineComment = false
                output += char
            }
            continue
        }

        if (inBlockComment) {
            if (char === '*' && next === '/') {
                inBlockComment = false
                index += 1
            }
            continue
        }

        if (inString) {
            output += char
            if (escaped) {
                escaped = false
                continue
            }
            if (char === '\\') {
                escaped = true
                continue
            }
            if (char === stringChar) {
                inString = false
                stringChar = ''
            }
            continue
        }

        if (char === '"' || char === "'") {
            inString = true
            stringChar = char
            output += char
            continue
        }

        if (char === '/' && next === '/') {
            inLineComment = true
            index += 1
            continue
        }

        if (char === '/' && next === '*') {
            inBlockComment = true
            index += 1
            continue
        }

        output += char
    }

    return output
}

const stripTrailingCommas = (input: string) => {
    let output = ''
    let inString = false
    let stringChar = ''
    let escaped = false

    for (let index = 0; index < input.length; index += 1) {
        const char = input[index]

        if (inString) {
            output += char
            if (escaped) {
                escaped = false
                continue
            }
            if (char === '\\') {
                escaped = true
                continue
            }
            if (char === stringChar) {
                inString = false
                stringChar = ''
            }
            continue
        }

        if (char === '"' || char === "'") {
            inString = true
            stringChar = char
            output += char
            continue
        }

        if (char === ',') {
            let lookahead = index + 1
            while (lookahead < input.length && /\s/.test(input[lookahead])) {
                lookahead += 1
            }
            const nextChar = input[lookahead]
            if (nextChar === '}' || nextChar === ']') {
                continue
            }
        }

        output += char
    }

    return output
}

const parseJsonLoose = <T = unknown>(raw: string, filePath: string) => {
    const withoutComments = stripJsonComments(raw)
    const withoutTrailing = stripTrailingCommas(withoutComments)
    return parseJson<T>(withoutTrailing, { filePath, allowTrailingCommas: true })
}

const readPackageJson = async (cwd: string) => {
    const filePath = path.join(cwd, 'package.json')
    const raw = await fs.readFile(filePath, 'utf8').catch(() => null)
    if (!raw) return null
    try {
        return parseJson<Record<string, unknown>>(raw, { filePath, allowTrailingCommas: true })
    } catch {
        return null
    }
}

const readTsconfig = async (cwd: string, preferredPath?: string) => {
    const candidates = preferredPath
        ? [preferredPath]
        : ['tsconfig.json', 'tsconfig.app.json', 'tsconfig.base.json']

    for (const candidate of candidates) {
        const filePath = path.isAbsolute(candidate) ? candidate : path.join(cwd, candidate)
        const raw = await fs.readFile(filePath, 'utf8').catch(() => null)
        if (!raw) continue
        try {
            return parseJsonLoose<Record<string, unknown>>(raw, filePath)
        } catch {
            continue
        }
    }

    return null
}

const collectDependencies = (packageJson: Record<string, unknown>) => {
    const fields = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'] as const
    const deps = new Set<string>()

    for (const field of fields) {
        const value = packageJson[field]
        if (!value || typeof value !== 'object') continue
        for (const name of Object.keys(value as Record<string, unknown>)) {
            deps.add(name)
        }
    }

    return deps
}

const createDescriptorFromImportSource = (importSource: string): FrameworkDescriptor => {
    const match = frameworkByImportSource.get(importSource)
    if (match) return match

    return {
        id: 'custom',
        name: importSource,
        label: importSource,
        fileType: 'jsx',
        className: 'className',
        jsx: {
            importSource,
            runtimeModule: `${importSource}/jsx-runtime`,
            typesModule: `${importSource}/jsx-runtime`,
            typesNamespace: 'JSX',
        },
    }
}

const applyFrameworkOverrides = (base: FrameworkDescriptor, override?: FrameworkConfig) => {
    if (!override) return base
    const next: FrameworkDescriptor = { ...base }

    if (override.className) {
        next.className = override.className
    }

    if (override.fileType) {
        next.fileType = override.fileType
    }

    if (override.jsx) {
        next.jsx = {
            importSource: override.jsx.importSource ?? next.jsx?.importSource ?? '',
            runtimeModule: override.jsx.runtimeModule ?? next.jsx?.runtimeModule ?? '',
            typesModule: override.jsx.typesModule ?? next.jsx?.typesModule ?? '',
            typesNamespace: override.jsx.typesNamespace ?? next.jsx?.typesNamespace ?? 'JSX',
            elementType: override.jsx.elementType ?? next.jsx?.elementType ?? undefined,
            componentProps: override.jsx.componentProps ?? next.jsx?.componentProps ?? undefined,
        }
    }

    return next
}

const resolveFrameworkFromConfig = (config?: UserConfig): FrameworkDescriptor | null => {
    if (!config?.framework) return null

    const raw = config.framework
    if (typeof raw === 'string') {
        if (raw === 'auto') return null
        const match = frameworkById.get(raw as FrameworkId)
        if (match) return match
        return createDescriptorFromImportSource(raw)
    }

    if (raw.name && raw.name !== 'auto') {
        const match = frameworkById.get(raw.name)
        if (match) return applyFrameworkOverrides(match, raw)
        const fallback = createDescriptorFromImportSource(raw.name)
        return applyFrameworkOverrides(fallback, raw)
    }

    if (raw.jsx?.importSource || raw.jsx?.typesModule) {
        const fallback = createDescriptorFromImportSource(raw.jsx.importSource ?? 'custom-jsx-runtime')
        return applyFrameworkOverrides(fallback, raw)
    }

    if (raw.fileType) {
        return applyFrameworkOverrides(
            {
                id: 'unknown',
                name: 'unknown',
                label: 'Unknown',
                fileType: raw.fileType,
                className: 'className',
            },
            raw,
        )
    }

    return null
}

const resolveFrameworkFromTsconfig = (tsconfig: Record<string, unknown> | null) => {
    const compilerOptions = tsconfig?.compilerOptions
    if (!compilerOptions || typeof compilerOptions !== 'object') return null
    const jsxImportSource = (compilerOptions as Record<string, unknown>).jsxImportSource
    if (typeof jsxImportSource !== 'string' || !jsxImportSource.trim()) return null

    return createDescriptorFromImportSource(jsxImportSource)
}

const resolveFrameworkFromPackageJson = (packageJson: Record<string, unknown> | null) => {
    if (!packageJson) return null
    const deps = collectDependencies(packageJson)

    for (const entry of jsxFrameworks) {
        if (entry.detect.dependencies.some(dep => deps.has(dep))) {
            return entry
        }
    }

    for (const entry of sfcFrameworks) {
        if (entry.detect.dependencies.some((dep: string) => deps.has(dep))) {
            return entry
        }
    }

    return null
}

export const getJsxTypes = (framework: FrameworkDescriptor) => {
    const jsx = framework.jsx ?? defaultFramework.jsx
    return {
        ...jsx,
        elementType: jsx?.elementType ?? defaultElementType,
        componentProps: jsx?.componentProps ?? defaultComponentProps,
    }
}

export const detectFramework = async (options: {
    cwd?: string
    config?: UserConfig
    packageJson?: Record<string, unknown>
    tsconfigPath?: string
} = {}): Promise<DetectedFramework> => {
    const cwd = options.cwd ?? process.cwd()
    const notes: string[] = []

    const configMatch = resolveFrameworkFromConfig(options.config)
    if (configMatch) {
        return { ...configMatch, source: 'config', notes }
    }

    const tsconfig = await readTsconfig(cwd, options.tsconfigPath)
    const tsconfigMatch = resolveFrameworkFromTsconfig(tsconfig)
    if (tsconfigMatch) {
        notes.push('tsconfig jsxImportSource')
        return { ...tsconfigMatch, source: 'tsconfig', notes }
    }

    const packageJson = options.packageJson ?? (await readPackageJson(cwd))
    const packageMatch = resolveFrameworkFromPackageJson(packageJson)
    if (packageMatch) {
        notes.push('package.json dependencies')
        return { ...packageMatch, source: 'package.json', notes }
    }

    return { ...defaultFramework, source: 'default', notes }
}

export const listFrameworks = () =>
    jsxFrameworks.map(entry => ({
        id: entry.id,
        name: entry.name,
        label: entry.label,
        fileType: entry.fileType,
        className: entry.className,
        jsx: entry.jsx,
    }))
