import { dependencies as pseudoDependencies } from '@/prop/pseudo/server'
import {
    baseAtValues,
    buildContainerQuery,
    buildKeyframesRule,
    buildMediaQuery,
    defaultBreakpoints,
    parseContainerContext,
    parseKeyframesContext,
    normalizeKeyframeStep,
    parseRangeKey,
} from '@/prop/at/shared'
import hash from '@emotion/hash'
import type { BossProp, BossServerApi, Plugin } from '@/types'

export const UP = '+'
export const DOWN = '-'

export const name = 'at'

export const dependencies = new Set(['at', 'container', 'keyframes'])

export const values = new Map([
    ...baseAtValues,
    /* supports: ['supports', []],
        container: ['container', []],
        keyframes: ['keyframes', []],
        layer: ['layer', []],*/
])

export const onBoot: Plugin<'onBoot'> = async api => {
    const baseBreakpoints: Record<string, [number | null, number | null]> = {
        ...defaultBreakpoints,
        ...(api.breakpoints ?? {}),
    }

    api.breakpoints = {
        ...baseBreakpoints,
    }
    const breakpoints = api.breakpoints as Record<string, [number | null, number | null]>

    // Create breakpoints object with symbols
    Object.entries(breakpoints).forEach(([name, [from, to]]) =>
        [
            ['', [from, to]],
            [UP, [from, null]],
            [DOWN, [null, to]],
        ].forEach(([symbol, fromTo]) => (breakpoints[`${name}${symbol}`] = fromTo as [number | null, number | null])),
    )

    // Register dependencies
    Object.entries(breakpoints).forEach(([name, [from, to]]) => {
        dependencies.add(name)
        if (from === null) values.set(name, `@media screen and (max-width: ${to}px)`)
        else if (to === null) values.set(name, `@media screen and (min-width: ${from}px)`)
        else values.set(name, `@media screen and (min-width: ${from}px) and (max-width: ${to}px)`)
    })
    Array.from(values.keys()).forEach(name => dependencies.add(name))

    // Open type interface
    api.file.js.dts.set('body', `pseudo:AtPropsShorthandsInterfaceStart`, `export interface $$AtPropsShorthands {`)

    // Register props in dictionary
    for (const name of dependencies) {
        if (name === 'container') continue
        const description = name === 'keyframes' ? '@keyframes' : values.get(name) ?? ''
        const prop = { property: name, aliases: [name], description }
        api.dictionary.set(name, prop)

        // For `at` prop, we will add it separately
        name !== 'at' &&
            api.file.js.dts
                .set('body', `at:${name}:description`, prop.description)
                .set(
                    'body',
                    `at:${name}:declaration`,
                    `  "${name}"?: ${name === 'keyframes' ? '$$KeyframesProps' : '$$FinalProps'}\n`,
                )
    }

    api.file.js.dts
        .set('body', `pseudo:AtPropsShorthandsInterfaceEnd`, `}`)
        .set(
            'body',
            '$$:KeyframesProps',
            `export type $$KeyframesProps = {
    [key: string]: $$FinalProps
}`,
        )
        .set(
            'body',
            '$$:AtNamedProps',
            `export type $$AtNamedProps = {
    [key in \`container_\${string}\`]?: StandardProperties['container'] | $$FinalProps
} & {
    [key in \`keyframes_\${string}\`]?: $$KeyframesProps
}`,
        )
        .set(
            'body',
            `$$:AtProps`,
            `export type $$AtProps = {
    at?: {
        [key: string]: $$FinalProps | $$KeyframesProps
    } & { [key: \`keyframes \${string}\`]: $$KeyframesProps } & $$AtPropsShorthands & $$AtNamedProps
} & $$AtPropsShorthands & $$AtNamedProps`,
        )
        .replace('body', `$$:FinalProps`, v => `${v} & $$AtProps`)

    const runtimeConfig = api.runtime
    const hasRuntimeConfig = Boolean(runtimeConfig && (runtimeConfig.only !== undefined || runtimeConfig.strategy))
    if (hasRuntimeConfig) {
        api.file.js.importAndConfig({ name: 'onInit', from: 'boss-css/prop/at/runtime-only' }, () => true)
        api.file.js.config(
            { from: 'boss-css/prop/at/runtime-only', config: { breakpoints: baseBreakpoints } },
            () => true,
        )
    }

    const formatLines = (lines: string[]) => (lines.length ? lines.map(line => `- ${line}`).join('\n') : '- (none)')
    const breakpointLines = Object.entries(baseBreakpoints).map(([key, [min, max]]) => {
        const minText = min == null ? '' : `${min}`
        const maxText = max == null ? '' : `${max}`
        const range = minText && maxText ? `${minText}-${maxText}` : minText ? `${minText}+` : `-${maxText}`
        return `${key}: ${range}`
    })
    const valueLines = Array.from(values.entries()).map(([key, value]) => `${key}: ${value}`)
    const content = ['### Breakpoints', formatLines(breakpointLines), '', '### Base values', formatLines(valueLines)].join('\n')

    await api.trigger('onMetaData', {
        kind: 'ai',
        data: { section: 'at', title: 'At (breakpoints and media)', content },
    })
}

