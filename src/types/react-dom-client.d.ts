declare module 'react-dom/client' {
    import type * as React from 'react'

    export type Root = {
        render: (children: React.ReactNode) => void
        unmount: () => void
    }

    export function createRoot(container: Element | DocumentFragment): Root
    export function hydrateRoot(container: Element | DocumentFragment, children: React.ReactNode): Root
}
