import isCSSProp from '@boss-css/is-css-prop'
import hash from '@emotion/hash'

import { resolveAtQuery } from '@/prop/at/runtime-only'
import { buildKeyframesRule, normalizeKeyframeStep, parseKeyframesContext } from '@/prop/at/shared'
import { createChildContext } from '@/prop/child/runtime-only'
import { buildRuntimeSelector, resolvePropertyName } from '@/prop/css/runtime-only'
import { resolveRuntimeToken } from '@/use/token/runtime-only'
import { cx, type CxValue } from '@/cx'
import { getClassNameProp } from '@/shared/framework'
import { getBosswindSelectorMap } from '@/prop/bosswind/selectors'
import type { BossBrowserApi, Plugin } from '@/types'

export const name = 'classname-first'

const resolveRuntimeValue = (value: unknown): unknown => {
    if (typeof value !== 'function') return value
    return resolveRuntimeValue(value())
}

type RuntimeOutput = Record<string, unknown> & { style?: Record<string, unknown> }

const buildAutoKeyframesName = (api: BossBrowserApi, contexts: string[]) => {
    const signature = `${api.selectorPrefix ?? ''}|${contexts.join('|')}`
    return `kf-${hash(signature)}`
}

const handleKeyframes = (
    api: BossBrowserApi,
    {
        output,
        tag,
        contexts,
        prop,
        value,
    }: { output: RuntimeOutput; tag?: string; contexts: string[]; prop: string; value: unknown },
) => {
    const info = parseKeyframesContext(prop)
    if (!info || !value || typeof value !== 'object' || Array.isArray(value)) return false

    const classNameProp = getClassNameProp(api.framework)
    const keyframesContexts = [...contexts, prop]
    const keyframesName = info.name ?? buildAutoKeyframesName(api, keyframesContexts)
    const query = resolveAtQuery(api, keyframesContexts)

    const frames = new Map<string, Map<string, string>>()
    const selectors = new Set<string>()

    for (const [step, stepValue] of Object.entries(value)) {
        if (!stepValue || typeof stepValue !== 'object' || Array.isArray(stepValue)) continue
        const normalizedStep = normalizeKeyframeStep(step)
        if (!normalizedStep) continue

        const stepContexts = [...keyframesContexts, step]
        const selectorMap = getBosswindSelectorMap(stepValue as Record<string, unknown>)

        for (const [propName, rawValue] of Object.entries(stepValue)) {
            if (!isCSSProp(tag, propName)) continue

            let resolved = resolveRuntimeValue(rawValue)
            let selectorValue = resolved
            const token = resolveRuntimeToken(api, propName, resolved)
            if (token) {
                resolved = token.value
                selectorValue = token.selectorValue
            }

            const selectorEntry = selectorMap?.get(propName)
            const selectorProp = selectorEntry?.name ?? propName
            const selectorOverride = selectorEntry && Object.prototype.hasOwnProperty.call(selectorEntry, 'value')
                ? selectorEntry.value
                : undefined
            const finalSelectorValue = selectorOverride !== undefined ? selectorOverride : selectorValue
            const className = api.contextToClassName(
                selectorProp,
                finalSelectorValue,
                stepContexts,
                false,
                api.selectorPrefix,
            )
            const cssClassName = api.contextToClassName(
                selectorProp,
                finalSelectorValue,
                stepContexts,
                true,
                api.selectorPrefix,
            )
            output[classNameProp] = cx(output[classNameProp] as CxValue, className) as string

            const selector = buildRuntimeSelector(cssClassName, stepContexts)
            selectors.add(selector)

            const propertyName = resolvePropertyName(propName)
            const valueText = String(api.dictionary.toValue(resolved, propertyName))
            if (!frames.has(normalizedStep)) frames.set(normalizedStep, new Map())
            frames.get(normalizedStep)?.set(propertyName, valueText)
        }
    }

    if (!frames.size) return true

    const css = api.css
    if (!css) return true
    css.addRule(buildKeyframesRule(keyframesName, frames), query)

    for (const selector of selectors) {
        css.selector({ selector, query })
        css.rule('animation-name', keyframesName)
        css.write()
    }

    return true
}

const insertRuntimeRule = (api: BossBrowserApi, className: string, contexts: string[], prop: string, value: unknown) => {
    const selector = buildRuntimeSelector(className, contexts)
    const query = resolveAtQuery(api, contexts)
    const property = resolvePropertyName(prop)
    const css = api.css
    if (!css) return
    css.selector({ selector, query })
    css.rule(property, value)
    css.write()
}

export const onBrowserObjectStart: Plugin<'onBrowserObjectStart'> = (api, { input, output = {}, tag, contexts = [] }) => {
    const classNameProp = getClassNameProp(api.framework)
    const outputRecord = output as RuntimeOutput
    const inputRecord = input as Record<string, unknown>
    const selectorMap = getBosswindSelectorMap(inputRecord)
    for (const prop in inputRecord) {
        const rawValue = inputRecord[prop]

        if (prop === 'child' && rawValue && typeof rawValue === 'object' && !Array.isArray(rawValue)) {
            for (const [selector, childValue] of Object.entries(rawValue)) {
                const childContext = createChildContext(selector)
                contexts.push(childContext)
                api.trigger('onBrowserObjectStart', {
                    input: childValue as Record<string, unknown>,
                    output,
                    contexts,
                    tag,
                })
            }
            continue
        }

        if (rawValue && typeof rawValue === 'object' && !Array.isArray(rawValue)) {
            if (handleKeyframes(api, { output: outputRecord, tag, contexts, prop, value: rawValue })) continue
            contexts.push(prop)
            api.trigger('onBrowserObjectStart', { input: rawValue as Record<string, unknown>, output, contexts, tag })
            continue
        }

        if (!isCSSProp(tag, prop)) continue

        let value = resolveRuntimeValue(rawValue)
        let selectorValue = value
        const token = resolveRuntimeToken(api, prop, value)
        if (token) {
            value = token.value
            selectorValue = token.selectorValue
        }

        const selectorEntry = selectorMap?.get(prop)
        const selectorProp = selectorEntry?.name ?? prop
        const selectorOverride = selectorEntry && Object.prototype.hasOwnProperty.call(selectorEntry, 'value')
            ? selectorEntry.value
            : undefined
        const finalSelectorValue = selectorOverride !== undefined ? selectorOverride : selectorValue
        const className = api.contextToClassName(selectorProp, finalSelectorValue, contexts, false, api.selectorPrefix)
        const cssClassName = api.contextToClassName(selectorProp, finalSelectorValue, contexts, true, api.selectorPrefix)
        outputRecord[classNameProp] = cx(outputRecord[classNameProp] as CxValue, className) as string

        insertRuntimeRule(api, cssClassName, contexts, prop, value)
    }

    contexts.pop()
}
