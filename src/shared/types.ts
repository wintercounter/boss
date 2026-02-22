export enum RuntimeType {
    NODE = 'node',
    DENO = 'deno',
    BUN = 'bun',
}

export type DebugValue = boolean | string | undefined

export type CompileConfig = {
    spread?: boolean
    stats?: false | 'quick' | 'detailed'
    tempOutDir?: string
    classNameStrategy?: false | 'hash' | 'shortest' | 'unicode'
}

export type RuntimeConfig = {
    only?: boolean
    strategy?: 'inline-first' | 'classname-first' | 'classic'
    globals?: 'inline' | 'file' | 'none'
}

export type FrameworkFileType = 'jsx' | 'unknown'

export type FrameworkId =
    | 'react'
    | 'preact'
    | 'solid'
    | 'qwik'
    | 'stencil'
    | 'unknown'
    | 'custom'
    | 'auto'

export type FrameworkConfig = {
    name?: FrameworkId | 'auto'
    className?: string
    fileType?: FrameworkFileType
    jsx?: {
        importSource?: string
        runtimeModule?: string
        typesModule?: string
        typesNamespace?: string
        elementType?: string
        componentProps?: string
    }
}

export type AiConfig = {
    llms?: {
        enabled?: boolean
        path?: string
    }
    skills?: {
        enabled?: boolean
        outputDir?: string
        includeBuiltins?: boolean
    }
}

export type UserConfig = {
    bosswind?: import('@/prop/bosswind/shared').BosswindConfig
    fonts?: import('boss-css/fontsource/types').FontConfig[]
    breakpoints?: Record<string, [number | null, number | null]>
    compile?: CompileConfig
    configDir?: string
    debug?: DebugValue
    content?: string | string[]
    ai?: AiConfig
    css?: {
        autoLoad?: boolean
        boundaries?: {
            ignore?: string[]
            criticality?: number
        }
    }
    devServer?: {
        port?: number
        autoStart?: boolean
    }
    folder?: string
    framework?: FrameworkConfig | FrameworkId
    jsx?: {
        globals?: boolean
    }
    nativeStyleProps?: string[]
    plugins?: unknown[]
    runtime?: RuntimeConfig
    selectorPrefix?: string
    selectorScope?: string
    stylesheetPath?: string
    tokens?: Record<string, unknown> | ((valueMap: unknown) => Record<string, unknown>)
    tokenPropGroups?: Record<string, string[]>
    unit?: string
}

export type DictionaryItem = {
    property: string
    description: string
    values?: string[]
    initial?: string
    aliases: string[]
    isCSSProp?: boolean
    usage?: string
    csstype?: unknown
    single?: boolean
    handler?: (options: { value: unknown; output: Record<string, unknown>; contexts: string[] }) => void
    descriptor?: any
}
