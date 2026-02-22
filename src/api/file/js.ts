import hash from '@emotion/hash'

import File from '@/api/file/file.js'
import Dts from '@/api/file/dts.js'
import type { BossFileEntry } from '@/types'

export default class JS extends File {
    _d?: Dts
    get dts() {
        return (this._d ??= new Dts(this.api, { path: this.options.path.replace(/\.js$/, '.d.ts') }))
    }

    get headers(): Array<[string, BossFileEntry]> {
        return [
            ...super.headers,
            ['$$:eslint-disable', { content: '/* eslint-disable */' }],
            ['$$:ts-nocheck', { content: '// @ts-nocheck' }],
        ]
    }

    import(
        { name = null, from, as = null }: { name?: string | null; from: string; as?: string | null },
        test: () => boolean = () => true,
    ) {
        const imports = this.get('import')
        const isNamespace = name === '*'

        if (isNamespace) {
            const alias = as ?? `namespace_${hash(from)}`
            if (imports.has(alias)) return alias
            imports.set(alias, { content: `import * as ${alias} from '${from}'`, test })
            return alias
        }

        const key = `${name}_${hash(from)}`

        if (imports.has(key)) return key

        if (name === 'default') {
            imports.set(key, { content: `import ${key} from '${from}'`, test })
        } else if (name) {
            imports.set(key, { content: `import { ${name} as ${key} } from '${from}'`, test })
        } else {
            imports.set(key, { content: `import '${from}'`, test })
        }

        return key
    }

    _configs = new Map()
    config(
        { from, config }: { from: string; config: Record<string, unknown> },
        test: () => boolean = () => true,
    ) {
        const existing = this._configs.get(from)
        const configEntry = { ...existing, config: { ...existing?.config, ...config }, test }

        if (existing?.config?.plugin && config?.plugin) {
            configEntry.config.plugin = { ...existing.config.plugin, ...config.plugin }
        }

        this._configs.set(from, configEntry)

        // Now let's write it
        const testHasConfig = () => Array.from(this._configs.values()).some(({ test }) => !test || test())

        const createApiVar = this.import({ name: 'createApi', from: 'boss-css/api/browser' }, testHasConfig)
        this.set('body', '$$:createApiStart', `${createApiVar}({`, testHasConfig)
        const serializeConfigValue = (value: unknown, keyHint?: string) =>
            JSON.stringify(
                value,
                (k, v) => {
                    const name = k || keyHint
                    if (typeof v === 'string' && name) {
                        if (v.startsWith(`${name}_`)) {
                            return `$$__${v}__$$`
                        }
                        if (name === 'runtimeApi' && v === name) {
                            return `$$__${v}__$$`
                        }
                    }
                    return v
                },
                2,
            ).replace(/"\$\$__|__\$\$"/g, '')

        this.set(
            'body',
            '$$:createApiRoot',
            () => {
                const results: string[] = []
                for (const conf of this._configs.values()) {
                    if (conf.test && !conf.test()) continue
                    Object.entries(conf.config).forEach(([key, value]) => {
                        if (key === 'plugin' || key === 'plugins') return
                        if (value === undefined) return
                        results.push(`${key}: ${serializeConfigValue(value, key)},`)
                    })
                }
                return results.join('\n')
            },
            testHasConfig,
        )

        this.set(
            'body',
            '$$:createApiPlugins',
            () => {
                const results: string[] = []
                for (const conf of this._configs.values()) {
                    if (conf.test && !conf.test()) continue
                    if (!conf.config?.plugin) continue
                    results.push(`${serializeConfigValue(conf.config.plugin)}`)
                }
                return results.length ? `plugins: [${results.join(',\n')}],` : ''
            },
            testHasConfig,
        )

        this.set('body', '$$:createApiEnd', `})`, testHasConfig)
    }

    importAndConfig(
        { name, from }: { name: string; from: string },
        test: () => boolean = () => true,
    ) {
        const key = this.import({ name, from }, test)
        this.config({ from, config: { plugin: { [name]: key } } }, test)
        return key
    }

    async write() {
        await super.write()
        await this.dts.write()
    }
}
