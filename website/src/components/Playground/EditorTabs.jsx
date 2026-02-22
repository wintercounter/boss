import React from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { FileIcon, SaveIcon, XIcon } from 'lucide-react'

export default function EditorTabs({
    openFiles,
    activeFile,
    dirtyFiles,
    savePulse,
    onOpenFile,
    onCloseFile,
    onSaveFile,
    containerReady,
}) {
    return (
        <div className="flex items-center justify-between border-b border-border/60 bg-background/40 px-2 py-1">
            <div className="flex items-center gap-1">
                {openFiles.map(filePath => {
                    const isActive = filePath === activeFile
                    const isDirty = dirtyFiles.has(filePath)
                    const label = filePath.split('/').pop()
                    return (
                        <button
                            key={filePath}
                            type="button"
                            className={cn(
                                'group flex items-center gap-2 rounded-md border border-transparent bg-transparent px-2 py-1 text-xs text-foreground/80 transition',
                                'hover:bg-accent/40 hover:text-foreground',
                                isActive && 'border-border/60 bg-accent/70 text-foreground shadow-inner',
                            )}
                            onClick={() => onOpenFile(filePath)}
                        >
                            <FileIcon className="size-3.5 text-muted-foreground" />
                            <span className="max-w-[140px] truncate">{label}</span>
                            {isDirty && <span className="size-1.5 rounded-full bg-amber-400" />}
                            <span
                                className="ml-1 inline-flex text-muted-foreground opacity-0 transition group-hover:opacity-100"
                                onClick={event => {
                                    event.stopPropagation()
                                    onCloseFile(filePath)
                                }}
                            >
                                <XIcon className="size-3" />
                            </span>
                        </button>
                    )
                })}
            </div>
            <div className="flex items-center gap-2 pr-1">
                {dirtyFiles.has(activeFile) && <span className="text-amber-300">●</span>}
                {savePulse && (
                    <Badge variant="secondary" className="text-[0.6rem]">
                        Saved
                    </Badge>
                )}
                <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    className="h-7 border-border/60 bg-background/60 text-xs text-foreground hover:bg-accent/40"
                    onClick={() => onSaveFile(activeFile)}
                    disabled={!containerReady}
                >
                    <SaveIcon className="size-3.5" />
                    Save
                </Button>
            </div>
        </div>
    )
}
