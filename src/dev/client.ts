type DevClientOptions = {
    port: number
    activate?: boolean
}

const DEVTOOLS_ATTR = 'data-boss-devtools'
const ROOT_ID = 'boss-devtools-root'

export function startDevClient({ port }: DevClientOptions) {
    if (typeof window === 'undefined') return

    const nextPort = Number(port)
    if (!Number.isFinite(nextPort)) return

    const container = ensureRoot()
    void loadDevtools().then(mount => {
        if (!mount) return
        mount(container, nextPort)
    })
}

function ensureRoot() {
    let container = document.getElementById(ROOT_ID)
    if (!container) {
        container = document.createElement('div')
        container.id = ROOT_ID
        container.setAttribute(DEVTOOLS_ATTR, 'true')
        document.body.appendChild(container)
    }
    return container
}

async function loadDevtools(): Promise<null | ((container: HTMLElement, port: number) => void)> {
    const globalMount =
        (globalThis as typeof globalThis & {
            __bossDevtoolsApp?: { mountDevtoolsApp?: (container: HTMLElement, port: number) => void }
        }).__bossDevtoolsApp?.mountDevtoolsApp
    if (typeof globalMount === 'function') {
        return globalMount as (container: HTMLElement, port: number) => void
    }

    try {
        const module = await import('boss-css/devtools-app')
        if (typeof module.mountDevtoolsApp === 'function') return module.mountDevtoolsApp
        const fallback =
            (globalThis as typeof globalThis & { __bossDevtoolsApp?: { mountDevtoolsApp?: unknown } })
                .__bossDevtoolsApp?.mountDevtoolsApp
        return typeof fallback === 'function' ? (fallback as (container: HTMLElement, port: number) => void) : null
    } catch {
        return null
    }
}
