const bosswindSelectorKey = Symbol.for('bosswind.selectorMap')

export type BosswindSelectorEntry = {
    name: string
    value?: unknown
}

type SelectorMap = Map<string, BosswindSelectorEntry>

type SelectorTarget = Record<string, unknown>

export const getBosswindSelectorMap = (input: SelectorTarget | null | undefined): SelectorMap | undefined => {
    if (!input || typeof input !== 'object') return undefined
    return (input as SelectorTarget & { [key: symbol]: SelectorMap | undefined })[bosswindSelectorKey]
}

export const setBosswindSelectorMap = (input: SelectorTarget, selectors: SelectorMap) => {
    Object.defineProperty(input, bosswindSelectorKey, {
        value: selectors,
        enumerable: false,
        configurable: true,
    })
}
