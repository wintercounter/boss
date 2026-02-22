import createElement from '@boss-css/document-create-element'

type CacheEntry = Record<string, any> & { $el?: HTMLElement }

const cache: Record<string, CacheEntry> = {}

export default function isDOMProp(tag: string, prop: string) {
    const tagEntry = (cache[tag] ??= {})
    if (prop in tagEntry) return tagEntry[prop]

    tagEntry.$el ??= createElement(tag)
    const element = tagEntry.$el as HTMLElement & Record<string, unknown>
    const isDOM = (tagEntry[prop] = prop in element || prop.toLowerCase() in element)

    // We actually only need attributes, native API methods will be treated as non-dom prop (eg. `after`)
    if (isDOM && typeof element[prop] === 'function') {
        tagEntry[prop] = false
    }

    return tagEntry[prop]
}
