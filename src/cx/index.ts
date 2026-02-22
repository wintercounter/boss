import {
    cx as baseCx,
    cv as baseCv,
    scv as baseScv,
    type ClassValue,
    type ClassVariantCreatorFn,
    type SlotClassVariantCreatorFn,
    type StyleVariantCreatorFn,
} from 'css-variants'

import { createBossMerge, merge, type BossMergeConfig } from '@/merge'

export type CxValue = ClassValue
export type { BossMergeConfig }

type ClassNameResolver = (...inputs: ClassValue[]) => string

const createBossClassNameResolver = (mergeConfig: BossMergeConfig, resolver: ClassNameResolver = baseCx) => {
    const merge = createBossMerge(mergeConfig)

    return (...inputs: ClassValue[]) => {
        return merge(resolver(...inputs))
    }
}

export const createBossCx = (config: BossMergeConfig = {}) => {
    const resolve = createBossClassNameResolver(config)

    return (...inputs: ClassValue[]) => resolve(...inputs)
}

export const cx = createBossCx()

export const createBossCv = (mergeConfig: BossMergeConfig = {}): ClassVariantCreatorFn => {
    return config => {
        const classNameResolver = createBossClassNameResolver(mergeConfig, config.classNameResolver ?? baseCx)
        return baseCv({ ...config, classNameResolver })
    }
}

export const cv = createBossCv()

export const createBossScv = (mergeConfig: BossMergeConfig = {}): SlotClassVariantCreatorFn => {
    return config => {
        const classNameResolver = createBossClassNameResolver(mergeConfig, config.classNameResolver ?? baseCx)
        return baseScv({ ...config, classNameResolver })
    }
}

export const scv = createBossScv()

const resolveVariantProps = (
    defaults: Record<string, unknown> | undefined,
    props: Record<string, unknown> | undefined,
    ignoredKeys: Set<string>,
) => {
    const resolved = { ...(defaults ?? {}) }

    if (!props) return resolved

    for (const [key, value] of Object.entries(props)) {
        if (value === undefined || ignoredKeys.has(key)) continue
        resolved[key] = value
    }

    return resolved
}

export const createBossSv = (): StyleVariantCreatorFn => {
    return config => {
        const { base, variants, compoundVariants, defaultVariants } = config

        if (!variants) {
            return props => {
                const parts = [base, props?.style].filter(Boolean) as Record<string, unknown>[]
                return parts.length ? (merge(...parts) as Record<string, string | number>) : {}
            }
        }

        return props => {
            const resolvedProps = resolveVariantProps(
                defaultVariants as Record<string, unknown> | undefined,
                props as Record<string, unknown> | undefined,
                new Set(['style']),
            )

            const parts: Record<string, unknown>[] = []

            if (base) parts.push(base as Record<string, unknown>)

            for (const [key, value] of Object.entries(resolvedProps)) {
                const variant = variants[key]?.[value as string]
                if (variant) parts.push(variant as Record<string, unknown>)
            }

            if (compoundVariants) {
                for (const compound of compoundVariants) {
                    let matches = true

                    for (const [key, value] of Object.entries(compound)) {
                        if (key === 'style') continue
                        const resolvedValue = resolvedProps[key]

                        if (Array.isArray(value)) {
                            if (!value.includes(resolvedValue)) {
                                matches = false
                                break
                            }
                        } else if (value !== resolvedValue) {
                            matches = false
                            break
                        }
                    }

                    if (matches && compound.style) {
                        parts.push(compound.style as Record<string, unknown>)
                    }
                }
            }

            if (props?.style) {
                parts.push(props.style as Record<string, unknown>)
            }

            return parts.length ? (merge(...parts) as Record<string, string | number>) : {}
        }
    }
}

export const sv = createBossSv()
