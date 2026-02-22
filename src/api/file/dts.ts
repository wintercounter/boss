import File from '@/api/file/file.js'
import type { BossFileEntry } from '@/types'

export default class Dts extends File {
    get headers(): Array<[string, BossFileEntry]> {
        return [
            ...super.headers,
            ['$$:ts-nocheck', { content: '// @ts-nocheck' }],
            ['$$:eslint-disable', { content: '/* eslint-disable */' }],
        ]
    }

    onText(key: unknown, value: unknown) {
        const keyText = typeof key === 'string' ? key : null
        if (value && keyText?.endsWith(':description')) {
            const text = typeof value === 'string' ? value : String(value)
            return `  /**
${text
    .split('\n')
    .map(line => `   * ${line}`)
    .join('\n')}
  */`
        }
        return value
    }
}
