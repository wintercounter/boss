import { merge } from 'ts-deepmerge'
import type { BossServerApi, Plugin } from '@/types'
import { propMap, getTokenGroupsForProp, getTokenGroupForProp, getTokenPropGroups, setTokenPropGroups } from '@/use/token/propMap'
import { normalizeTokens } from '@/use/token/normalize'

export { propMap, getTokenGroupsForProp, getTokenGroupForProp, getTokenPropGroups, setTokenPropGroups } from '@/use/token/propMap'

export const name = 'token'

type TokenGroup = Record<string, unknown>
type TokenValueMap = Map<string, TokenGroup> & { asObject?: () => Record<string, TokenGroup> }
type TokenInput = Record<string, unknown>
type TokenInputResolver = (values: TokenValueMap) => TokenInput

let rawOriginals: TokenInput = {}
let originals: TokenInput = {}

export const getTokens = () => originals

export const set = (input: TokenInput | TokenInputResolver) => {
    const resolvedInput = typeof input === 'object' ? input : input(valueMap)
    rawOriginals = merge(rawOriginals, resolvedInput) as TokenInput

    // We need to save this to be used for $$.token types
    originals = normalizeTokens(rawOriginals) as TokenInput

    for (const [key, value] of Object.entries(originals)) {
        const propsToMap = propMap.get(key) || [key]

        for (const prop of propsToMap) {
            valueMap.set(prop, value as TokenGroup)
        }
    }
}

let valueMap: TokenValueMap
let hasTokens = false
let processedPaths: Map<string, unknown>
let hasProxyTokens = false
let hasTokenOverrides = false
let browserResolvedPaths: Set<string>
let emittedAllTokens = false
let runtimeIncludesTokenPaths = false
let tokenCreatorVarName = ''
let tokenVarsVarName = ''
const alphaWarnings = new Set<string>()
let runtimeModuleName = ''
let runtimeConfigTest: (() => boolean) | null = null
let usedTokenGroups = new Set<string>()

const getRuntimeTokenPropGroups = (api: { emitAllTokens?: boolean }) => {
    const groups = getTokenPropGroups()
    if (api.emitAllTokens) return groups
    if (!usedTokenGroups.size) return {}
    return Object.fromEntries(Object.entries(groups).filter(([group]) => usedTokenGroups.has(group)))
}

const tokenAlphaKeyPattern = /^[a-zA-Z0-9_.-]+$/

const parseTokenAlphaValue = (value: string) => {
    const slashIndex = value.lastIndexOf('/')
    if (slashIndex <= 0 || slashIndex === value.length - 1) return null

    const base = value.slice(0, slashIndex)
    const alphaRaw = value.slice(slashIndex + 1)

    if (!tokenAlphaKeyPattern.test(base)) return null

    if (!/^\d{1,3}$/.test(alphaRaw)) {
        return { base, alpha: null, alphaRaw }
    }

    const alpha = Number(alphaRaw)
    if (!Number.isInteger(alpha) || alpha < 0 || alpha > 100) {
        return { base, alpha: null, alphaRaw }
    }

    return { base, alpha, alphaRaw }
}

const resolveTokenParts = (values: Record<string, any>, pathParts: string[]) => {
    if (!pathParts.length) return values
    return pathParts.reduce((acc, key) => acc?.[key]?.value ?? acc?.[key]?.$value ?? acc?.[key], values)
}

const warnAlpha = (message: string) => {
    if (alphaWarnings.has(message)) return
    alphaWarnings.add(message)
    console.warn(`[boss-css] ${message}`)
}

const emitAllTokenVars = (api: BossServerApi) => {
    if (emittedAllTokens) return
    emittedAllTokens = true
    hasTokens = true
    const addTokenVars = (prefix: string, value: unknown) => {
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            for (const [key, next] of Object.entries(value)) {
                addTokenVars(prefix ? `${prefix}.${key}` : key, next)
            }
            return
        }

        if (!prefix) return

        const varName = `--${api.selectorPrefix ?? ''}${prefix.replace(/\./g, '-')}`
        api.css.addRoot(`${varName}: ${api.dictionary.toValue(value)};`)
        browserResolvedPaths.add(prefix)
    }

    for (const [group, value] of Object.entries(originals)) {
        addTokenVars(group, value)
    }
}

