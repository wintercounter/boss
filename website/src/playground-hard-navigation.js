if (typeof window !== 'undefined') {
    const isPrimaryClick = event => event.button === 0
    const isModifiedClick = event => event.metaKey || event.ctrlKey || event.shiftKey || event.altKey

    const shouldHardNavigateToPlayground = anchor => {
        if (!anchor?.href) return false
        if (anchor.target && anchor.target !== '_self') return false
        if (anchor.hasAttribute('download')) return false

        const url = new URL(anchor.href, window.location.origin)
        if (url.origin !== window.location.origin) return false

        return url.pathname === '/playground' || url.pathname.startsWith('/playground/')
    }

    const onDocumentClick = event => {
        if (event.defaultPrevented) return
        if (!isPrimaryClick(event)) return
        if (isModifiedClick(event)) return

        const anchor = event.target instanceof Element ? event.target.closest('a[href]') : null
        if (!anchor || !shouldHardNavigateToPlayground(anchor)) return

        event.preventDefault()
        window.location.assign(anchor.href)
    }

    document.addEventListener('click', onDocumentClick, true)
}
