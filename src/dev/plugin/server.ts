import { DEFAULT_DEV_PORT } from '@/dev/shared'
import { startDevServer } from '@/dev/server'
import { updateDevPort, updateRuntimePort } from '@/dev/port'
import type { BossServerApi, Plugin } from '@/types'
import type { SessionPayload } from '@/tasks/session'

export const name = 'devtools'

let devServer: { server: { close: () => void }; port: number } | null = null
let starting: Promise<{ server: { close: () => void }; port: number }> | null = null
let handlersInstalled = false

export const onBoot: Plugin<'onBoot'> = async api => {
    if (process.env.NODE_ENV === "production") return;

    api.file.js.import({ from: 'boss-css/dev/runtime' })
    api.file.js.importAndConfig({ name: 'onBrowserObjectStart', from: 'boss-css/dev/plugin/browser' })
    const hostApiVar = api.file.js.import({ name: 'api', from: 'boss-css/api/browser' })
    api.file.js.set('body', 'devtools:globalThis', `globalThis.host$$ = ${hostApiVar}`)

    const port = Number(api.devServer?.port)
    if (Number.isFinite(port) && port !== DEFAULT_DEV_PORT) {
        api.file.js.config({ from: 'boss-css/dev/plugin', config: { devServer: { port } } })
    }
}

const ensureDevServer = async (api: BossServerApi, session: SessionPayload | null) => {
    if (devServer) return devServer
    if (starting) return starting

    const basePort = Number.isFinite(Number(api.devServer?.port)) ? Number(api.devServer?.port) : DEFAULT_DEV_PORT
    const maxPort = basePort + 49
    const host = '127.0.0.1'
    starting = startDevServer({ port: basePort, maxPort, host }).catch(err => {
        starting = null
        throw err
    })
    devServer = await starting
    starting = null

    const shouldInsert = devServer.port !== DEFAULT_DEV_PORT
    if (session?.configPath) {
        await updateDevPort(session.configPath, devServer.port, shouldInsert)
    }
    if (session?.runtimePath) {
        await updateRuntimePort(session.runtimePath, devServer.port)
    }

    if (!handlersInstalled) {
        handlersInstalled = true
        const closeServer = () => {
            if (!devServer) return
            devServer.server.close()
            devServer = null
        }

        process.once('exit', closeServer)
        process.once('SIGINT', () => {
            closeServer()
            process.exit()
        })
        process.once('SIGTERM', () => {
            closeServer()
            process.exit()
        })
    }

    if (typeof api.trigger === 'function') {
        await api.trigger('onMetaData', {
            kind: 'ai',
            replace: true,
            data: {
                section: 'dev-server',
                title: 'Dev server',
                content: [
                    `- host: ${host}`,
                    `- port: ${devServer.port}`,
                    `- ws: ws://${host}:${devServer.port}`,
                    `- autoStart: ${api?.devServer?.autoStart === false ? 'false' : 'true'}`,
                    `- eval: eval-client supported`,
                ].join('\n'),
            },
        })
    }

    return devServer
}

export const onSession: Plugin<'onSession'> = async (api, session) => {
    if (process.env.NODE_ENV === "production") return
    if (!session || session.phase !== 'start') return
    if (session.kind !== 'watch' && session.kind !== 'postcss') return
    if (api?.devServer?.autoStart === false) return

    await ensureDevServer(api, session)
}
