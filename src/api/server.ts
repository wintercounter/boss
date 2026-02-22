import { Dictionary } from './dictionary.js'
import { CSS } from './css.js'
import { NoopCSS } from './noopCss.js'
import {
    propTreeToObject,
    walkPropTree,
    mapPropTree,
    objectToPropTree,
    propTreeToValue,
    propTreeToArray,
} from './propTree'
import {
    contextToCSSVariable,
    contextToClassName,
    escapeClassName,
    camelCaseToDash,
    dashToCamelCase,
    classTokenToSelector,
    applyChildSelectors,
} from './names'
import JS from './file/js'
import { createLogger } from '@/log/server'
import { resolveDebugValue } from '@/shared/debug'
import type {
    BossApiConfig,
    BossPluginEventName,
    BossPluginEventPayload,
    BossPluginModule,
    BossPluginTest,
    BossServerApi,
} from '@/types'

export let api: BossServerApi | null = null

export async function createApi(config: BossApiConfig, force = false): Promise<BossServerApi> {
    if (!force && api) return api

    const debug = resolveDebugValue(config.debug)
    const resolvedConfig = { ...config, debug }
    const logRoot = createLogger('boss', debug)
    const log = logRoot.child('api')
    log.log('Create server API')

    api = {
        //sourceFile: new SourceFile(),
        unit: 'px',
        trigger,
        isServer: true,
        log: logRoot,
        userConfig: resolvedConfig,
        ...resolvedConfig,
        plugins: Array.isArray(resolvedConfig.plugins) ? (resolvedConfig.plugins as BossPluginModule[]) : [],
        file: {},

        // Methods & utils
        propTreeToObject,
        propTreeToArray,
        propTreeToValue,
        walkPropTree,
        objectToPropTree,
        mapPropTree,
        escapeClassName,
        contextToCSSVariable,
        contextToClassName,
        camelCaseToDash,
        dashToCamelCase,
        classTokenToSelector,
        applyChildSelectors,
    } as BossServerApi
    const runtimeOnly = config?.runtime?.only === true
    const runtimeGlobals =
        runtimeOnly && config?.runtime?.globals ? config.runtime.globals : runtimeOnly ? 'inline' : 'file'
    const shouldCollectGlobals = runtimeOnly && runtimeGlobals !== 'none'
    if (runtimeOnly) {
        api.runtime = { ...(api.runtime ?? {}), globals: runtimeGlobals }
    }
    api.dictionary = new Dictionary(api)
    api.css = runtimeOnly ? (shouldCollectGlobals ? new CSS(api) : new NoopCSS(api)) : new CSS(api)
    api.file.js = new JS(api, { path: 'index.js' })
    api.file.native = new JS(api, { path: 'native.js' })
    const initBaseTypes = (dts: BossServerApi['file']['js']['dts'], options: { includeObject: boolean }) => {
        const valueTypes = ['string', 'number', 'boolean', ...(options.includeObject ? ['Record<string, any>'] : [])]
        const arrayTypes = valueTypes.concat('$$PropFunction').join(' | ')
        dts.set('body', '$$:FinalProps', `export type $$FinalProps = {}`)
            .set('body', '$$:PropFunction', `type $$PropFunction = (...args: any) => $$PropValues`)
            .set(
                'body',
                '$$:PropValues',
                `type $$PropValues =
    | ${valueTypes.join('\n    | ')}
    | (${arrayTypes})[]
    | $$PropFunction`,
            )
    }
    initBaseTypes(api.file.js.dts, { includeObject: false })
    initBaseTypes(api.file.native.dts, { includeObject: true })

    await trigger('onBoot')
    const autoLoadCss = config?.css?.autoLoad ?? true
    const shouldAutoLoad = autoLoadCss && (!runtimeOnly || runtimeGlobals === 'file')
    if (shouldAutoLoad) {
        api.file.js.import({ from: './styles.css' })
    }
    await trigger('onReady')

    return api
}

async function trigger<Event extends BossPluginEventName>(
    eventName: Event,
    data?: BossPluginEventPayload[Event],
    test: BossPluginTest = () => true,
): Promise<void> {
    if (!api) return
    const currentApi = api
    const log = currentApi.log.child('api').child('trigger')
    const resolveSource = (input: unknown) => {
        if (!input) return null
        if (typeof (input as { file?: unknown }).file === 'string') return (input as { file?: string }).file ?? null
        if (
            (input as { file?: { path?: unknown } }).file &&
            typeof (input as { file?: { path?: unknown } }).file?.path === 'string'
        ) {
            return (input as { file?: { path?: string } }).file?.path ?? null
        }
        if (typeof (input as { path?: unknown }).path === 'string') return (input as { path?: string }).path ?? null
        return null
    }

    const nextSource = resolveSource(data)
    const previousSource = currentApi.css?.source ?? null
    const shouldSetSource = nextSource !== null && nextSource !== undefined
    if (currentApi.css && shouldSetSource) {
        currentApi.css.setSource ? currentApi.css.setSource(nextSource) : (currentApi.css.source = nextSource)
    }

    try {
        for (const plugin of currentApi.plugins) {
            if (!plugin[eventName]) continue

            const testResult = await test(plugin)
            const dataName =
                data && typeof data === 'object' && 'name' in (data as Record<string, unknown>)
                    ? String((data as { name?: unknown }).name ?? '')
                    : ''
            log.log(`${!testResult ? 'skip: ' : ''}${eventName}${dataName ? `:${dataName}` : ''}`)
            if (!testResult) continue

            const handlers = Array.isArray(plugin[eventName]) ? plugin[eventName] : [plugin[eventName]]

            for (const [index, handler] of Object.entries(handlers)) {
                log.log('|-', plugin.name, `${+index + 1}/${handlers.length}`)
                await handler(currentApi, data as BossPluginEventPayload[Event])?.catch((err: Error) => {
                    throw new Error(`Error in ${plugin.name}:${eventName} handler: ${err.message}`)
                })
            }
        }
    } finally {
        if (currentApi.css && shouldSetSource) {
            currentApi.css.setSource
                ? currentApi.css.setSource(previousSource)
                : (currentApi.css.source = previousSource)
        }
    }
}
