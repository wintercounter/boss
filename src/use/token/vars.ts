import { normalizeTokens } from '@/use/token/normalize'

type ToValue = (value: unknown, property?: string) => string | number | null | undefined

type TokenVarsOptions = {
    prefix?: string
    toValue?: ToValue
}

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
    return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

const hasValueEntry = (value: unknown): value is { value: unknown } => {
    return isPlainObject(value) && Object.prototype.hasOwnProperty.call(value, 'value')
}

const hasDtcgValueEntry = (value: unknown): value is { $value: unknown } => {
    return isPlainObject(value) && Object.prototype.hasOwnProperty.call(value, '$value')
}

export const createTokenVars = ({ prefix = '', toValue }: TokenVarsOptions = {}) => {
    const resolveValue: ToValue = toValue ?? (value => (value == null ? value : String(value)))

    return (input?: Record<string, unknown>) => {
        const result: Record<string, string | number> = {}

        if (!input || typeof input !== 'object') return result

        const normalizedInput = normalizeTokens(input)

        const applyVar = (path: string[], group: string | null, value: unknown) => {
            if (!path.length) return
            const name = `--${prefix}${path.join('-')}`
            const propertyName = group ?? path[0]
            const resolved = resolveValue(value, propertyName)
            if (typeof resolved === 'number') {
                result[name] = resolved
                return
            }
            if (typeof resolved === 'string') {
                result[name] = resolved
                return
            }
            if (resolved == null) {
                return
            }
            result[name] = String(resolved)
        }

        const walk = (node: unknown, path: string[], group: string | null) => {
            if (node == null) return

            if (Array.isArray(node) || !isPlainObject(node)) {
                applyVar(path, group, node)
                return
            }

            if (hasValueEntry(node)) {
                applyVar(path, group, node.value)
                return
            }

            if (hasDtcgValueEntry(node)) {
                applyVar(path, group, node.$value)
                return
            }

            for (const [key, value] of Object.entries(node)) {
                if (key.startsWith('$')) continue
                walk(value, [...path, key], group ?? key)
            }
        }

        walk(normalizedInput, [], null)

        return result
    }
}
