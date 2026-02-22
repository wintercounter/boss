import { Dictionary } from './dictionary.js'
import { contextToCSSVariable, contextToClassName, dashToCamelCase, camelCaseToDash } from './names.js'
import { createLogger } from '@/log/browser'
import { resolveDebugValue } from '@/shared/debug'
import type {
    BossApiConfig,
    BossBrowserApi,
    BossPluginEventName,
    BossPluginEventPayload,
    BossPluginModule,
    BossPluginTest,
} from '@/types'

export let api: BossBrowserApi | null = null

export function createApi(config: BossApiConfig, force = false): BossBrowserApi {
    if (!force && api) return api

    const debug = resolveDebugValue(config.debug)
    const resolvedConfig = { ...config, debug }
    const logRoot = createLogger('boss', debug)
    const log = logRoot.child('api')
    log.log('Create browser API')

    api = {
        unit: 'px',
        trigger,
        isBrowser: true,
        log: logRoot,
        ...resolvedConfig,
        plugins: Array.isArray(resolvedConfig.plugins) ? (resolvedConfig.plugins as BossPluginModule[]) : [],

        // Methods & utils
        contextToCSSVariable,
        contextToClassName,
        camelCaseToDash,
        dashToCamelCase,
        /*processBrowserObject({ input, tag = 'div' }) {
            const output = {}
            trigger('onBrowserObjectStart', { input, tag, contexts: [], output })
            return output
        },*/
    } as BossBrowserApi

    api.dictionary = new Dictionary(api)

    trigger('onInit')

    return api
}

function trigger<Event extends BossPluginEventName>(
    eventName: Event,
    data?: BossPluginEventPayload[Event],
    test: BossPluginTest = () => true,
): void {
    if (!api) return
    const currentApi = api
    const log = currentApi.log.child('api').child('trigger')
    for (const plugin of currentApi.plugins) {
        if (!plugin[eventName] || !test(plugin)) continue

        const handlers = Array.isArray(plugin[eventName]) ? plugin[eventName] : [plugin[eventName]]

        for (const [index, handler] of Object.entries(handlers)) {
            log.log(eventName, plugin.name, `${+index + 1}/${handlers.length}`)
            handler(currentApi, data as BossPluginEventPayload[Event])
        }
    }
}
