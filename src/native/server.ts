import { merge } from 'ts-deepmerge'
import { extractCode } from '@/parser/jsx/extractCode'
import { extractPreparedComponents } from '@/parser/jsx/extractPrepared'
import { extractPropTrees } from '@/parser/jsx/extractProps'
import { loadReactNativeStyleProps } from '@/native/styleTypes'
import type { BossServerApi, Plugin } from '@/types'

export const name = 'native'

export const settings = new Map<string, unknown>([
    ['name', '$$'],
    ['globals', true],
    ['emitRuntime', false],
])

// Keep in sync with src/parser/jsx/native.ts
const nativeComponentNames = [
    'ActivityIndicator',
    'FlatList',
    'Image',
    'Modal',
    'Pressable',
    'SafeAreaView',
    'ScrollView',
    'SectionList',
    'Switch',
    'Text',
    'TextInput',
    'TouchableHighlight',
    'TouchableOpacity',
    'TouchableWithoutFeedback',
    'View',
]

const defaultTokens = {
    color: {
        black: '#000',
        white: '#fff',
    },
}

let needsRuntime = false
const preparedComponents = new Map<string, { asTag: string | null; asDynamic: boolean }>()

const syncPreparedDts = (api: BossServerApi) => {
    const entries = Array.from(preparedComponents.entries()).sort(([a], [b]) => a.localeCompare(b))
    const lines = ['interface $$Prepared {']

    for (const [name] of entries) {
        const baseType = 'DefaultNativeElement'

        const getterType = `BaseFn<${baseType}>`
        const setterType = `$$PreparedDefinitionForSet<${baseType}>`

        lines.push(`    get ${name}(): ${getterType};`)
        lines.push(`    set ${name}(value: ${setterType});`)
    }

    lines.push('}')
    api.file.native.dts.set('body', 'jsx:prepared-interface', lines.join('\n'))
}

