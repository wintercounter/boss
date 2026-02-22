import hash from '@emotion/hash'

export type ClassNameStrategy = false | 'hash' | 'shortest' | 'unicode'

type ClassNameMapperOptions = {
    strategy: ClassNameStrategy
    prefix?: string
}

type ClassNameMapper = {
    strategy: ClassNameStrategy
    get: (token: string) => string | undefined
    getOrCreate: (token: string) => string
}

const shortestAlphabet = 'cCsSxyzXYZwqWQ'

const isUnsafeUnicode = (codePoint: number) => {
    if (codePoint <= 0x1f) return true
    if (codePoint >= 0x7f && codePoint <= 0x9f) return true
    if (codePoint === 0x00ad) return true
    if (codePoint >= 0xd800 && codePoint <= 0xdfff) return true
    if (codePoint >= 0xfdd0 && codePoint <= 0xfdef) return true
    if ((codePoint & 0xffff) === 0xfffe || (codePoint & 0xffff) === 0xffff) return true
    const char = String.fromCodePoint(codePoint)
    if (/\s/u.test(char)) return true
    return false
}

const createShortestGenerator = (alphabet: string) => {
    const letters = alphabet.split('')
    const base = letters.length
    let counter = 0

    return () => {
        let index = counter
        counter += 1
        let result = ''
        let value = index + 1
        while (value > 0) {
            value -= 1
            result = letters[value % base] + result
            value = Math.floor(value / base)
        }
        return result
    }
}

const createUnicodeGenerator = () => {
    let codePoint = 0x00a1

    return () => {
        while (isUnsafeUnicode(codePoint)) {
            codePoint += 1
        }
        const next = String.fromCodePoint(codePoint)
        codePoint += 1
        return next
    }
}

const applyPrefix = (value: string, prefix?: string) => {
    const applied = `${prefix ?? ''}${value}`
    if (!prefix && /^[0-9]/.test(applied)) {
        return `_${applied}`
    }
    return applied
}

export const createClassNameMapper = (options: ClassNameMapperOptions): ClassNameMapper => {
    const { strategy, prefix } = options
    const map = new Map<string, string>()

    if (!strategy) {
        return {
            strategy,
            get: () => undefined,
            getOrCreate: token => token,
        }
    }

    const nextShortest = createShortestGenerator(shortestAlphabet)
    const nextUnicode = createUnicodeGenerator()

    const createValue = (token: string) => {
        if (strategy === 'hash') {
            return applyPrefix(hash(token), prefix)
        }
        if (strategy === 'shortest') {
            return applyPrefix(nextShortest(), prefix)
        }
        if (strategy === 'unicode') {
            return applyPrefix(nextUnicode(), prefix)
        }
        return applyPrefix(token, prefix)
    }

    return {
        strategy,
        get: token => map.get(token),
        getOrCreate: token => {
            const existing = map.get(token)
            if (existing) return existing
            const created = createValue(token)
            map.set(token, created)
            return created
        },
    }
}

export type { ClassNameMapper }