export const onReady: Plugin<'onReady'> = async api => {
    const updateFinalProps = (value: { content?: string } | string | null | undefined) => {
        const content = typeof value === 'string' ? value : value?.content
        if (typeof content !== 'string') return value
        if (!content.includes('StandardProperties')) return content
        if (content.includes(`Omit<StandardProperties, 'container'>`)) return content
        return content.replace(' & StandardProperties', () => {
            return ` & Omit<StandardProperties, 'container'> & { container?: StandardProperties['container'] | $$FinalProps }`
        })
    }

    api.file.js.dts.replace('body', '$$:FinalProps', updateFinalProps as (value: unknown) => string | import('@/types').BossFileEntry)
}

const isContainerContext = (value: string) => Boolean(parseContainerContext(value))
const isKeyframesContext = (value: string) => Boolean(parseKeyframesContext(value))

const getContainerInfo = (contexts: string[]) => {
    for (let i = contexts.length - 1; i >= 0; i -= 1) {
        const info = parseContainerContext(contexts[i])
        if (info) return info
    }
    return null
}

const getContainerInfoWithIndex = (contexts: string[]) => {
    for (let i = contexts.length - 1; i >= 0; i -= 1) {
        const info = parseContainerContext(contexts[i])
        if (info) return { ...info, index: i }
    }
    return null
}

const resolveMediaQuery = (api: BossServerApi, key: string) => {
    const direct = values.get(key)
    if (direct) return direct
    const range = parseRangeKey(key, api.breakpoints ?? {}, api.unit ?? 'px')
    if (range) return buildMediaQuery(range) ?? key
    return key
}

const resolveContainerQuery = (api: BossServerApi, key: string, name: string | null) => {
    if (key.startsWith('@')) return key
    const range = parseRangeKey(key, api.breakpoints ?? {}, api.unit ?? 'px')
    if (range) return buildContainerQuery(range, name)
    const prefix = name ? `@container ${name}` : '@container'
    return `${prefix} ${key}`
}

const resolveAtQuery = (api: BossServerApi, contexts: string[], key: string) => {
    const containerInfo = getContainerInfo(contexts)
    if (containerInfo) return resolveContainerQuery(api, key, containerInfo.name)
    return resolveMediaQuery(api, key)
}

const resolveQueryFromContexts = (api: BossServerApi, contexts: string[]) => {
    const atIndex = contexts.lastIndexOf('at')
    if (atIndex !== -1 && contexts[atIndex + 1]) {
        const containerInfo = parseContainerContext(contexts[atIndex + 1])
        if (containerInfo) {
            const key = contexts[atIndex + 2]
            if (!key) return null
            return resolveContainerQuery(api, key, containerInfo.name)
        }
        const key = contexts[atIndex + 1]
        return resolveMediaQuery(api, key)
    }

    const containerInfo = getContainerInfoWithIndex(contexts)
    if (containerInfo) {
        const key = contexts[containerInfo.index + 1]
        if (key) return resolveContainerQuery(api, key, containerInfo.name)
    }

    for (let i = contexts.length - 1; i >= 0; i -= 1) {
        const key = contexts[i]
        if (key.startsWith('@')) return key
        const range = parseRangeKey(key, api.breakpoints ?? {}, api.unit ?? 'px')
        if (range) return buildMediaQuery(range) ?? key
        const direct = values.get(key)
        if (direct) return direct
    }

    return null
}

const buildAutoKeyframesName = (api: BossServerApi, contexts: string[]) => {
    const signature = `${api.selectorPrefix ?? ''}|${contexts.join('|')}`
    return `kf-${hash(signature)}`
}

