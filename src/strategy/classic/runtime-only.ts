import hash from '@emotion/hash'
import isCSSProp from '@boss-css/is-css-prop'

import { escapeClassName } from '@/api/names'
import { resolveAtQuery } from '@/prop/at/runtime-only'
import { buildKeyframesRule, normalizeKeyframeStep, parseKeyframesContext } from '@/prop/at/shared'
import { createChildContext } from '@/prop/child/runtime-only'
import { buildRuntimeSelector, resolvePropertyName } from '@/prop/css/runtime-only'
import { resolveRuntimeToken } from '@/use/token/runtime-only'
import { cx, type CxValue } from '@/cx'
import { getClassNameProp } from '@/shared/framework'
import type { BossBrowserApi, Plugin } from '@/types'

export const name = 'classic'

type RuleEntry = {
    contexts: string[]
    prop: string
    value: unknown
}

type KeyframesEntry = RuleEntry & {
    keyframesContext: string
    step: string
}

type RuleGroup = {
    contexts: string[]
    entries: Array<{ prop: string; value: unknown }>
}

const serializeValue = (value: unknown) => {
    if (Array.isArray(value)) return JSON.stringify(value)
    if (value && typeof value === 'object') return JSON.stringify(value)
    return String(value)
}

const resolveRuntimeValue = (value: unknown): unknown => {
    if (typeof value !== 'function') return value
    return resolveRuntimeValue(value())
}

type RuntimeOutput = Record<string, unknown>

const buildAutoKeyframesName = (api: BossBrowserApi, contexts: string[]) => {
    const signature = `${api.selectorPrefix ?? ''}|${contexts.join('|')}`
    return `kf-${hash(signature)}`
}

const insertRuntimeRule = (api: BossBrowserApi, className: string, contexts: string[], entries: RuleGroup['entries']) => {
    if (!entries.length) return
    const css = api.css
    if (!css) return
    const selector = buildRuntimeSelector(className, contexts)
    const query = resolveAtQuery(api, contexts)
    css.selector({ selector, query })
    for (const entry of entries) {
        const property = resolvePropertyName(entry.prop)
        css.rule(property, entry.value)
    }
    css.write()
}

const collectRules = (
    api: BossBrowserApi,
    input: Record<string, unknown>,
    contexts: string[],
    tag: string,
    rules: RuleEntry[],
    keyframes: KeyframesEntry[],
) => {
    for (const prop in input) {
        const rawValue = input[prop]

        if (prop === 'child' && rawValue && typeof rawValue === 'object' && !Array.isArray(rawValue)) {
            for (const [selector, childValue] of Object.entries(rawValue)) {
                const childContext = createChildContext(selector)
                contexts.push(childContext)
                collectRules(api, childValue, contexts, tag, rules, keyframes)
                contexts.pop()
            }
            continue
        }

        if (rawValue && typeof rawValue === 'object' && !Array.isArray(rawValue)) {
            const info = parseKeyframesContext(prop)
            if (info) {
                const keyframesContexts = [...contexts, prop]
                for (const [step, stepValue] of Object.entries(rawValue)) {
                    if (!stepValue || typeof stepValue !== 'object' || Array.isArray(stepValue)) continue
                    const normalizedStep = normalizeKeyframeStep(step)
                    if (!normalizedStep) continue
                    const stepContexts = [...keyframesContexts, step]
                    for (const [propName, valueRaw] of Object.entries(stepValue)) {
                        if (!isCSSProp(tag, propName)) continue
                        let resolved = resolveRuntimeValue(valueRaw)
                        const token = resolveRuntimeToken(api, propName, resolved)
                        if (token) resolved = token.value
                        keyframes.push({
                            contexts: stepContexts,
                            prop: propName,
                            value: resolved,
                            keyframesContext: prop,
                            step: normalizedStep,
                        })
                    }
                }
                continue
            }
            contexts.push(prop)
            collectRules(api, rawValue as Record<string, unknown>, contexts, tag, rules, keyframes)
            contexts.pop()
            continue
        }

        if (!isCSSProp(tag, prop)) continue

        let value = resolveRuntimeValue(rawValue)
        const token = resolveRuntimeToken(api, prop, value)
        if (token) value = token.value

        rules.push({ contexts: [...contexts], prop, value })
    }
}

