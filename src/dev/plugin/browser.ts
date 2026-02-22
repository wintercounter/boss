import type { Plugin } from '@/types'
export const name = 'devtools'

export const onBrowserObjectStart: Plugin<'onBrowserObjectStart'> = (api, { output = {}, contexts = [] }) => {
    if (contexts.length) return
    output['data-boss'] = 'true'
}