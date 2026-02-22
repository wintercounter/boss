import createElement from '@boss-css/document-create-element'

const cache = {}

export default function isCSSProp(tag, prop) {
    const tagEntry = (cache[tag] ??= {})
    if (tagEntry[prop] !== undefined) return tagEntry[prop]

    tagEntry.$el ??= createElement(tag)
    tagEntry[prop] = prop in tagEntry.$el.style

    return tagEntry[prop]
}