export const onBoot: Plugin<'onBoot'> = async api => {
    // reset
    processedPaths = new Map()
    rawOriginals = {}
    hasTokens = false
    hasProxyTokens = false
    hasTokenOverrides = false
    browserResolvedPaths = new Set()
    emittedAllTokens = false
    runtimeIncludesTokenPaths = false
    usedTokenGroups = new Set()
    valueMap = new Map<string, TokenGroup>() as TokenValueMap
    valueMap.asObject = function () {
        return Array.from(this.entries()).reduce<Record<string, TokenGroup>>((acc, [key, value]) => {
            acc[key] = value
            return acc
        }, {})
    }
    // set default
    set({
        color: {
            black: '#000',
            white: '#fff',
        },
    })

    if (api.tokens) set(api.tokens)

    // add source code
    const shouldEmitRuntime = () => Boolean(hasTokens || hasProxyTokens || hasTokenOverrides || api.emitAllTokens)
    const runtimeConfig = api.runtime
    const hasRuntimeConfig = Boolean(runtimeConfig && (runtimeConfig.only !== undefined || runtimeConfig.strategy))
    runtimeIncludesTokenPaths = hasRuntimeConfig
    const runtimeModule = hasRuntimeConfig ? 'boss-css/use/token/runtime-only' : 'boss-css/use/token/browser'
    runtimeModuleName = runtimeModule
    api.file.js.importAndConfig({ name: 'onInit', from: runtimeModule }, shouldEmitRuntime)
    api.file.js.importAndConfig({ name: 'onBrowserObjectStart', from: runtimeModule }, shouldEmitRuntime)
    const tokenPathsVarName = api.file.js.import(
        { name: 'tokenPaths', from: runtimeModule },
        () => browserResolvedPaths.size > 0 || Boolean(api.emitAllTokens),
    )
    const shouldEmitTokenProxy = () => Boolean(hasProxyTokens)
    tokenCreatorVarName = api.file.js.import({ name: 'create', from: runtimeModule }, shouldEmitTokenProxy)
    tokenVarsVarName = api.file.js.import({ name: 'tokenVars', from: runtimeModule }, () => true)
    runtimeConfigTest = shouldEmitRuntime
    const runtimeConfigPayload: Record<string, unknown> = { tokenPropGroups: getRuntimeTokenPropGroups(api) }
    if (hasRuntimeConfig) {
        runtimeConfigPayload.tokens = originals
        runtimeConfigPayload.runtime = runtimeConfig
    }
    api.file.js.config({ from: runtimeModule, config: runtimeConfigPayload }, shouldEmitRuntime)
    api.file.js.set(
        'body',
        'token:browserResolvedPaths',
        () => `;${JSON.stringify(Array.from(browserResolvedPaths))}.forEach(v => ${tokenPathsVarName}.add(v))`,
        () => browserResolvedPaths.size > 0 || Boolean(api.emitAllTokens),
    )

}

