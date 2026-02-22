import React from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { PlusIcon, TerminalIcon } from 'lucide-react'
import styles from './styles.module.css'

export default function TerminalPanel({
    terminalTabs,
    activeTerminalId,
    onSelect,
    onAdd,
    containerReady,
    setTerminalContainer,
}) {
    return (
        <div className={styles.terminal}>
            <div className="flex items-center justify-between border-b border-border/60 bg-background/50 px-3 py-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                    {terminalTabs.map(tab => (
                        <button
                            key={tab.id}
                            type="button"
                            className={cn(
                                'flex items-center gap-2 rounded-md border border-transparent bg-transparent px-2 py-1 text-[0.7rem] text-muted-foreground transition',
                                'hover:bg-accent/40 hover:text-foreground',
                                tab.id === activeTerminalId && 'border-border/60 bg-accent/70 text-foreground',
                            )}
                            onClick={() => onSelect(tab.id)}
                        >
                            <TerminalIcon className="size-3.5" />
                            {tab.title}
                        </button>
                    ))}
                </div>
                <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    className="h-7 text-xs text-foreground/80 hover:bg-accent/40 hover:text-foreground"
                    onClick={onAdd}
                    disabled={!containerReady}
                >
                    <PlusIcon className="size-3.5" />
                    New Terminal
                </Button>
            </div>
            <div className={styles.terminalBody}>
                {terminalTabs.map(tab => (
                    <div
                        key={tab.id}
                        className={styles.terminalPane}
                        ref={setTerminalContainer(tab.id)}
                        style={{ display: tab.id === activeTerminalId ? 'block' : 'none' }}
                    />
                ))}
            </div>
        </div>
    )
}
