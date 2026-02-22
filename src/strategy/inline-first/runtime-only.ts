import isCSSProp from '@boss-css/is-css-prop'
import hash from '@emotion/hash'

import { resolveAtQuery } from '@/prop/at/runtime-only'
import { buildKeyframesRule, normalizeKeyframeStep, parseKeyframesContext } from '@/prop/at/shared'
import { createChildContext } from '@/prop/child/runtime-only'
import { buildRuntimeSelector, resolvePropertyName } from '@/prop/css/runtime-only'
import { resolveRuntimeToken } from '@/use/token/runtime-only'
import { cx, type CxValue } from '@/cx'
import { getClassNameProp } from '@/shared/framework'
import type { BossBrowserApi, Plugin } from '@/types'

export const name = 'inline-first'

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

    output.style ??= {}

    for (const [step, stepValue] of Object.entries(value)) {
        if (!stepValue || typeof stepValue !== 'object' || Array.isArray(stepValue)) continue
        const normalizedStep = normalizeKeyframeStep(step)
        if (!normalizedStep) continue

        const stepContexts = [...keyframesContexts, step]

        for (const [propName, rawValue] of Object.entries(stepValue)) {
            if (!isCSSProp(tag, propName)) continue

            let resolved = resolveRuntimeValue(rawValue)
            const token = resolveRuntimeToken(api, propName, resolved)
            if (token) resolved = token.value

            const cssVarName = api.contextToCSSVariable(propName, null, stepContexts, api.selectorPrefix)
            output.style[cssVarName] = api.dictionary.toValue(resolved, propName)

            const className = api.contextToClassName(propName, null, stepContexts, false, api.selectorPrefix)
            const cssClassName = api.contextToClassName(propName, null, stepContexts, true, api.selectorPrefix)
            output[classNameProp] = cx(output[classNameProp] as CxValue, className) as string

            const selector = buildRuntimeSelector(cssClassName, stepContexts)
            selectors.add(selector)

            const propertyName = resolvePropertyName(propName)
            const valueText = `var(${cssVarName})`
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
        css.rule('animation-name', keyframesName, { important: true })
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
    css.rule(property, value, { important: true })
    css.write()
}

export const onBrowserObjectStart: Plugin<'onBrowserObjectStart'> = (api, { input, output = {}, tag, contexts = [] }) => {
    const classNameProp = getClassNameProp(api.framework)
    const outputRecord = output as RuntimeOutput
    const inputRecord = input as Record<string, unknown>
    outputRecord.style ??= {}

    for (const prop in inputRecord) {
        const rawValue = inputRecord[prop]
        const resolved = api.dictionary.resolve(prop)
        const descriptor = resolved.descriptor
        const resolvedName = resolved.name

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
            if (descriptor?.handler) {
                descriptor.handler({ value: rawValue, output: outputRecord, contexts })
                continue
            }
            contexts.push(prop)
            api.trigger('onBrowserObjectStart', { input: rawValue as Record<string, unknown>, output, contexts, tag })
            continue
        }

        let value = resolveRuntimeValue(rawValue)
        const token = resolveRuntimeToken(api, resolvedName, value)
        if (token) value = token.value

        if (descriptor?.handler) {
            descriptor.handler({ value, output: outputRecord, contexts })
            continue
        }

        const cssProp = isCSSProp(tag, resolvedName)

        if (!contexts.length && cssProp) {
            outputRecord.style[resolvedName] = api.dictionary.toValue(value, resolvedName)
            continue
        }

        const className = api.contextToClassName(resolvedName, null, contexts, false, api.selectorPrefix)
        const cssClassName = api.contextToClassName(resolvedName, null, contexts, true, api.selectorPrefix)
        const cssVarName = api.contextToCSSVariable(resolvedName, null, contexts, api.selectorPrefix)
        outputRecord.style[cssVarName] = api.dictionary.toValue(value, resolvedName)
        outputRecord[classNameProp] = cx(outputRecord[classNameProp] as CxValue, className) as string

        if (cssProp) {
            insertRuntimeRule(api, cssClassName, contexts, resolvedName, `var(${cssVarName})`)
        }
    }

    contexts.pop()
}