export const onBrowserObjectStart: Plugin<'onBrowserObjectStart'> = (api, { input, output = {}, tag, contexts = [] }) => {
    const classNameProp = getClassNameProp(api.framework)
    const outputRecord = output as RuntimeOutput
    const rules: RuleEntry[] = []
    const keyframes: KeyframesEntry[] = []
    collectRules(api, input as Record<string, unknown>, contexts, tag ?? '', rules, keyframes)

    if (!rules.length && !keyframes.length) {
        contexts.pop()
        return
    }

    const signature = [...rules, ...keyframes]
        .map(rule => `${rule.contexts.join('|')}|${rule.prop}|${serializeValue(rule.value)}`)
        .sort()
        .join(';')

    const className = `${api.selectorPrefix ?? ''}classic-${hash(signature)}`
    const cssClassName = escapeClassName(className)
    outputRecord[classNameProp] = cx(outputRecord[classNameProp] as CxValue, className) as string

    const baseEntries: RuleGroup['entries'] = []
    const nestedEntries = new Map<string, RuleGroup>()

    for (const rule of rules) {
        if (!rule.contexts.length) {
            baseEntries.push({ prop: rule.prop, value: rule.value })
            continue
        }

        const key = rule.contexts.join('|')
        if (!nestedEntries.has(key)) {
            nestedEntries.set(key, { contexts: rule.contexts, entries: [] })
        }
        nestedEntries.get(key)?.entries.push({ prop: rule.prop, value: rule.value })
    }

    insertRuntimeRule(api, cssClassName, [], baseEntries)
    for (const entry of nestedEntries.values()) {
        insertRuntimeRule(api, cssClassName, entry.contexts, entry.entries)
    }

    if (keyframes.length) {
        const groups = new Map<
            string,
            {
                contexts: string[]
                name: string
                query: string | null
                frames: Map<string, Map<string, string>>
                selectors: Set<string>
            }
        >()

        for (const entry of keyframes) {
            let keyframesIndex = -1
            for (let i = entry.contexts.length - 1; i >= 0; i -= 1) {
                if (parseKeyframesContext(entry.contexts[i])) {
                    keyframesIndex = i
                    break
                }
            }
            if (keyframesIndex === -1) continue

            const keyframesContext = entry.contexts[keyframesIndex]
            const info = parseKeyframesContext(keyframesContext)
            if (!info) continue

            const scopeContexts = entry.contexts.slice(0, keyframesIndex + 1)
            const groupKey = scopeContexts.join('|')
            if (!groups.has(groupKey)) {
                const name = info.name ?? buildAutoKeyframesName(api, scopeContexts)
                const query = resolveAtQuery(api, scopeContexts)
                groups.set(groupKey, { contexts: scopeContexts, name, query, frames: new Map(), selectors: new Set() })
            }

            const group = groups.get(groupKey)
            if (!group) continue

            const selector = buildRuntimeSelector(cssClassName, entry.contexts)
            group.selectors.add(selector)

            const propertyName = resolvePropertyName(entry.prop)
            const valueText = api.dictionary.toValue(entry.value, propertyName)
            if (!group.frames.has(entry.step)) group.frames.set(entry.step, new Map())
            group.frames.get(entry.step)?.set(propertyName, String(valueText))
        }

        const css = api.css
        if (!css) {
            contexts.pop()
            return
        }
        for (const group of groups.values()) {
            if (!group.frames.size) continue
            css.addRule(buildKeyframesRule(group.name, group.frames), group.query)
            for (const selector of group.selectors) {
                css.selector({ selector, query: group.query })
                css.rule('animation-name', group.name)
                css.write()
            }
        }
    }

    contexts.pop()
}
