import { applyChildSelectors, camelCaseToDash } from '@/api/names'
import { pseudoDependencies } from '@/prop/pseudo/shared'

export const resolvePropertyName = (prop: string) => (prop.includes('-') ? prop : camelCaseToDash(prop))

export const buildRuntimeSelector = (className: string, contexts: string[]) => {
    const baseSelector = `.${className}`
    const pseudoChain = contexts.filter(context => pseudoDependencies.has(context))
    const baseWithPseudos = pseudoChain.length ? `${baseSelector}:${pseudoChain.join(':')}` : baseSelector
    return applyChildSelectors(baseWithPseudos, contexts)
}
