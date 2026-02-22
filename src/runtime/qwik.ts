import { jsx, jsxDEV } from '@builder.io/qwik/jsx-runtime'

export const createElement = (
    component: unknown,
    props: Record<string, unknown> | null,
    children: unknown,
    dev?: Record<string, unknown>,
) => {
    const resolvedProps = { ...(props ?? {}), children } as never
    if (dev) {
        const tag = typeof component === 'function' ? (component as { __bossTag?: unknown }).__bossTag : undefined
        const target = (tag ?? component) as never
        return jsxDEV(target, resolvedProps, undefined, false, dev as never, undefined)
    }
    return jsx(component as never, resolvedProps)
}

export const applyRef = () => {
    // Qwik passes a context-like value as the second argument; refs must be Signals.
}

export const getDev = (_key: unknown, rest: unknown[]) => {
    return rest?.[1]
}
