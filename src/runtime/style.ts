export const styleToString = (style: Record<string, unknown>) => {
    let result = ''

    for (const [key, value] of Object.entries(style)) {
        if (value === null || value === undefined) continue
        const name = key.startsWith('--') || key.includes('-') ? key : key.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`)
        result += `${name}:${value};`
    }

    return result
}
