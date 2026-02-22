import fs from 'node:fs'
import type { Plugin } from '@/types'

export const name = 'reset'

const readResetCss = () => {
    try {
        return fs.readFileSync(new URL('./reset.css', import.meta.url), 'utf8')
    } catch {}

    try {
        return fs.readFileSync(new URL('../../src/reset/reset.css', import.meta.url), 'utf8')
    } catch {}

    return ''
}

const resetCss = readResetCss()

export const onBoot: Plugin<'onBoot'> = api => {
    if (!resetCss) return
    api.css?.addRule?.(resetCss)
}