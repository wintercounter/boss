import path from 'node:path'
import { parseSync } from '@swc/core'

import { extractCode } from '@/parser/jsx/extractCode.js'
import { extractPreparedComponents } from '@/parser/jsx/extractPrepared.js'
import { extractPropTrees } from '@/parser/jsx/extractProps.js'
import { extractCustomCssText } from '@/shared/customCss'
import { detectFramework, getJsxTypes } from '@/detect-fw'
import type { UserConfig } from '@/shared/types'
import type { BossServerApi, Plugin } from '@/types'

export const name = 'jsx'

export const settings = new Map<string, unknown>([
    ['name', '$$'],
    ['pragma', 'react'],
    ['globals', true],
    ['types', true],
    ['emitRuntime', false],
])

const resolveGlobals = (api: BossServerApi) => {
    const configValue = api.userConfig?.jsx?.globals
    if (typeof configValue === 'boolean') return configValue
    return settings.get('globals') !== false
}

/**
 * Style:
 *
 * \`\`\`
 * {
 *     textTransform: 'uppercase',
 *     width: 300,
 *     hover: {
 *         color: 'purple',
 *     },
 *     at: {
 *         mobile: { color: 'cyan' },
 *     },
 *     onClick: () => {},
 * }
 * \`\`\`
 * PreparedUppercaseA: BaseFn<'div'> & $$JSXFinalProps<'div'>
 */

let needsRuntime = false
const preparedComponents = new Map<
    string,
    {
        asTag: string | null
        asDynamic: boolean
        filePath?: string
        styles?: string
    }
>()

const buildPreparedLines = () => {
    const entries = Array.from(preparedComponents.entries()).sort(([a], [b]) => a.localeCompare(b))
    if (!entries.length) return ['(none)']
    return entries.map(([name, meta]) => {
        const asValue = meta.asDynamic ? 'dynamic' : meta.asTag ?? 'div'
        const filePath = formatPreparedPath(meta.filePath)
        const fileLabel = filePath ? `, file: ${filePath}` : ''
        return `${name} (as: ${asValue}${fileLabel})`
    })
}

const emitPreparedMeta = async (api: BossServerApi) => {
    const lines = buildPreparedLines().map(line => `- ${line}`).join('\n')
    await api.trigger('onMetaData', {
        kind: 'ai',
        replace: true,
        data: {
            section: 'prepared',
            title: 'Prepared components',
            content: lines,
        },
    })
}

const syncPreparedDts = (api: BossServerApi) => {
    const entries = Array.from(preparedComponents.entries()).sort(([a], [b]) => a.localeCompare(b))
    const lines = ['interface $$Prepared {']

    for (const [name, meta] of entries) {
        const baseType = '"div"'

        const getterType = `BaseFn<${baseType}>`
        const setterType = `$$PreparedDefinitionForSet<${baseType}>`

        const docLines = []
        const filePath = formatPreparedPath(meta.filePath)
        if (filePath) {
            docLines.push(`Declared in: ${filePath}`)
        }
        if (meta.styles) {
            docLines.push(`Styles: ${sanitizeDocText(meta.styles)}`)
        }
        if (docLines.length) {
            lines.push('    /**')
            for (const line of docLines) {
                lines.push(`     * ${line}`)
            }
            lines.push('     */')
        }
        lines.push(`    get ${name}(): ${getterType};`)
        lines.push(`    set ${name}(value: ${setterType});`)
    }

    lines.push('}')
    api.file.js.dts.set('body', 'jsx:prepared-interface', lines.join('\n'))
}