export const onProp: Plugin<'onProp'> = async (api, { name, prop, contexts, preferVariables, file }) => {
    //const className = api.contextToClassName(name, value, contexts)

    const isAt = name === 'at'
    const contextName = prop?.named ? `${name} ${prop.named}` : name

    type PropEntries = Record<string, BossProp>
    const handleKeyframes = async (entries: PropEntries, activeContexts: string[]) => {
        const keyframesContext = activeContexts.at(-1)
        if (!keyframesContext) return

        const keyframesInfo = parseKeyframesContext(keyframesContext)
        if (!keyframesInfo) return

        const keyframesName = keyframesInfo.name ?? buildAutoKeyframesName(api, activeContexts)
        const query = resolveQueryFromContexts(api, activeContexts)

        const frames = new Map<string, Map<string, string>>()
        const selectors = new Set<string>()

        for (const [step, stepProp] of Object.entries(entries) as Array<[string, BossProp]>) {
            if (!stepProp?.value || typeof stepProp.value !== 'object' || Array.isArray(stepProp.value)) continue
            const normalizedStep = normalizeKeyframeStep(step)
            if (!normalizedStep) continue

            const stepContexts = [...activeContexts, step]
            const stepEntries = stepProp.value as PropEntries

            for (const [propName, propValue] of Object.entries(stepEntries) as Array<[string, BossProp]>) {
                if (!propValue || typeof propValue !== 'object' || Array.isArray(propValue)) continue

                const resolved = api.dictionary.resolve(propName)
                const descriptor = resolved.descriptor
                const isCustomProperty = typeof propName === 'string' && propName.startsWith('--')
                if (!descriptor?.isCSSProp && !isCustomProperty) continue

                const propertyName = isCustomProperty
                    ? propName
                    : descriptor?.property ?? api.camelCaseToDash(propName)

                const selectorValue = preferVariables
                    ? null
                    : propValue.selectorValue !== undefined
                      ? propValue.selectorValue
                      : propValue.value
                const classToken = propValue.classToken
                const resolvedName = resolved?.name ?? propName
                const selectorName = propValue.selectorName ?? resolvedName
                const className = classToken
                    ? null
                    : api.contextToClassName(selectorName, selectorValue, stepContexts, true, api.selectorPrefix)
                const baseSelector = classToken ? api.classTokenToSelector(classToken) : `.${className}`
                const pseudoChain = stepContexts.filter(context => pseudoDependencies.has(context))
                const baseWithPseudos = pseudoChain.length ? `${baseSelector}:${pseudoChain.join(':')}` : baseSelector
                const selector = api.applyChildSelectors(baseWithPseudos, stepContexts)
                selectors.add(selector)

                const value =
                    propValue.value === null
                        ? `var(${api.contextToCSSVariable(resolvedName, null, stepContexts, api.selectorPrefix)})`
                        : String(api.dictionary.toValue(propValue.value, propertyName))

                if (!frames.has(normalizedStep)) frames.set(normalizedStep, new Map())
                frames.get(normalizedStep)?.set(propertyName, value)
            }
        }

        if (!frames.size) return

        api.css.addRule(buildKeyframesRule(keyframesName, frames), query)

        const needsImportant = api.strategy === 'inline-first' && preferVariables === true && activeContexts.length > 0
        for (const selector of selectors) {
            api.css.selector({ selector, query })
            api.css.rule('animation-name', keyframesName, needsImportant ? { important: true } : undefined)
            api.css.write()
        }
    }

    const processEntries = async (entries: PropEntries, nextContexts: string[]) => {
        for (const [key, styleProp] of Object.entries(entries) as Array<[string, BossProp]>) {
            if (!styleProp?.value || typeof styleProp.value !== 'object' || Array.isArray(styleProp.value)) continue
            const styleEntries = styleProp.value as PropEntries

            if (isContainerContext(key)) {
                nextContexts.push(key)
                await processEntries(styleEntries, nextContexts)
                nextContexts.pop()
                continue
            }

            if (isKeyframesContext(key)) {
                nextContexts.push(key)
                await handleKeyframes(styleEntries, nextContexts)
                nextContexts.pop()
                continue
            }

            nextContexts.push(key)
            const query = resolveAtQuery(api, nextContexts, key)

            for (const i in styleEntries) {
                const entry = styleEntries[i]
                const classToken = entry?.classToken
                const resolved = api.dictionary.resolve(i)
                const resolvedName = resolved.descriptor ? resolved.name : i
                const selectorName = entry?.selectorName ?? resolvedName
                if (resolved.suffix) {
                    entry.named = resolved.suffix
                    entry.rawName = resolved.raw
                }
                const selectorValue = preferVariables
                    ? null
                    : entry?.selectorValue !== undefined
                      ? entry.selectorValue
                      : entry.value
                const className = classToken
                    ? null
                    : api.contextToClassName(selectorName, selectorValue, nextContexts, true, api.selectorPrefix)
                const baseSelector = classToken ? api.classTokenToSelector(classToken) : `.${className}`
                const pseudoChain = nextContexts.filter(context => pseudoDependencies.has(context))
                const baseWithPseudos = pseudoChain.length ? `${baseSelector}:${pseudoChain.join(':')}` : baseSelector
                const selector = api.applyChildSelectors(baseWithPseudos, nextContexts)
                if (query && entry && !entry.query) {
                    entry.query = query
                }
                api.css.selector({
                    selector,
                    query,
                })

                await api.trigger(
                    'onProp',
                    { name: resolvedName, prop: entry, contexts: nextContexts, preferVariables, file },
                    ({ dependencies }) => {
                        return !dependencies || dependencies.has(resolvedName)
                    },
                )

                // It's possible that another prop handler closed this selector
                if (api.css.current) {
                    api.css.write()
                }
            }

            nextContexts.pop()
        }
    }

    if (isAt) contexts.push(name)
    const propValue = (isAt ? prop.value : { [contextName]: { value: prop.value } }) as PropEntries
    await processEntries(propValue, contexts)
    if (isAt) contexts.pop()
}
