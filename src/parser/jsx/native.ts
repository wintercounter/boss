import { forwardRef, createElement } from 'react'
import type { ElementType } from 'react'
import {
    ActivityIndicator,
    FlatList,
    Image,
    Modal,
    Pressable,
    SafeAreaView,
    ScrollView,
    SectionList,
    Switch,
    Text,
    TextInput,
    TouchableHighlight,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from 'react-native'
import { api } from '@/api/browser'
import { cx, cv, scv, sv } from '@/cx'
import { merge } from '@/merge'

const nativeComponents: Record<string, ElementType> = {
    ActivityIndicator,
    FlatList,
    Image,
    Modal,
    Pressable,
    SafeAreaView,
    ScrollView,
    SectionList,
    Switch,
    Text,
    TextInput,
    TouchableHighlight,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
}

const registry = new Map<unknown, ElementType>()

const resolveComponent = (tag?: string | ElementType) => {
    if (!tag) return View
    if (typeof tag === 'string') return nativeComponents[tag] ?? View
    return tag
}

const getApi = () => {
    if (!api) {
        throw new Error('Boss runtime API is not initialized.')
    }
    return api
}

function createComponent(tag: string | ElementType) {
    if (registry.has(tag)) return registry.get(tag)
    const Component = forwardRef((props: Record<string, unknown>, ref: unknown) => {
        const Resolved = resolveComponent(tag)
        return createElement(Resolved as any, { ...props, ref }, props.children as any)
    })
    registry.set(tag, Component as ElementType)
    return Component as ElementType
}

const getDisplayName = (tag?: string | { displayName?: string; name?: string }) => {
    if (typeof tag === 'string') return tag
    return tag?.displayName || tag?.name || 'Component'
}

export function factory(tag?: string) {
    return function $$(props: Record<string, unknown>, ref?: unknown) {
        if (tag || ref !== undefined) {
            let tagName = tag
            const { children, as, ...rest } = props ?? {}
            const resolvedTag = (typeof as === 'string' ? as : undefined) || tagName || 'View'
            const displayName = getDisplayName(resolvedTag)
            const Component = createComponent(resolvedTag) as any
            Component.displayName = displayName ? '$$.' + displayName : '$$'
            const output: Record<string, unknown> = {}
            getApi().trigger('onBrowserObjectStart', { input: rest, tag: resolvedTag, output })
            return createElement(Component as any, output, children as any)
        }
        return props
    }
}

const defaultElement = factory('View') as any
defaultElement.displayName = '$$'
defaultElement.merge = merge
defaultElement.cx = cx
defaultElement.cv = cv
defaultElement.scv = scv
defaultElement.sv = sv
defaultElement.css = () => {}
defaultElement.$ = (input: unknown) => input

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
        if (typeof prop === 'symbol' || propIgnoreList.has(prop)) return undefined

        const targetRecord = target as unknown as Record<string, unknown>
        return (targetRecord[prop] ||= factory(prop)) as unknown
    },
    set(target, prop: string | symbol, value: unknown) {
        if (typeof prop !== 'string') return true
        const targetRecord = target as unknown as Record<string, unknown>
        targetRecord[prop] =
            typeof prop === 'string' && /^[A-Z]/.test(prop)
                ? (props: Record<string, unknown>) => factory((value as { as?: string })?.as || 'View')({ ...(value as Record<string, unknown>), ...props })
                : value

        return true
    },
})
