import * as React from 'react'

type CanvasOverlayProps = {
    hoverRects: DOMRect[]
    selectedRects: DOMRect[]
}

export function CanvasOverlay({ hoverRects, selectedRects }: CanvasOverlayProps) {
    const canvasRef = React.useRef<HTMLCanvasElement | null>(null)
    const rectsRef = React.useRef({ hoverRects, selectedRects })

    rectsRef.current = { hoverRects, selectedRects }

    const draw = React.useCallback(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        ctx.clearRect(0, 0, canvas.width, canvas.height)

        drawRects(ctx, rectsRef.current.selectedRects, 'rgba(0, 210, 255, 0.22)', 'rgba(0, 210, 255, 0.8)')
        drawRects(ctx, rectsRef.current.hoverRects, 'rgba(255, 153, 0, 0.18)', 'rgba(255, 153, 0, 0.9)')
    }, [])

    const resize = React.useCallback(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ratio = window.devicePixelRatio || 1
        canvas.width = window.innerWidth * ratio
        canvas.height = window.innerHeight * ratio
        draw()
    }, [draw])

    React.useEffect(() => {
        resize()
        const onResize = () => resize()
        window.addEventListener('resize', onResize)
        return () => {
            window.removeEventListener('resize', onResize)
        }
    }, [resize])

    React.useEffect(() => {
        draw()
    }, [hoverRects, selectedRects, draw])

    return (
        <canvas
            ref={canvasRef}
            id="boss-devtools-canvas"
            data-boss-devtools="true"
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 2147483646,
                pointerEvents: 'none',
            }}
        />
    )
}

function drawRects(ctx: CanvasRenderingContext2D, rects: DOMRect[], fill: string, stroke: string) {
    if (!rects.length) return
    const ratio = window.devicePixelRatio || 1

    ctx.save()
    ctx.scale(ratio, ratio)
    ctx.fillStyle = fill
    ctx.strokeStyle = stroke
    ctx.lineWidth = 1

    rects.forEach(rect => {
        ctx.fillRect(rect.left, rect.top, rect.width, rect.height)
        ctx.strokeRect(rect.left, rect.top, rect.width, rect.height)
    })

    ctx.restore()
}