export const onReady: Plugin<'onReady'> = async api => {
    if (runtimeModuleName && runtimeConfigTest) {
        api.file.js.config(
            { from: runtimeModuleName, config: { tokenPropGroups: getRuntimeTokenPropGroups(api) } },
            runtimeConfigTest,
        )
    }
    api.file.js.dts.set(
        'body',
        'token:types',
        `type $$TokenLeaf = string | number | (string | number)[]
type $$TokenDefinition = ${JSON.stringify(originals, null, 4)}
type $$TokenOverrides<T = $$TokenDefinition> =
    T extends any[]
        ? $$TokenLeaf
        : T extends { value: infer V }
          ? $$TokenOverrides<V> | { [K in keyof T]?: $$TokenOverrides<T[K]> }
          : T extends object
            ? { [K in keyof T]?: $$TokenOverrides<T[K]> }
            : $$TokenLeaf
`,
    )

    api.file.js.dts.replace('body', '$$:FinalProps', value => `${value} & { tokens?: $$TokenOverrides }`)

    // types for $$.token
    api.file.js.dts.prepend('body', 'jsx:proxy-custom-members', `    token: ${JSON.stringify(originals, null, 4)}\n`)
    api.file.js.dts.prepend(
        'body',
        'jsx:proxy-custom-members',
        `    tokenVars: (overrides: $$TokenOverrides) => Record<string, string | number>\n`,
    )

    const shouldEmitTokenProxy = () => hasProxyTokens
    api.file.js.set('foot', 'token:$$.token', `$$.token = ${tokenCreatorVarName}()`, shouldEmitTokenProxy)
    api.file.js.set('foot', 'token:$$.tokenVars', `$$.tokenVars = ${tokenVarsVarName}`)

    // Types for CSS props
    for (const [name, values] of valueMap) {
        const descriptor = api.dictionary.get(name)
        if (!values || typeof values !== 'object') continue
        const keys = Object.keys(values)

        if (!descriptor) continue

        for (const alias of descriptor.aliases) {
            const cssDescription = api.file.js.dts.get('body').get(`css:${alias}:description`)
            const cssDeclaration = api.file.js.dts.get('body').get(`css:${alias}:declaration`)

            if (cssDescription) {
                api.file.js.dts.prepend(
                    'body',
                    `css:${alias}:description`,
                    `**Available tokens**\n
${keys.map(k => `- \`${k}\`: \`${values[k]}\``).join('\n')}
\n`,
                )
            }

            if (cssDeclaration) {
                const cssContent = String(cssDeclaration.content ?? '')
                api.file.js.dts.set(
                    'body',
                    `css:${alias}:declaration`,
                    cssContent.replace('?: ', `?: ${keys.map(k => `"${k}"`).join(' | ')} | `),
                )
            }
        }
    }
    const formatLines = (lines: string[]) => (lines.length ? lines.map(line => `- ${line}`).join('\n') : '- (none)')
    const flattenKeys = (value: unknown, prefix = ''): string[] => {
        if (!value || typeof value !== 'object' || Array.isArray(value)) {
            return prefix ? [prefix] : []
        }
        const obj = value as Record<string, unknown>
        const keys = Object.keys(obj).filter(key => key !== 'value')
        if (!keys.length) return prefix ? [prefix] : []
        const results: string[] = []
        for (const key of keys) {
            const next = prefix ? `${prefix}.${key}` : key
            const child = obj[key]
            if (child && typeof child === 'object' && !Array.isArray(child)) {
                const childObj = child as Record<string, unknown>
                const childKeys = Object.keys(childObj).filter(k => k !== 'value')
                if (!childKeys.length) {
                    results.push(next)
                } else {
                    results.push(...flattenKeys(child, next))
                }
            } else {
                results.push(next)
            }
        }
        return results
    }

    const tokenLines = Object.entries(originals).map(([group, value]) => {
        const keys = flattenKeys(value)
        return `${group}: ${keys.join(', ') || '(empty)'}`
    })

    const propGroupLines = Object.entries(getTokenPropGroups()).map(([group, props]) => {
        return `${group}: ${props.join(', ') || '(empty)'}`
    })

    const content = ['### Token groups', formatLines(tokenLines), '', '### Token prop groups', formatLines(propGroupLines)].join('\n')

    await api.trigger('onMetaData', { kind: 'ai', data: { section: 'tokens', title: 'Tokens', content } })
}

const tokenUsagePattern = /\$\$\s*\.\s*token\s*\.\s*[A-Za-z_$]/

export const onParse: Plugin<'onParse'> = async (_api, input) => {
    if (hasProxyTokens) return
    if (input.preparedOnly) return
    const content = input.content
    if (!content || typeof content !== 'string') return
    if (tokenUsagePattern.test(content)) {
        hasProxyTokens = true
    }
}

export const onPropTree: Plugin<'onPropTree'> = async (api, { tree, parser }) => {
    if (!hasTokenOverrides && tree && typeof tree === 'object' && 'tokens' in tree) {
        hasTokenOverrides = true
        hasTokens = true
    }
    if (api.emitAllTokens) {
        emitAllTokenVars(api)
    }

    const groupsSizeBefore = usedTokenGroups.size

    api.walkPropTree(tree, (name, prop) => {
        const descriptor = api.dictionary.get(name)

        if (!descriptor) return

        const isTokenCodeString = Boolean(prop.dynamic && prop.code?.startsWith('$$.token.'))
        //console.log({ name, isTokenCodeString, prop })
        hasProxyTokens = hasProxyTokens || isTokenCodeString
        const pathString = isTokenCodeString
            ? prop.code?.replace('$$.token.', '')
            : typeof prop.value === 'string'
              ? prop.value.startsWith('$$.token')
                  ? prop.value.replace('$$.token.', '')
                  : `${name}.${prop.value}`
              : prop.value

        // Not a token expression
        if (typeof pathString !== 'string') return

        const path = pathString.split('.')
        const [tokenGroupName, ...rest] = path
        const isExplicitToken =
            isTokenCodeString || (typeof prop.value === 'string' && prop.value.startsWith('$$.token.'))
        const { aliases } = descriptor
        const rawValue = prop.value
        const dashName = typeof name === 'string' ? api.camelCaseToDash(name) : ''
        const groupCandidates: string[] = []
        const seenCandidates = new Set<string>()
        const addCandidate = (group: string | null | undefined) => {
            if (!group || seenCandidates.has(group)) return
            seenCandidates.add(group)
            groupCandidates.push(group)
        }
        const addGroupsForProp = (propName: string) => {
            if (!propName) return
            for (const group of getTokenGroupsForProp(propName)) {
                addCandidate(group)
            }
        }
        if (typeof name === 'string') {
            addGroupsForProp(name)
            if (dashName && dashName !== name) {
                addGroupsForProp(dashName)
            }
        }
        for (const alias of aliases) {
            addGroupsForProp(alias)
            const dashedAlias = api.camelCaseToDash(alias)
            if (dashedAlias && dashedAlias !== alias) {
                addGroupsForProp(dashedAlias)
            }
        }
        const addOriginalGroup = (groupName: string) => {
            if (!groupName) return
            if (Object.prototype.hasOwnProperty.call(originals, groupName)) addCandidate(groupName)
        }
        if (typeof name === 'string') {
            addOriginalGroup(name)
            if (dashName && dashName !== name) addOriginalGroup(dashName)
        }
        for (const alias of aliases) {
            addOriginalGroup(alias)
            const dashedAlias = api.camelCaseToDash(alias)
            if (dashedAlias && dashedAlias !== alias) addOriginalGroup(dashedAlias)
        }

        const getOriginalGroupValues = (group: string) =>
            (originals as Record<string, TokenGroup | undefined>)[group]

        let resolvedGroupName = isExplicitToken ? tokenGroupName : (getTokenGroupForProp(String(name)) ?? tokenGroupName)
        let values: TokenGroup | null = null
        if (isExplicitToken) {
            const valuesByGroupName =
                getOriginalGroupValues(resolvedGroupName) ??
                getOriginalGroupValues(tokenGroupName) ??
                valueMap.get(resolvedGroupName) ??
                valueMap.get(tokenGroupName)
            const valuesByPropName = aliases.reduce<TokenGroup | null>((acc, alias) => {
                if (acc) return acc
                const direct = getOriginalGroupValues(alias) ?? valueMap.get(alias)
                if (direct) return direct
                const dashed = api.camelCaseToDash(alias)
                return getOriginalGroupValues(dashed) ?? valueMap.get(dashed) ?? null
            }, null)
            values = valuesByGroupName || valuesByPropName
        } else if (typeof rawValue === 'string') {
            const tokenAlphaCandidate = parseTokenAlphaValue(rawValue)
            const baseParts = tokenAlphaCandidate ? tokenAlphaCandidate.base.split('.') : []
            const rawParts = rawValue.split('.')
            const colorTokens = getOriginalGroupValues('color')
            for (const group of groupCandidates) {
                const groupValues = getOriginalGroupValues(group)
                if (!groupValues) continue
                if (tokenAlphaCandidate && groupValues === colorTokens) {
                    const baseValue = resolveTokenParts(groupValues as Record<string, any>, baseParts)
                    if (baseValue !== undefined) {
                        resolvedGroupName = group
                        values = groupValues
                        break
                    }
                    continue
                }
                const tokenValue = resolveTokenParts(groupValues as Record<string, any>, rawParts)
                if (tokenValue !== undefined) {
                    resolvedGroupName = group
                    values = groupValues
                    break
                }
            }
        }

        //console.log({ values, valuesByGroupName, valuesByPropName, tokenGroupName, rest, aliases, valueMap })

        if (!values) return

        const colorTokens = valueMap.get('color')
        const tokenAlpha =
            typeof rawValue === 'string' && values && colorTokens && values === colorTokens
                ? parseTokenAlphaValue(rawValue)
                : null

        if (tokenAlpha) {
            const baseParts = tokenAlpha.base.split('.')
            const baseValue = resolveTokenParts(values as Record<string, any>, baseParts)
            if (baseValue === undefined) {
                warnAlpha(`Unknown token "${tokenAlpha.base}" for "${name}:${rawValue}".`)
                return
            }

            if (tokenAlpha.alpha === null) {
                warnAlpha(`Invalid token alpha "${tokenAlpha.alphaRaw}" for "${name}:${rawValue}" (use 0-100).`)
                return
            }

            const tokenPath = `${resolvedGroupName}.${tokenAlpha.base}`
            const varName = `--${api.selectorPrefix ?? ''}${tokenPath.replace(/\./g, '-')}`
            const mixValue = `color-mix(in oklab, var(${varName}) ${tokenAlpha.alpha}%, transparent)`

            prop.dynamic = false
            if (prop.selectorValue === undefined) {
                prop.selectorValue = rawValue
            }
            prop.value = mixValue
            hasTokens = true
            usedTokenGroups.add(resolvedGroupName)

            api.css.addRoot(`${varName}: ${api.dictionary.toValue(baseValue)};`)

            if (parser !== 'classname') {
                browserResolvedPaths.add(tokenPath)
            }
            return
        }

        const tokenValue = rest.length ? resolveTokenParts(values as Record<string, any>, rest) : undefined

        //console.log({ tokenValue })

        if (tokenValue !== undefined) {
            const tokenPath = `${resolvedGroupName}.${rest.join('.')}`
            const varName = `--${api.selectorPrefix ?? ''}${tokenPath.replace(/\./g, '-')}`
            prop.dynamic = false
            if (prop.selectorValue === undefined) {
                prop.selectorValue = parser === 'classname' ? prop.value : rest.join('.')
            }
            prop.value = `var(${varName})`
            hasTokens = true
            usedTokenGroups.add(resolvedGroupName)

            api.css.addRoot(`${varName}: ${api.dictionary.toValue(tokenValue)};`)

            const shouldTrackPath =
                runtimeIncludesTokenPaths || (typeof prop.value === 'string' && !prop.value.startsWith('$$'))
            if (parser !== 'classname' && typeof pathString === 'string' && shouldTrackPath) {
                browserResolvedPaths.add(tokenPath)
            }
        }
    })

    if (usedTokenGroups.size !== groupsSizeBefore && runtimeModuleName && runtimeConfigTest) {
        api.file.js.config(
            { from: runtimeModuleName, config: { tokenPropGroups: getRuntimeTokenPropGroups(api) } },
            runtimeConfigTest,
        )
    }
}
