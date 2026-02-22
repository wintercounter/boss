import type { FrameworkDescriptor } from '@/detect-fw'
import type { Dictionary } from '@/api/dictionary'
import type { SessionPayload } from '@/tasks/session'
import type { DebugValue, UserConfig } from '@/shared/types'

export type BossPropPrimitive = string | number | boolean | null | undefined

export type BossProp = {
    value: BossPropValue
    dynamic?: boolean
    isFn?: boolean
    ast?: unknown
    code?: string
    selectorValue?: unknown
    selectorName?: string
    classToken?: string
    important?: boolean
    named?: string
    rawName?: string
    query?: string | null
    tokenKey?: string
    tokenPath?: string
    [key: string]: unknown
}

export type BossPropTree = Record<string, BossProp>
export type BossPropValue = BossPropPrimitive | BossPropTree | BossProp[] | Record<string, unknown> | unknown[]

export type BossParseInput = {
    content: string
    path?: string
    file?: string
    preparedOnly?: boolean
    [key: string]: unknown
}

export type BossPropTreePayload = {
    input: Record<string, unknown>
    tree: BossPropTree
    preferVariables?: boolean
    parser?: 'jsx' | 'classname' | string
    file?: BossParseInput | { path?: string; file?: string } | null
    code?: string
}

export type BossPropPayload = {
    name: string
    prop: BossProp
    contexts: string[]
    preferVariables?: boolean
    file?: BossParseInput | { path?: string; file?: string } | null
}

export type BossCompilePropPayload = {
    name: string
    prop: BossProp
    output: Record<string, BossProp | unknown>
    tag?: string
    file?: BossParseInput | { path?: string; file?: string } | null
    keep?: boolean
    remove?: boolean
}

export type BossBrowserObjectPayload = {
    input: Record<string, unknown>
    output?: Record<string, unknown>
    tag?: string
    contexts?: string[]
}

export type BossMetaDataPayload = {
    kind: string
    data?: unknown
    label?: string
    type?: string
    [key: string]: unknown
}

export type BossPluginEventName =
    | 'onBoot'
    | 'onReady'
    | 'onParse'
    | 'onPropTree'
    | 'onProp'
    | 'onCompileProp'
    | 'onInit'
    | 'onBrowserObjectStart'
    | 'onSession'
    | 'onMetaData'

export type BossPluginEventPayload = {
    onBoot: void
    onReady: void
    onParse: BossParseInput
    onPropTree: BossPropTreePayload
    onProp: BossPropPayload
    onCompileProp: BossCompilePropPayload
    onInit: void
    onBrowserObjectStart: BossBrowserObjectPayload
    onSession: SessionPayload
    onMetaData: BossMetaDataPayload
}

export type BossCssSelectorInput = {
    className?: string | null
    selector?: string | null
    pseudos?: string[]
    query?: string | null
    source?: string | null
}

export type BossCssRuleOptions = {
    important?: boolean
}

export type BossCssCustomBlock = { start: number; end: number; cssText: string }

export type BossLogger = {
    namespace: string
    enabled: boolean
    log: (...args: any[]) => void
    child: (name: string) => BossLogger
}

export interface BossCssLike {
    text: string
    source?: string | null
    setSource?: (source: string | null) => void
    selector: (input: BossCssSelectorInput) => void
    rule: (property: string, value: unknown, options?: BossCssRuleOptions) => void
    addRule: (rule: string, query?: string | null, source?: string | null) => void
    addImport: (url: string) => void
    addRoot: (value: string, source?: string | null) => void
    removeSource: (source: string | null | undefined) => void
    write: () => void
    reset: () => void
    snapshot?: () => unknown
    restore?: (snapshot: unknown) => void
    syncCustomBlocks?: (file: string | undefined, blocks: BossCssCustomBlock[]) => void
    getCustomText?: () => string
    current?: unknown
    imports?: Set<string>
    root?: Set<string>
}

export type BossFileSection = 'head' | 'import' | 'body' | 'foot'

export type BossFileEntry = {
    content: unknown
    test?: () => boolean
}

export interface BossFileBase {
    get: (section: BossFileSection) => Map<unknown, BossFileEntry>
    set: (section: BossFileSection, key: unknown, content: unknown, test?: () => boolean) => this
    append: (section: BossFileSection, key: unknown, content: string, test?: () => boolean) => this
    prepend: (section: BossFileSection, key: unknown, content: string, test?: () => boolean) => this
    replace: (
        section: BossFileSection,
        key: unknown,
        callback: (value: BossFileEntry | BossFileEntry['content']) => BossFileEntry | string,
    ) => this
    write: () => Promise<void>
    text: string
    hasContent: boolean
}

export interface BossDtsFile extends BossFileBase {}

