import { unitlessProperties, isNumericValue } from '@/api/dictionary'
import { createTokenVars } from '@/use/token/vars'

export const createBossValue = (unit: string) => {
    return (value: unknown): string | number | null | undefined => {
        if (Array.isArray(value)) {
            return value.map(v => (typeof v === 'number' && v !== 0 ? `${v}${unit}` : v)).join(' ')
        }

        if (typeof value === 'number') {
            return value !== 0 ? `${value}${unit}` : 0
        }
        return value as string | null | undefined
    }
}

export const createBossTokenVars = (unit: string, prefix = '') => {
    const toValue = (value: unknown, property?: string): string | number | null => {
        const propertyName = property
        if (Array.isArray(value)) {
            return value.map(v => toValue(v, propertyName)).join(' ')
        }
        if (typeof value === 'number' || isNumericValue(value as string | number)) {
            const numeric = typeof value === 'number' ? value : Number(value)
            if (propertyName && unitlessProperties.has(propertyName)) {
                return numeric === 0 ? 0 : `${numeric}`
            }
            return numeric === 0 ? 0 : `${numeric}${unit}`
        }
        if (value == null) return null
        return String(value)
    }

    const builder = createTokenVars({ prefix, toValue })
    return (input?: Record<string, unknown>) => builder(input)
}