export const onBoot: Plugin<'onBoot'> = async api => {
    // Reset cross-run state so tests and multiple API instances don't leak prepared entries.
    needsRuntime = false
    preparedComponents.clear()

    const needsRuntimeTest = () => needsRuntime || settings.get('emitRuntime') === true
    const globalsEnabled = resolveGlobals(api)
    const proxyVar = api.file.js.import({ name: 'proxy', from: 'boss-css/runtime' }, needsRuntimeTest)

    api.file.js.importAndConfig({ name: 'onBrowserObjectStart', from: 'boss-css/parser/jsx/browser' }, needsRuntimeTest)
    globalsEnabled && api.file.js.set('body', 'jsx:globalThis', `globalThis.${settings.get('name')} = ${proxyVar}`, needsRuntimeTest)
    api.file.js.set('body', 'jsx:export-const', `export const ${settings.get('name')} = ${proxyVar}`, needsRuntimeTest)
    api.file.js.set('foot', 'jsx:export-default', `export default ${proxyVar}`, needsRuntimeTest)

    const framework = await detectFramework({ config: (api.userConfig ?? api) as UserConfig })
    const jsxTypes = getJsxTypes(framework)
    const jsxNamespace = jsxTypes.typesNamespace
    const jsxTypesModule = jsxTypes.typesModule
    const elementType = jsxTypes.elementType
    const componentProps = jsxTypes.componentProps
    const classNameProp = framework.className ?? 'className'

    api.framework = framework

    const runtimeAdapterModule = `boss-css/runtime/${framework.name}`
    const runtimeApiVar = api.file.js.import(
        { name: '*', as: 'runtimeApi', from: runtimeAdapterModule },
        needsRuntimeTest,
    )
    api.file.js.config(
        {
            from: runtimeAdapterModule,
            config: {
                runtimeApi: runtimeApiVar,
                framework: { name: framework.name, className: classNameProp },
            },
        },
        needsRuntimeTest,
    )

    api.file.js.dts.set('head', 'jsx:runtime', `import type * as BossJSX from '${jsxTypesModule}'`)
    api.file.js.dts.set(
        'body',
        'jsx:utils',
        `type BossIntrinsicElements = BossJSX.${jsxNamespace}.IntrinsicElements
type BossElement = BossJSX.${jsxNamespace}.Element
type BossElementType = ${elementType}
type BossComponentProps<C> = C extends keyof BossIntrinsicElements
    ? BossIntrinsicElements[C]
    : ${componentProps}
type AsProp<C extends BossElementType> = {
    as?: C
}
type PolymorphicComponentProp<C extends BossElementType, Props = {}> = Props & BossComponentProps<C> & AsProp<C>
type PolymorphicComponentPropWithRef<C extends BossElementType, Props = {}> = PolymorphicComponentProp<C, Props> & {
    ref?: unknown
}

type $$JSXFinalProps<C extends BossElementType> = PolymorphicComponentPropWithRef<C, $$FinalProps>
declare const $$PreparedBrand: unique symbol
type $$PreparedProps<Base extends BossElementType = 'div', C extends BossElementType = Base> = Omit<
    $$JSXFinalProps<C>,
    'children' | 'ref'
> &
    (C extends Base ? { as?: C } : { as: C })
type $$PreparedDefinition<Base extends BossElementType = 'div', C extends BossElementType = Base> = $$PreparedProps<Base, C> & {
    readonly [typeof $$PreparedBrand]: true
}
type $$PreparedDefinitionForSet<Base extends BossElementType = 'div'> = {
    readonly [typeof $$PreparedBrand]: true
}
type $$NoopFn = {
    (props: $$PreparedProps<'div', 'div'>): $$PreparedDefinition<'div', 'div'>
    <C extends BossElementType>(props: $$PreparedProps<'div', C> & { as: C }): $$PreparedDefinition<'div', C>
    (input: string): string
}
type StyleFn = {
    (...inputs: $$FinalProps[]): BossComponentProps<'div'>
}
type CssFn = {
    (input: TemplateStringsArray, ...exprs: unknown[]): void
    (input: string | Record<string, unknown>): void
}

// This is the base function which will become the proxy
type BaseFn<T extends BossElementType = 'div'> = {
    <C extends BossElementType = T>(
        props: $$JSXFinalProps<C>,
        contexts?: unknown,
    ): BossElement
}`,
    )
    syncPreparedDts(api)
    api.file.js.dts
        .set(
            'body',
            'jsx:proxy-start',
            `type ProxyCustomMembers = {
`,
        )
        .set(
            'body',
            'jsx:proxy-utils',
            `    $: $$NoopFn
    merge: (...inputs: import('boss-css/merge').MergeInput[]) => import('boss-css/merge').MergeOutput
    cx: (...inputs: import('boss-css/variants').CxValue[]) => string
    cv: typeof import('boss-css/variants').cv
    scv: typeof import('boss-css/variants').scv
    sv: typeof import('boss-css/variants').sv
    css: CssFn
    style: StyleFn
`,
        )
        .set('body', 'jsx:proxy-custom-members', ``)
        .set('body', 'jsx:proxy-custom-members-end', `}`)
        .set(
            'body',
            'jsx:proxy-type',
            `type Proxy = BaseFn & {
    [T in keyof BossIntrinsicElements]: BaseFn<T>
} & $$Prepared & ProxyCustomMembers`,
        )

    api.file.js.dts.replace(
        'body',
        '$$:FinalProps',
        value => {
            const safeProp = /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(classNameProp)
                ? classNameProp
                : JSON.stringify(classNameProp)
            return `${value} & { ${safeProp}?: import('boss-css/variants').CxValue }`
        },
    )

    api.file.js.dts.set('foot', 'jsx:export', `export declare const $$: Proxy`)

    if (globalsEnabled) {
        api.file.js.dts.set(
            'foot',
            'jsx:globals',
            `declare global {
    const $$: Proxy
}`,
        )
    }

    api.file.js.dts.set('foot', '$$:default-export', `export default $$`)
}

