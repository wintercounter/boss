import fs from 'node:fs/promises'
import path from 'node:path'
import type { BossApiBase, BossFileEntry } from '@/types'

export type FileOptions = {
    path: string
}

export default class File extends Map<'head' | 'import' | 'body' | 'foot', Map<unknown, BossFileEntry>> {
    api: BossApiBase
    options: FileOptions

    constructor(api: BossApiBase, options: FileOptions = { path: '' }) {
        super()
        this.api = api
        this.options = options

        super.set('head', new Map())
        super.set('import', new Map())
        super.set('body', new Map())
        super.set('foot', new Map())
    }

    get(section: 'head' | 'import' | 'body' | 'foot') {
        const existing = super.get(section)
        if (existing) return existing
        const next = new Map<unknown, BossFileEntry>()
        super.set(section, next)
        return next
    }

    get headers(): Array<[string, BossFileEntry]> {
        return [
            [
                '$$:auto-generated-warning',
                {
                    content: `//!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
// Generated code. Do not edit!
//!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!`,
                },
            ],
        ]
    }

    get hasContent() {
        for (const section of this.values()) {
            if (section.size > 0) return true
        }
        return false
    }

    onText(key: unknown, value: unknown) {
        return value
    }

    get text() {
        const results = []
        for (const [key, section] of this.entries()) {
            const entries = section.entries()
            for (const [entryKey, entry] of entries) {
                const { content, test } = entry
                //entryKey?.startsWith && !entryKey.startsWith('css') && console.log({ entryKey, test: test?.() })
                if (!test || test()) {
                    results.push(this.onText(entryKey, typeof content === 'function' ? content(entry) : content))
                    results.push('\n')
                }
            }
            section.size && results.push('\n')
        }

        return results.join('').trim()
    }

    set(section: 'head' | 'import' | 'body' | 'foot', key: unknown, content: unknown, test?: () => boolean): this
    set(key: 'head' | 'import' | 'body' | 'foot', value: Map<unknown, BossFileEntry>): this
    set(sectionOrKey: 'head' | 'import' | 'body' | 'foot', keyOrValue: unknown, content?: unknown, test?: () => boolean) {
        if (content !== undefined || typeof keyOrValue !== 'object' || keyOrValue === null) {
            const section = sectionOrKey
            const key = keyOrValue ?? (keyOrValue === null ? performance.now() : undefined)
            const entryTest = test ?? (() => true)
            // First time setting something will also set the headers
            if (this.get('head').size === 0) {
                this.headers.forEach(entry => this.get('head').set(...entry))
            }
            this.get(section).set(key, { content, test: entryTest })
            return this
        }
        return super.set(sectionOrKey, keyOrValue as Map<unknown, BossFileEntry>)
    }

    append(section: 'head' | 'import' | 'body' | 'foot', key: unknown, content: string, test = () => true) {
        const existing = this.get(section).get(key) || { content: '', test }

        if (typeof content === 'string') {
            const existingContent = typeof existing.content === 'string' ? existing.content : ''
            this.get(section).set(key, { ...existing, content: existingContent + content })
        } else {
            throw new Error('File:append content must be a string')
        }
        return this
    }

    prepend(section: 'head' | 'import' | 'body' | 'foot', key: unknown, content: string, test = () => true) {
        const existing = this.get(section).get(key) || { content: '', test }

        if (typeof content === 'string') {
            const existingContent = typeof existing.content === 'string' ? existing.content : ''
            this.get(section).set(key, { ...existing, content: content + existingContent })
        } else {
            throw new Error('File:prepend content must be a string')
        }
        return this
    }

    replace(
        section: 'head' | 'import' | 'body' | 'foot',
        key: unknown,
        callback: (value: BossFileEntry['content'] | undefined, entry?: BossFileEntry) => BossFileEntry | string,
    ) {
        const existing = this.get(section).get(key)
        const value = callback(existing?.content, existing)

        if (typeof value === 'string') {
            this.get(section).set(key, { ...(existing ?? {}), content: value })
        } else {
            this.get(section).set(key, { ...(existing ?? {}), ...value })
        }
        return this
    }

    _prevText: string = ''
    async write() {
        const text = this.text

        if (text === this._prevText) return

        const baseDir = typeof this.api.baseDir === 'string' ? this.api.baseDir : process.cwd()
        const folder = this.api.folder ?? '.bo$$'
        const folderPath = path.isAbsolute(folder) ? folder : path.join(baseDir, folder)
        await fs.mkdir(folderPath, { recursive: true })
        await fs.writeFile(path.join(folderPath, this.options.path), text)
        this._prevText = text
    }
}