export interface BossJsFile extends BossFileBase {
    dts: BossDtsFile
    import: (options: { name?: string | null; from: string; as?: string | null }, test?: () => boolean) => string
    importAndConfig: (options: { name: string; from: string }, test?: () => boolean) => string
    config: (options: { from: string; config: Record<string, unknown> }, test?: () => boolean) => void
}

export type BossApiFiles = {
    js: BossJsFile
    native: BossJsFile
    [key: string]: BossJsFile
}

export type BossRuntimeAdapter = {
    createElement: (
        component: unknown,
        props: Record<string, unknown> | null,
        children?: unknown,
        dev?: unknown,
    ) => unknown
    getChildren?: (restArgs: unknown[]) => unknown
    getFactoryChildren?: (props: unknown, ref: unknown, restArgs: unknown[]) => unknown
    applyRef?: (props: Record<string, unknown>, ref: unknown) => void
    getDev?: (ref: unknown, restArgs: unknown[]) => unknown
}

export type BossApiConfig = UserConfig & {
    plugins?: BossPluginModule[] | unknown[]
    debug?: DebugValue
    baseDir?: string
    runtimeApi?: BossRuntimeAdapter
    framework?: FrameworkDescriptor | UserConfig['framework']
    strategy?: string
}

export interface BossApiBase extends Omit<UserConfig, 'css' | 'plugins' | 'framework'> {
    unit: string
    plugins: BossPluginModule[]
    trigger: BossPluginTrigger
    dictionary: Dictionary
    css?: BossCssLike
    file?: BossApiFiles
    log: BossLogger
    isServer?: boolean
    isBrowser?: boolean
    baseDir?: string
    userConfig?: UserConfig
    framework?: FrameworkDescriptor | UserConfig['framework']
    strategy?: string
    emitAllTokens?: boolean
    runtimeApi?: BossRuntimeAdapter
    tokenVars?: (tokens?: Record<string, unknown>) => Record<string, string | number>
    tokenPropGroups?: Record<string, string[]>
    propTreeToObject: (tree: BossPropTree) => Record<string, unknown>
    propTreeToArray: (tree: BossProp[]) => unknown[]
    propTreeToValue: (tree: BossPropTree | BossProp[] | BossProp | unknown) => unknown
    walkPropTree: (tree: BossPropTree, callback: (name: string, prop: BossProp) => void) => void
    objectToPropTree: (obj: Record<string, unknown>, output?: BossPropTree) => BossPropTree
    mapPropTree: (tree: BossPropTree, callback: (name: string, prop: BossProp, depth: number) => BossProp, depth?: number) => BossPropTree
    escapeClassName: (value: string) => string
    contextToCSSVariable: (name: string, value: unknown, contexts: string[], selectorPrefix?: string) => string
    contextToClassName: (
        name: string,
        value: unknown,
        contexts: string[],
        useSelector?: boolean,
        selectorPrefix?: string,
    ) => string
    camelCaseToDash: (value: string) => string
    dashToCamelCase: (value: string) => string
    classTokenToSelector: (value: string) => string
    applyChildSelectors: (selector: string, contexts: string[]) => string
}

export interface BossServerApi extends BossApiBase {
    isServer: true
    css: BossCssLike
    file: BossApiFiles
}

export interface BossBrowserApi extends BossApiBase {
    isBrowser: true
}

export type BossApi = BossServerApi | BossBrowserApi

export type BossPluginEventApiMap = {
    onBoot: BossServerApi
    onReady: BossServerApi
    onParse: BossServerApi
    onPropTree: BossServerApi
    onProp: BossServerApi
    onCompileProp: BossServerApi
    onInit: BossBrowserApi
    onBrowserObjectStart: BossBrowserApi
    onSession: BossServerApi
    onMetaData: BossServerApi
}

export type BossPluginTest = (plugin: BossPluginModule) => boolean | Promise<boolean>

export type BossPluginHandler<Event extends BossPluginEventName> = BossPluginEventPayload[Event] extends void
    ? (api: BossPluginEventApiMap[Event], payload?: BossPluginEventPayload[Event]) => void | Promise<void>
    : (api: BossPluginEventApiMap[Event], payload: BossPluginEventPayload[Event]) => void | Promise<void>

export type BossPluginHandlers = {
    [Event in BossPluginEventName]?: BossPluginHandler<Event> | Array<BossPluginHandler<Event>>
}

export interface BossPluginModule extends BossPluginHandlers {
    name: string
    dependencies?: Set<string>
    settings?: Map<string, unknown>
    [key: string]: unknown
}

export type BossPluginTrigger = <Event extends BossPluginEventName>(
    eventName: Event,
    payload?: BossPluginEventPayload[Event],
    test?: BossPluginTest,
) => void | Promise<void>

export type Plugin<T extends BossPluginEventName> = BossPluginHandler<T>
