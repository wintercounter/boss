if (typeof window !== 'undefined') {
    window.dataLayer = window.dataLayer || []

    if (typeof window.gtag !== 'function') {
        window.gtag = function gtag() {
            window.dataLayer.push(arguments)
        }
    }
}
