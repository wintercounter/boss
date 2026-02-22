const isHiddenFolder = part => part === 'node_modules'

export const buildFileTree = (files, folders) => {
    const root = { name: '', type: 'directory', path: '', children: new Map() }
    const ensureFolder = folderPath => {
        const parts = folderPath.split('/').filter(Boolean)
        let current = root
        let currentPath = ''
        for (const part of parts) {
            if (isHiddenFolder(part)) return null
            currentPath = currentPath ? `${currentPath}/${part}` : part
            if (!current.children.has(part)) {
                current.children.set(part, {
                    name: part,
                    type: 'directory',
                    path: currentPath,
                    children: new Map(),
                })
            }
            current = current.children.get(part)
        }
        return current
    }

    Object.keys(files)
        .sort((a, b) => a.localeCompare(b))
        .forEach(filePath => {
            const parts = filePath.split('/').filter(Boolean)
            let current = root
            let currentPath = ''
            for (let index = 0; index < parts.length; index += 1) {
                const part = parts[index]
                if (isHiddenFolder(part)) return
                currentPath = currentPath ? `${currentPath}/${part}` : part
                if (index === parts.length - 1) {
                    current.children.set(part, { name: part, type: 'file', path: filePath })
                    return
                }
                if (!current.children.has(part)) {
                    current.children.set(part, {
                        name: part,
                        type: 'directory',
                        path: currentPath,
                        children: new Map(),
                    })
                }
                current = current.children.get(part)
            }
        })

    if (folders) {
        folders.forEach(folderPath => {
            ensureFolder(folderPath)
        })
    }

    return root
}
