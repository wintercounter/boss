import fs from 'node:fs/promises'

import { cache, setCache } from '@/transform/cache'

export default async function processFile(path: string) {
    const cachedValue = cache.get(path)
    const mtime = await fs.stat(path).then(stats => stats.mtimeMs)
    let changed = false

    /*console.log(
        'cachedValue && cachedValue.mtime < mtime',
        cachedValue && cachedValue?.mtime < mtime,
        cachedValue?.mtime,
        mtime,
        path,
    )*/

    if (!cachedValue || cachedValue.mtime < mtime) {
        const content = await fs.readFile(path, 'utf-8')
        //console.log('setting cache', path, content)
        setCache(path, { content, mtime, isFile: true })
        changed = true
    }

    return { value: cache.get(path), changed }
}
