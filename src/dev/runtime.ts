import { api } from '@/api/browser'
import { DEFAULT_DEV_PORT } from '@/dev/shared'

const getDevPort = () => {
    const rawPort = api?.devServer?.port
    const port = Number(rawPort)
    return Number.isFinite(port) ? port : DEFAULT_DEV_PORT
}

const startDevtools = () => {
    if (typeof window === 'undefined') return
    if (!isDevEnvironment()) return

    const port = getDevPort()
    const boot = () => {
        void import('boss-css/dev/client').then(({ startDevClient }) => {
            startDevClient({ port })
        })
    }
    if (typeof queueMicrotask === 'function') {
        queueMicrotask(boot)
    } else {
        setTimeout(boot, 0)
    }
}

const isDevEnvironment = () => {
    if (typeof process !== 'undefined' && process.env?.NODE_ENV) {
        return process.env.NODE_ENV !== 'production'
    }
    return true
}

startDevtools()
