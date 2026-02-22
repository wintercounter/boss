export const DEFAULT_ATTRIBUTE_PATTERNS = ['^class(?:Name)?$']

export const DEFAULT_CALLEE_PATTERNS = ['^cx$', '^merge$', '^\\$\\$\\.cx$', '^\\$\\$\\.merge$']

export const DEFAULT_VARIABLE_PATTERNS = ['^classNames?$', '^classes$']

export const DEFAULT_TAG_PATTERNS = []

export const DEFAULT_COMPONENTS = ['$$']

export const DEFAULT_BREAKPOINTS = {
    micro: [null, 375],
    mobile: [376, 639],
    tablet: [640, 1023],
    small: [1024, 1439],
    medium: [1440, 1919],
    large: [1920, null],
    device: [null, 1023],
}

export const DEFAULT_PSEUDO_CONTEXTS = [
    'defined',
    'any-link',
    'link',
    'visited',
    'local-link',
    'target',
    'target-within',
    'scope',
    'hover',
    'active',
    'focus',
    'focus-visible',
    'focus-within',
    'current',
    'past',
    'future',
    'playing',
    'paused',
    'seeking',
    'buffering',
    'stalled',
    'muted',
    'volume-locked',
    'open',
    'closed',
    'modal',
    'fullscreen',
    'picture-in-picture',
    'enabled',
    'disabled',
    'read-write',
    'read-only',
    'placeholder-shown',
    'autofill',
    'default',
    'checked',
    'indeterminate',
    'blank',
    'valid',
    'invalid',
    'in-range',
    'out-of-range',
    'user-valid',
    'root',
    'empty',
    'first-child',
    'last-child',
    'only-child',
    'first-of-type',
    'last-of-type',
    'only-of-type',
    'after',
    'before',
]

export const getDefaultContexts = () => {
    const contexts = new Set(DEFAULT_PSEUDO_CONTEXTS)
    const breakpointNames = Object.keys(DEFAULT_BREAKPOINTS)

    for (const name of breakpointNames) {
        contexts.add(name)
        contexts.add(`${name}+`)
        contexts.add(`${name}-`)
    }

    contexts.add('at')
    contexts.add('container')
    contexts.add('dark')
    contexts.add('light')
    contexts.add('hdpi')

    return contexts
}
