import type { BossProp, BossPropTree } from '@/types'

export function objectToPropTree(obj: Record<string, unknown>, output: BossPropTree = {}): BossPropTree {
    Object.entries(obj).forEach(([name, value]) => {
        const prop: BossProp = { value: value as BossProp['value'] }
        if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
            prop.value = {}
            objectToPropTree(value as Record<string, unknown>, prop.value as BossPropTree)
        }
        output[name] = prop
    })
    return output
}

export function propTreeToObject(tree: BossPropTree): Record<string, unknown> {
    return Object.entries(tree).reduce((acc, [name, prop]) => {
        if (!prop.value !== null) {
            acc[name] = prop.value
        }
        return acc
    }, {} as Record<string, unknown>)
}

export function propTreeToArray(tree: BossProp[]): unknown[] {
    return tree.map(prop => prop.value)
}

export function propTreeToValue(tree: BossPropTree | BossProp[] | BossProp | unknown): unknown {
    if (Array.isArray(tree)) {
        return propTreeToArray(tree)
    }
    if (tree && typeof tree === 'object') {
        if ('value' in (tree as BossProp)) {
            return (tree as BossProp).value ?? tree
        }
        return propTreeToObject(tree as BossPropTree)
    }
    return (tree as BossProp)?.value ?? tree
}

export function walkPropTree(tree: BossPropTree, callback: (name: string, prop: BossProp) => void): void {
    Object.entries(tree).forEach(([name, prop]) => {
        callback(name, prop)
        if (prop.value && typeof prop.value === 'object' && !Array.isArray(prop.value)) {
            walkPropTree(prop.value as BossPropTree, callback)
        }
    })
}

export function mapPropTree(
    tree: BossPropTree,
    callback: (name: string, prop: BossProp, depth: number) => BossProp,
    depth: number = 0,
): BossPropTree {
    return Object.entries(tree).reduce((acc, [name, prop]) => {
        if (prop.value && typeof prop.value === 'object' && !Array.isArray(prop.value)) {
            acc[name] = {
                ...prop,
                value: mapPropTree(prop.value as BossPropTree, callback, depth + 1),
            }
        } else {
            acc[name] = callback(name, prop, depth)
        }
        return acc
    }, tree)
}
