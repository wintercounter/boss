import fs from 'node:fs/promises'

export const updateDevPort = async (configPath: string, port: number, allowInsert: boolean) => {
    const raw = await fs.readFile(configPath, 'utf8')

    const portPattern = /(devServer\s*:\s*{[^}]*port\s*:\s*)(\d+)/m
    if (portPattern.test(raw)) {
        const next = raw.replace(portPattern, `$1${port}`)
        await fs.writeFile(configPath, next)
        return true
    }

    if (!allowInsert) {
        return true
    }

    const folderLine = raw.match(/^[ \t]*folder\s*:[^\n]*$/m)
    if (folderLine) {
        const indent = folderLine[0].match(/^[ \t]*/)?.[0] ?? '    '
        const insert = `${indent}devServer: { port: ${port} },\n`
        const next = raw.replace(folderLine[0], `${folderLine[0]}\n${insert}`)
        await fs.writeFile(configPath, next)
        return true
    }

    const defaultExport = raw.match(/export default\s*{\s*/m)
    if (defaultExport) {
        const insert = `export default {\n    devServer: { port: ${port} },\n`
        const next = raw.replace(defaultExport[0], insert)
        await fs.writeFile(configPath, next)
        return true
    }

    return false
}

export const updateRuntimePort = async (runtimePath: string, port: number) => {
    try {
        const raw = await fs.readFile(runtimePath, 'utf8')
        const markerPattern = /port:\s*\d+(?=[^\n]*boss-dev-port)/
        if (!markerPattern.test(raw)) return false
        const next = raw.replace(markerPattern, `port: ${port}`)
        await fs.writeFile(runtimePath, next)
        return true
    } catch {
        return false
    }
}
