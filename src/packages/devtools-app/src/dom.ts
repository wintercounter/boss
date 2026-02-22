import { BOSS_ATTR } from './constants'

export function getBossElement(element: Element) {
    return element.closest(`[${BOSS_ATTR}]`)
}

export function parseBossData(value: string | null) {
    if (!value) return null
    if (value === 'true' || value === '') return null
    try {
        return JSON.parse(decodeURIComponent(value))
    } catch {
        return null
    }
}

export function getFiberForElement(element: Element) {
    const keys = Object.keys(element as any)
    const fiberKey = keys.find(key => key.startsWith('__reactFiber$') || key.startsWith('__reactInternalInstance$'))
    return fiberKey ? (element as any)[fiberKey] : null
}

export function findBossFiber(fiber: any) {
    let current = fiber
    while (current) {
        const type = current.type
        if (type && typeof type.displayName === 'string' && type.displayName.startsWith('$$')) return current
        current = current.return
    }
    return null
}

export function getHostElement(fiber: any) {
    let current = fiber
    while (current) {
        if (current.stateNode instanceof Element) return current.stateNode
        current = current.child
    }
    return null
}
