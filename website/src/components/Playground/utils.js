export const normalizeFilePath = filePath =>
    filePath.replace(/\\/g, '/').replace(/^\/+/, '').replace(/^\.\/+/, '')

export const normalizeFileMapKeys = files => {
    const next = {}
    Object.entries(files || {}).forEach(([path, content]) => {
        const normalized = normalizeFilePath(path)
        if (!normalized) return
        next[normalized] = content
    })
    return next
}

export const decodeFsName = name => {
    if (typeof name === 'string') return name
    if (name instanceof Uint8Array) {
        return new TextDecoder().decode(name)
    }
    return ''
}

export const shouldIgnorePath = filePath => {
    if (!filePath) return true
    const normalized = filePath.replace(/^\/+/, '')
    if (normalized.startsWith('node_modules/')) return true
    if (normalized.includes('/node_modules/')) return true
    if (normalized.startsWith('.git/')) return true
    return false
}

export const collectFoldersFromFiles = files => {
    const folders = new Set()
    Object.keys(files).forEach(filePath => {
        const parts = filePath.split('/')
        parts.pop()
        let current = ''
        for (const part of parts) {
            current = current ? `${current}/${part}` : part
            folders.add(current)
        }
    })
    return folders
}

export const formatStatus = status => {
    if (status === 'ready') return 'Ready'
    if (status === 'installing') return 'Installing'
    if (status === 'configuring') return 'Configuring'
    if (status === 'booting') return 'Booting'
    if (status === 'running') return 'Running'
    if (status === 'error') return 'Error'
    if (status === 'blocked') return 'Blocked'
    return 'Idle'
}

export const getStatusTone = status => {
    if (status === 'running' || status === 'ready') {
        return 'bg-emerald-500/15 text-emerald-200 border-emerald-500/40'
    }
    if (status === 'error') {
        return 'bg-rose-500/15 text-rose-200 border-rose-500/40'
    }
    if (status === 'blocked') {
        return 'bg-amber-400/15 text-amber-200 border-amber-400/40'
    }
    if (status === 'installing' || status === 'booting' || status === 'configuring') {
        return 'bg-sky-500/15 text-sky-200 border-sky-500/40'
    }
    return 'bg-muted/50 text-foreground/80 border-border/60'
}

export const inferLanguage = filePath => {
    if (filePath.endsWith('.tsx')) return 'typescript'
    if (filePath.endsWith('.ts')) return 'typescript'
    if (filePath.endsWith('.jsx')) return 'javascript'
    if (filePath.endsWith('.js')) return 'javascript'
    if (filePath.endsWith('.css')) return 'css'
    if (filePath.endsWith('.json')) return 'json'
    if (filePath.endsWith('.html')) return 'html'
    return 'plaintext'
}

export const cloneFiles = files => {
    const next = {}
    Object.entries(files || {}).forEach(([path, contents]) => {
        next[path] = contents
    })
    return next
}

export const updatePackageJson = (files, updater) => {
    const current = files['package.json']
    if (!current) return files
    try {
        const pkg = JSON.parse(current)
        updater(pkg)
        return {
            ...files,
            'package.json': `${JSON.stringify(pkg, null, 2)}\n`,
        }
    } catch (error) {
        console.error('Failed to update package.json', error)
        return files
    }
}

export const toFileTree = files => {
    const tree = {}
    Object.entries(files).forEach(([filePath, contents]) => {
        const parts = filePath.split('/')
        let cursor = tree
        parts.forEach((part, index) => {
            if (index === parts.length - 1) {
                cursor[part] = { file: { contents } }
                return
            }
            cursor[part] = cursor[part] || { directory: {} }
            cursor = cursor[part].directory
        })
    })
    return tree
}
