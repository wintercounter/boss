import { merge } from 'ts-deepmerge'

import tailwindTheme from '@/prop/bosswind/tailwind-theme'
import {
    bosswindProps,
    getBosswindMeta,
    getBosswindDefaults,
    getBosswindFontSizeKeys,
    registerBosswindDictionary,
    rewriteBosswindTree,
} from '@/prop/bosswind/shared'
import type { Plugin } from '@/types'

export const name = 'bosswind'

let needsRuntime = false

const theme = tailwindTheme as Record<string, unknown>
const defaults = getBosswindDefaults(theme)
const fontSizeKeys = getBosswindFontSizeKeys(theme)

const bosswindTokens = {
    ...theme,
    color: theme.color ?? theme.colors,
}

export const onBoot: Plugin<'onBoot'> = async api => {
    const existing = api.tokens
    if (typeof existing === 'function') {
        api.tokens = (valueMap: unknown) => merge(bosswindTokens, existing(valueMap) ?? {})
    } else {
        api.tokens = merge(bosswindTokens, existing ?? {})
    }

    registerBosswindDictionary(api)

    const runtimeConfig = api.runtime
    const hasRuntimeConfig = Boolean(runtimeConfig && (runtimeConfig.only !== undefined || runtimeConfig.strategy))
    const runtimeModule = hasRuntimeConfig ? 'boss-css/prop/bosswind/runtime-only' : 'boss-css/prop/bosswind/browser'
    const shouldEmitRuntime = () => needsRuntime

    api.file.js.importAndConfig({ name: 'onInit', from: runtimeModule }, shouldEmitRuntime)
    api.file.js.importAndConfig({ name: 'onBrowserObjectStart', from: runtimeModule }, shouldEmitRuntime)

    api.file.js.config(
        {
            from: runtimeModule,
            config: {
                bosswind: {
                    defaults,
                    fontSizeKeys,
                },
            },
        },
        shouldEmitRuntime,
    )

    api.file.js.dts.set('body', 'bosswind:PropsStart', 'export interface $$BosswindProps {')
    for (const entry of bosswindProps) {
        api.file.js.dts
            .set('body', `bosswind:${entry.name}:description`, entry.description)
            .set('body', `bosswind:${entry.name}:declaration`, `  ${entry.name}?: $$PropValues | undefined\n`)
    }
    api.file.js.dts.set('body', 'bosswind:PropsEnd', '}')
    api.file.js.dts.replace('body', '$$:FinalProps', value => `${value} & $$BosswindProps`)

    const meta = getBosswindMeta()
    const formatLines = (lines: string[]) => (lines.length ? lines.map(line => `- ${line}`).join('\n') : '- (none)')
    const aliasLines = Object.entries(meta.aliasMap).map(([alias, props]) => {
        const list = Array.isArray(props) ? props.join(', ') : String(props)
        return `${alias} -> ${list}`
    })
    const booleanLines = Object.entries(meta.booleanAliases).map(([alias, value]) => {
        if (value && typeof value === 'object' && 'prop' in value && 'value' in value) {
            const entry = value as { prop: string; value: string }
            return `${alias} -> ${entry.prop}:${entry.value}`
        }
        return `${alias} -> ${String(value)}`
    })
    const content = ['### Aliases', formatLines(aliasLines), '', '### Boolean aliases', formatLines(booleanLines)].join('\n')
    await api.trigger('onMetaData', { kind: 'ai', data: { section: 'bosswind', title: 'Bosswind', content } })
}

export const onReady: Plugin<'onReady'> = async api => {
    const flex = api.dictionary.get('flex')
    if (flex) flex.single = true
    const grid = api.dictionary.get('grid')
    if (grid) grid.single = true
    const border = api.dictionary.get('border')
    if (border) border.single = true
    const flexWrap = api.dictionary.get('flexWrap')
    if (flexWrap) flexWrap.single = true
}

export const onPropTree: Plugin<'onPropTree'> = async (api, { tree, parser }) => {
    const resolvedTokens = typeof api.tokens === 'function' ? api.tokens({}) : api.tokens
    const { tree: next, usedBosswind, usedText } = rewriteBosswindTree(
        api,
        tree,
        { defaults, fontSizeKeys },
        resolvedTokens,
        parser,
    )

    if (usedBosswind && parser === 'jsx') {
        needsRuntime = true
    }
    void usedText

    Object.keys(tree).forEach(key => delete tree[key])
    Object.assign(tree, next)
}
