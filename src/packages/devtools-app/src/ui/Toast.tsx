import * as React from 'react'

export function Toast({ message }: { message: string | null }) {
    if (!message) return null

    return (
        <div className="position:fixed bottom:24px left:24px z-index:2147483647 background-color:#0f1115 color:#f5f6f8 border:1px_solid_#2b2f36 padding:10px_14px border-radius:10px box-shadow:0_8px_20px_rgba(0,0,0,0.3) font-size:12px font-family:IBM_Plex_Mono,ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace pointer-events:auto">
            {message}
        </div>
    )
}