export const onParse: Plugin<'onParse'> = async (api, input) => {
    const log = api.log.child('parser').child('jsx')
    const { content } = input
    const filePath = input.path || input.file
    const prepared = extractPreparedComponents(content, filePath)
    let preparedDirty = false
    for (const entry of prepared) {
        const existing = preparedComponents.get(entry.name)
        if (
            !existing ||
            existing.asTag !== entry.asTag ||
            existing.asDynamic !== entry.asDynamic ||
            existing.filePath !== entry.filePath ||
            existing.styles !== entry.styles
        ) {
            preparedComponents.set(entry.name, entry)
            preparedDirty = true
        }
    }
    if (preparedDirty) {
        syncPreparedDts(api)
        await emitPreparedMeta(api)
    }
    if (input.preparedOnly) return

    const extractedCodes = extractCode(content)
    const results = await extractPropTrees(extractedCodes)

    needsRuntime ||= !!results.length

    for (const [key, tree] of Object.entries(results)) {
        log.log('onPropTree', tree)
        await api.trigger('onPropTree', {
            input: api.propTreeToObject(tree),
            tree,
            preferVariables: true,
            file: input,
            code: extractedCodes[key as unknown as number],
            parser: 'jsx',
        })
    }

    if (filePath) {
        const customBlocks = await extractCustomCssBlocks(api, content, filePath)
        api.css?.syncCustomBlocks?.(filePath, customBlocks)
    }
}

const onWrite = async (_api: BossServerApi, _input: unknown) => {}

const customCssExtensions = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'])

const extractCustomCssBlocks = async (api: BossServerApi, content: string, filePath: string) => {
    const ext = path.extname(filePath)
    if (!customCssExtensions.has(ext)) return []
    if (!content.includes('$$.css')) return []

    let program
    try {
        const isTs = ext === '.ts' || ext === '.tsx'
        const isJsx = ext === '.jsx' || ext === '.tsx' || ext === '.js' || ext === '.mjs' || ext === '.cjs'
        program = parseSync(content, {
            syntax: isTs ? 'typescript' : 'ecmascript',
            tsx: isTs && isJsx,
            jsx: !isTs && isJsx,
        })
    } catch {
        return []
    }

    const blocks: Array<{ start: number; end: number; cssText: string }> = []
    const walk = async (node: unknown): Promise<void> => {
        if (!node || typeof node !== 'object') return
        if (Array.isArray(node)) {
            for (const item of node) {
                await walk(item)
            }
            return
        }
        const record = node as { type?: string; span?: { start: number; end: number } }
        if (record.type === 'TaggedTemplateExpression' || record.type === 'CallExpression') {
            const cssText = await extractCustomCssText(node as any, api, filePath)
            if (cssText != null) {
                const start = record.span?.start ?? 0
                const end = record.span?.end ?? 0
                blocks.push({ start, end, cssText })
            }
        }
        for (const value of Object.values(record)) {
            await walk(value)
        }
    }

    await walk(program)
    return blocks
}

const formatPreparedPath = (filePath?: string) => {
    if (!filePath) return null
    const relative = path.relative(process.cwd(), filePath)
    if (!relative || relative.startsWith('..')) return filePath
    return relative
}

const sanitizeDocText = (value: string) => value.replace(/\*\//g, '*\\/')
