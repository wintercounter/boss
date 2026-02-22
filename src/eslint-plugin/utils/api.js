import { createApi } from '@/api/server'
import { loadConfig } from '@/api/config'

let api = null
let error = null
let initPromise = null

const initApi = () => {
    if (initPromise) return initPromise
    initPromise = (async () => {
        try {
            const config = await loadConfig(process.cwd())
            api = await createApi(config, true)
        } catch (err) {
            error = err
        }
    })()
    return initPromise
}

initApi()

export const getApi = () => {
    if (!initPromise) initApi()
    return { api, error }
}
