import { h } from '@stencil/core'

import { styleToString } from '@/runtime/style'

export const createElement = (
    component: unknown,
    props: Record<string, unknown> | null,
    children: unknown,
) => {
    const hAny = h as (...args: any[]) => any
    if (props?.style && typeof props.style === 'object' && !Array.isArray(props.style)) {
        props.style = styleToString(props.style as Record<string, unknown>)
    }
    if (Array.isArray(children)) {
        return hAny(component as any, (props ?? null) as any, ...(children as any[]))
    }
    if (children === undefined) {
        return hAny(component as any, (props ?? null) as any)
    }
    return hAny(component as any, (props ?? null) as any, children as any)
}

export const getChildren = (restArgs: unknown[]) => {
    return restArgs?.[0]
}

export const getFactoryChildren = (_props: unknown, ref: unknown) => {
    return ref
}

export const applyRef = () => {
    // Stencil passes children as the second argument to functional components.
}
