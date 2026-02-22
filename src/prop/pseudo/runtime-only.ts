import { pseudoDependencies } from '@/prop/pseudo/shared'
import type { Plugin } from '@/types'

export const dependencies = pseudoDependencies

export const name = 'pseudo'

export const onInit: Plugin<'onInit'> = api => {
    for (const pseudo of dependencies) {
        const prop = {
            property: pseudo,
            aliases: [pseudo],
            description: `Pseudo class: ${pseudo}`,
            values: [],
            initial: '',
            descriptor: {},
        }
        api.dictionary.set(pseudo, prop)
    }
}
