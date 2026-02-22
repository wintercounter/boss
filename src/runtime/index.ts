import { api } from '@/api/browser'
import { cx, cv, scv, sv } from '@/cx'
import { merge } from '@/merge'

type BossRuntimeComponent = ((
    props: Record<string, unknown>,
    ref?: unknown,
    ...restArgs: unknown[]
) => unknown) & {
    displayName?: string
    merge?: typeof merge
    cx?: typeof cx
    cv?: typeof cv
    scv?: typeof scv
    sv?: typeof sv
    css?: () => void
    style?: (...inputs: Record<string, unknown>[]) => Record<string, unknown>
    $?: (input: unknown) => unknown
    __bossTag?: string
}

const registry: Record<string, BossRuntimeComponent> = {}

const getApi = () => {
    if (!api) {
        throw new Error('Boss runtime API is not initialized.')
    }
    return api
}

function createComponent(tag: string) {
    const existing = registry[tag]
    if (existing) return existing

    const component: BossRuntimeComponent = (props: Record<string, unknown>, ...restArgs: unknown[]) => {
        const currentApi = getApi()
        const runtimeChildren = currentApi.runtimeApi?.getChildren?.(restArgs)
        const input = props ?? {}
        const children = input.children ?? runtimeChildren
        const { children: _ignored, ...rest } = input
        if (children === undefined) {
            return currentApi.runtimeApi?.createElement(tag, rest)
        }
        return currentApi.runtimeApi?.createElement(tag, rest, children)
    }

    if (typeof tag === 'string') {
        component.__bossTag = tag
    }

    registry[tag] = component
    return component
}

function resolveBossOutput(input: Record<string, unknown>, tag?: string) {
    const currentApi = getApi()
    const output: Record<string, unknown> = {}
    currentApi.trigger('onBrowserObjectStart', { input, tag, output })
    return output
}

function resolveStyleTag(input: Record<string, unknown>) {
    const asValue = input.as
    if (typeof asValue === 'string') return asValue
    if (asValue && typeof asValue === 'function' && typeof (asValue as BossRuntimeComponent).__bossTag === 'string') {
        return (asValue as BossRuntimeComponent).__bossTag as string
    }
    return 'div'
}

export function factory(tag?: string) {
    return function $$(props: Record<string, unknown>, ref?: unknown, ...restArgs: unknown[]) {
        const currentApi = getApi()
        if (tag || ref !== undefined) {
            let tagName = tag
            const input = props ?? {}
            const { children, as, ...rest } = input
            const runtimeApi = currentApi.runtimeApi
            const runtimeChildren = runtimeApi?.getFactoryChildren?.(input, ref, restArgs)
            const resolvedChildren = children ?? runtimeChildren
            const dev = runtimeApi?.getDev?.(ref, restArgs)
            if (ref !== undefined && rest.ref === undefined) {
                const applyRef = runtimeApi?.applyRef
                if (applyRef) {
                    applyRef(rest, ref)
                } else {
                    rest.ref = ref
                }
            }
            const asTag = typeof as === 'string' ? as : undefined
            const displayName = asTag || tagName
            tagName = asTag || tagName || 'div'
            const Component = createComponent(tagName)
            Component.displayName = displayName ? '$$.' + displayName : '$$'
            const output = resolveBossOutput(rest, tagName)
            if (dev !== undefined) {
                return currentApi.runtimeApi?.createElement(Component, output, resolvedChildren, dev)
            }
            if (resolvedChildren === undefined) {
                return currentApi.runtimeApi?.createElement(Component, output)
            }
            return currentApi.runtimeApi?.createElement(Component, output, resolvedChildren)
        }
        return props
    }
}

const defaultElement: BossRuntimeComponent = factory('div')
defaultElement.displayName = '$$'
defaultElement.merge = merge
defaultElement.cx = cx
defaultElement.cv = cv
defaultElement.scv = scv
defaultElement.sv = sv
defaultElement.css = () => {}
defaultElement.style = (...inputs: Record<string, unknown>[]) => {
    if (!inputs.length) return {}
    const merged = merge(...inputs)
    if (!merged || typeof merged !== 'object' || Array.isArray(merged)) return {}
    const input = { ...(merged as Record<string, unknown>) }
    const tagName = resolveStyleTag(input)
    delete input.as
    delete input.children
    delete input.ref
    return resolveBossOutput(input, tagName)
}
defaultElement.$ = input => input

const propIgnoreList = new Set([
    'getDefaultProps',
    'defaultProps',
    'getDerivedStateFromProps',
    'getChildContext',
    'contextTypes',
    'contextType',
    'childContextTypes',
    'propTypes',
    'PropTypes',
])

export const proxy = new Proxy(defaultElement, {
    get(target, prop: string | symbol) {
        //console.log('hejj', prop, target[prop], propIgnoreList.has(prop) || typeof prop === 'symbol')

        if (typeof prop === 'symbol' || propIgnoreList.has(prop)) return undefined

        const targetRecord = target as unknown as Record<string, BossRuntimeComponent>
        return (targetRecord[prop] ||= factory(prop))
    },
    set(target, prop: string | symbol, value: unknown) {
        if (typeof prop !== 'string') return true

        const targetRecord = target as unknown as Record<string, unknown>
        targetRecord[prop] =
            typeof prop === 'string' && /^[A-Z]/.test(prop)
                ? (props: Record<string, unknown>, ref?: unknown, ...restArgs: unknown[]) =>
                      factory((value as { as?: string })?.as || 'div')(
                          { ...(value as Record<string, unknown>), ...props },
                          ref,
                          ...restArgs,
                      )
                : value

        return true
    },
})
