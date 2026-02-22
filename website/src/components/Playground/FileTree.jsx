import React from 'react'
import { cn } from '@/lib/utils'
import {
    ChevronDownIcon,
    ChevronRightIcon,
    FileIcon,
    FolderIcon,
    Trash2Icon,
} from 'lucide-react'
import { buildFileTree } from './file-tree'

export default function FileTree({
    fileMap,
    folderSet,
    activeFile,
    collapsedFolders,
    setCollapsedFolders,
    dragOverPath,
    setDragOverPath,
    openFilePath,
    deleteEntry,
    moveEntry,
    moveFolder,
    getParentFolder,
    getDragPayload,
    getFileAccent,
}) {
    const tree = buildFileTree(fileMap, folderSet)

    const renderTree = (node, depth = 0, parentPath = '') => {
        if (node.type === 'file') {
            const isActive = node.path === activeFile
            return (
                <div
                    key={node.path}
                    role="button"
                    tabIndex={0}
                    className={cn(
                        'group flex w-full items-center gap-2 rounded-md border border-transparent bg-transparent pr-2.5 py-1.5 text-left text-xs text-foreground/90 transition',
                        'hover:bg-accent/40 hover:text-foreground',
                        isActive && 'bg-accent/70 text-foreground shadow-inner',
                    )}
                    style={{ paddingLeft: `${8 + depth * 20}px` }}
                    onClick={() => openFilePath(node.path)}
                    onKeyDown={event => {
                        if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault()
                            openFilePath(node.path)
                        }
                    }}
                    draggable
                    onDragStart={event => {
                        event.dataTransfer.setData(
                            'application/x-boss',
                            JSON.stringify({ type: 'file', path: node.path }),
                        )
                        event.dataTransfer.setData('text/plain', node.path)
                        event.dataTransfer.effectAllowed = 'move'
                    }}
                    onDragOver={event => {
                        event.preventDefault()
                        setDragOverPath(getParentFolder(node.path))
                    }}
                    onDragLeave={() => setDragOverPath(null)}
                    onDrop={event => {
                        event.preventDefault()
                        const payload = getDragPayload(event)
                        if (payload?.path) {
                            if (payload.type === 'folder') {
                                moveFolder(payload.path, getParentFolder(node.path))
                            } else {
                                moveEntry(payload.path, getParentFolder(node.path))
                            }
                        }
                        setDragOverPath(null)
                    }}
                >
                    <FileIcon className={cn('size-3.5 shrink-0', getFileAccent(node.path))} />
                    <span className="truncate">{node.name}</span>
                    <span className="ml-auto flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
                        <span
                            role="button"
                            tabIndex={0}
                            className="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground transition hover:bg-accent/40 hover:text-rose-200"
                            onClick={event => {
                                event.stopPropagation()
                                deleteEntry(node.path)
                            }}
                            onKeyDown={event => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                    event.preventDefault()
                                    event.stopPropagation()
                                    deleteEntry(node.path)
                                }
                            }}
                        >
                            <Trash2Icon className="size-3" />
                        </span>
                    </span>
                </div>
            )
        }

        const folderPath = parentPath ? `${parentPath}/${node.name}` : node.name
        const isCollapsed = folderPath && collapsedFolders.has(folderPath)
        return (
            <div key={node.name || 'root'}>
                {node.name && (
                    <div
                        className={cn(
                            'group flex items-center gap-2 rounded-md pr-2.5 py-1 text-xs text-foreground/80 transition',
                            'hover:bg-accent/40 hover:text-foreground',
                            dragOverPath === folderPath && 'bg-accent/60 text-foreground',
                        )}
                        style={{ paddingLeft: `${8 + depth * 20}px` }}
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                            setCollapsedFolders(prev => {
                                const next = new Set(prev)
                                if (isCollapsed) {
                                    next.delete(folderPath)
                                } else {
                                    next.add(folderPath)
                                }
                                return next
                            })
                        }}
                        onKeyDown={event => {
                            if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault()
                                setCollapsedFolders(prev => {
                                    const next = new Set(prev)
                                    if (isCollapsed) {
                                        next.delete(folderPath)
                                    } else {
                                        next.add(folderPath)
                                    }
                                    return next
                                })
                            }
                        }}
                        onDragOver={event => {
                            event.preventDefault()
                            setDragOverPath(folderPath)
                        }}
                        onDragLeave={() => setDragOverPath(null)}
                        onDrop={event => {
                            event.preventDefault()
                            const payload = getDragPayload(event)
                            if (payload?.path) {
                                if (payload.type === 'folder') {
                                    moveFolder(payload.path, folderPath)
                                } else {
                                    moveEntry(payload.path, folderPath)
                                }
                            }
                            setDragOverPath(null)
                        }}
                        draggable={Boolean(folderPath)}
                        onDragStart={event => {
                            if (!folderPath) return
                            event.dataTransfer.setData(
                                'application/x-boss',
                                JSON.stringify({ type: 'folder', path: folderPath }),
                            )
                            event.dataTransfer.setData('text/plain', folderPath)
                            event.dataTransfer.effectAllowed = 'move'
                        }}
                    >
                        {isCollapsed ? (
                            <ChevronRightIcon className="size-3 text-muted-foreground" />
                        ) : (
                            <ChevronDownIcon className="size-3 text-muted-foreground" />
                        )}
                        <FolderIcon className="size-3.5 text-muted-foreground" />
                        <span className="truncate">{node.name}</span>
                        <span className="ml-auto flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
                            <span
                            role="button"
                            tabIndex={0}
                            className="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground transition hover:bg-accent/40 hover:text-rose-200"
                            onClick={event => {
                                event.stopPropagation()
                                deleteEntry(folderPath)
                            }}
                                onKeyDown={event => {
                                    if (event.key === 'Enter' || event.key === ' ') {
                                        event.preventDefault()
                                        event.stopPropagation()
                                        deleteEntry(folderPath)
                                    }
                                }}
                            >
                                <Trash2Icon className="size-3" />
                            </span>
                        </span>
                    </div>
                )}
                {!isCollapsed &&
                    [...node.children.values()]
                        .sort((a, b) => {
                            if (a.type !== b.type) return a.type === 'directory' ? -1 : 1
                            return a.name.localeCompare(b.name)
                        })
                        .map(child => renderTree(child, depth + 1, folderPath))}
            </div>
        )
    }

    return <>{renderTree(tree)}</>
}
