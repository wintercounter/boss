import type { Plugin } from '@/types'
export const name = 'child'

export const createChildContext = (selector: string) => {
    const selectorToken = selector.replace(/ /g, '_')
    return `[${selectorToken}]`
}

export const onInit: Plugin<'onInit'> = api => {
    const prop = {
        property: 'child',
        aliases: ['child'],
        description: 'Arbitrary selector nesting',
    }
    api.dictionary.set('child', prop)
}