export const onBoot: Plugin<'onBoot'> = async api => {
    preparedComponents.clear()
    needsRuntime = false

    const needsRuntimeTest = () => needsRuntime || settings.get('emitRuntime') === true
    const proxyVar = api.file.native.import({ name: 'proxy', from: 'boss-css/parser/jsx/native' }, needsRuntimeTest)

    api.file.native.importAndConfig({ name: 'onBrowserObjectStart', from: 'boss-css/native/browser' }, needsRuntimeTest)

    settings.get('globals') &&
        api.file.native.set('body', 'jsx:globalThis', `globalThis.${settings.get('name')} = ${proxyVar}`, needsRuntimeTest)
    api.file.native.set('body', 'jsx:export-const', `export const ${settings.get('name')} = ${proxyVar}`, needsRuntimeTest)
    api.file.native.set('foot', 'jsx:export-default', `export default ${proxyVar}`, needsRuntimeTest)

    const tokenCreatorVar = api.file.native.import(
        { name: 'create', from: 'boss-css/use/token/runtime-only' },
        needsRuntimeTest,
    )
    api.file.native.set('foot', 'token:$$.token', `$$.token = ${tokenCreatorVar}()`, needsRuntimeTest)

    const { props } = await loadReactNativeStyleProps()
    const nativeStyleProps = Array.from(props.keys()).sort()
    const mergedTokens = merge(defaultTokens, api.tokens ?? {})

    api.file.native.config(
        {
            from: 'boss-css/native',
            config: {
                nativeStyleProps,
                tokens: mergedTokens,
                runtime: { only: true },
            },
        },
        needsRuntimeTest,
    )

    api.file.native.dts.set('head', 'jsx:runtime', `import type React from 'react'`)
    api.file.native.dts.set(
        'head',
        'jsx:native-components',
        `import type { ${nativeComponentNames.join(', ')} } from 'react-native'`,
    )
    api.file.native.dts.set(
        'body',
        'jsx:utils',
        `type AsProp<C extends React.ElementType> = {
    as?: C
}
type PropsToOmit<C extends React.ElementType, P> = keyof (AsProp<C> & P)
type PolymorphicComponentProp<C extends React.ElementType, Props = {}> = React.PropsWithChildren<Props & AsProp<C>> &
    Omit<React.ComponentPropsWithoutRef<C>, PropsToOmit<C, Props>>
type PolymorphicComponentPropWithRef<C extends React.ElementType, Props = {}> = PolymorphicComponentProp<C, Props> & {
    ref?: PolymorphicRef<C>
}
type PolymorphicRef<C extends React.ElementType> = React.ComponentPropsWithRef<C>['ref']

type DefaultNativeElement = typeof View
type $$JSXFinalProps<C extends React.ElementType> = PolymorphicComponentPropWithRef<C, $$FinalProps>
declare const $$PreparedBrand: unique symbol
type $$PreparedProps<Base extends React.ElementType = DefaultNativeElement, C extends React.ElementType = Base> = Omit<
    $$JSXFinalProps<C>,
    'children' | 'ref'
> &
    (C extends Base ? { as?: C } : { as: C })
type $$PreparedDefinition<Base extends React.ElementType = DefaultNativeElement, C extends React.ElementType = Base> =
    $$PreparedProps<Base, C> & { readonly [typeof $$PreparedBrand]: true }
type $$PreparedDefinitionForSet<Base extends React.ElementType = DefaultNativeElement> =
    | $$PreparedDefinition<Base, Base>
    | {
          [K in keyof JSX.IntrinsicElements]: $$PreparedDefinition<Base, K> & { as: K }
      }[keyof JSX.IntrinsicElements]
type $$NoopFn = {
    (props: $$PreparedProps<DefaultNativeElement, DefaultNativeElement>): $$PreparedDefinition<DefaultNativeElement, DefaultNativeElement>
    <C extends React.ElementType>(props: $$PreparedProps<DefaultNativeElement, C> & { as: C }): $$PreparedDefinition<DefaultNativeElement, C>
    (input: string): string
}
type StyleFn = {
    (...inputs: $$FinalProps[]): BossComponentProps<DefaultNativeElement>
}
type CssFn = {
    (input: TemplateStringsArray, ...exprs: unknown[]): void
    (input: string | Record<string, unknown>): void
}

type NativeComponentMap = {
${nativeComponentNames.map(name => `    ${name}: typeof ${name};`).join('\n')}
}

type BaseFn<T extends React.ElementType = DefaultNativeElement> = {
    <C extends React.ElementType = T, L extends React.LegacyRef>(
        props: $$JSXFinalProps<C>,
        contexts?: L,
    ): L extends React.LegacyRef ? React.ReactNode : $$FinalProps
}`,
    )
    syncPreparedDts(api)
    api.file.native.dts
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
    [T in keyof NativeComponentMap]: BaseFn<NativeComponentMap[T]>
} & $$Prepared & ProxyCustomMembers`,
        )

    api.file.native.dts.set('foot', 'jsx:export', `export declare const $$: Proxy`)

    if (settings.get('globals')) {
        api.file.native.dts.set(
            'foot',
            'jsx:globals',
            `declare global {
    const $$: Proxy
}`,
        )
    }

    api.file.native.dts.set('foot', '$$:default-export', `export default $$`)

    api.file.native.dts.set('body', 'native:StylePropsInterfaceStart', `export interface $$NativeStyleProps {`)

    for (const [name, prop] of props.entries()) {
        if (prop.description) {
            api.file.native.dts.set('body', `native:${name}:description`, `  /**\n   * ${prop.description}\n   */`)
        }
        api.file.native.dts.set(
            'body',
            `native:${name}:declaration`,
            `  ${name}?: $$PropValues | ${prop.type};\n`,
        )
    }

    api.file.native.dts.set('body', 'native:StylePropsInterfaceEnd', `}`)
    api.file.native.dts.replace('body', `$$:FinalProps`, v => `${v} & $$NativeStyleProps`)
    api.file.native.dts.prepend('body', 'jsx:proxy-custom-members', `    token: ${JSON.stringify(mergedTokens, null, 4)}\n`)
}

export const onParse: Plugin<'onParse'> = async (api, input) => {
    const { content } = input
    const extractedCodes = extractCode(content)
    const results = await extractPropTrees(extractedCodes)
    needsRuntime ||= !!Object.keys(results).length

    const prepared = extractPreparedComponents(content, input.path || input.file)
    let preparedDirty = false
    for (const entry of prepared) {
        const existing = preparedComponents.get(entry.name)
        if (!existing || existing.asTag !== entry.asTag || existing.asDynamic !== entry.asDynamic) {
            preparedComponents.set(entry.name, entry)
            preparedDirty = true
        }
    }
    if (preparedDirty) {
        syncPreparedDts(api)
    }
}
