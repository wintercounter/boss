import './.bo$$'

import * as React from 'react'
import { createRoot, type Root } from 'react-dom/client'

import { DevtoolsApp } from './App'

type MountedRoot = {
    root: Root
    port: number
}

const roots = new WeakMap<HTMLElement, MountedRoot>()

export function mountDevtoolsApp(container: HTMLElement, port: number) {
    const existing = roots.get(container)
    if (existing) {
        if (existing.port === port) return
        existing.root.render(<DevtoolsApp port={port} />)
        existing.port = port
        return
    }

    const root = createRoot(container)
    root.render(<DevtoolsApp port={port} />)
    roots.set(container, { root, port })
}

if (typeof window !== 'undefined') {
    ;(window as Window & { __bossDevtoolsApp?: { mountDevtoolsApp: typeof mountDevtoolsApp } }).__bossDevtoolsApp = {
        mountDevtoolsApp,
    }
}
