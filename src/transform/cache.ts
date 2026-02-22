type CacheValue = { content: string; css: string; mtime: number; isFile: boolean; path: string }

export const cache = new Map<string, CacheValue>()

export const setCache = (path: string, data?: Partial<CacheValue>) => {
    const cachedValue = cache.get(path)
    const newValue = { content: '', css: '', mtime: 0, isFile: true, path, ...cachedValue, ...data }

    cache.set(path, newValue)

    return Boolean(cachedValue)
}
