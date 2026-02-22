import * as React from 'react'
import { Tooltip as TooltipPrimitive } from '@base-ui/react/tooltip'
import { cx } from 'boss-css/variants'

function TooltipProvider({ delay = 300, ...props }: TooltipPrimitive.Provider.Props) {
    return <TooltipPrimitive.Provider delay={delay} {...props} />
}

function Tooltip({ ...props }: TooltipPrimitive.Root.Props) {
    return (
        <TooltipProvider>
            <TooltipPrimitive.Root data-slot="tooltip" {...props} />
        </TooltipProvider>
    )
}

function TooltipTrigger({ ...props }: TooltipPrimitive.Trigger.Props) {
    return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />
}

function TooltipContent({
    className,
    side = 'top',
    sideOffset = 6,
    align = 'center',
    alignOffset = 0,
    children,
    ...props
}: TooltipPrimitive.Popup.Props &
    Pick<TooltipPrimitive.Positioner.Props, 'align' | 'alignOffset' | 'side' | 'sideOffset'>) {
    return (
        <TooltipPrimitive.Portal>
            <TooltipPrimitive.Positioner
                align={align}
                alignOffset={alignOffset}
                side={side}
                sideOffset={sideOffset}
                className="isolation:isolate z-index:60"
            >
                <TooltipPrimitive.Popup
                    data-slot="tooltip-content"
                    className={cx(
                        'background-color:rgba(10,12,18,0.96) border:1px_solid_rgba(88,102,128,0.45) border-radius:8px padding:4px_8px font-size:10px color:#eef2f7 box-shadow:0_10px_24px_rgba(0,0,0,0.35) backdrop-filter:blur(8px)',
                        className,
                    )}
                    {...props}
                >
                    {children}
                    <TooltipPrimitive.Arrow className="width:8px height:8px rotate:45deg background-color:rgba(10,12,18,0.96) border-left:1px_solid_rgba(88,102,128,0.45) border-top:1px_solid_rgba(88,102,128,0.45)" />
                </TooltipPrimitive.Popup>
            </TooltipPrimitive.Positioner>
        </TooltipPrimitive.Portal>
    )
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
