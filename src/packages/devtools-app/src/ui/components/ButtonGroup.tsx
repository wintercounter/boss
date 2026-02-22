import * as React from 'react'
import { mergeProps } from '@base-ui/react/merge-props'
import { useRender } from '@base-ui/react/use-render'
import { Separator as SeparatorPrimitive } from '@base-ui/react/separator'
import { cx } from 'boss-css/variants'

type ButtonGroupSize = 'sm' | 'md' | 'lg'

type ButtonGroupProps<T extends React.ElementType> = {
    as?: T
    size?: ButtonGroupSize
    wrap?: boolean
    className?: string
    children?: React.ReactNode
} & Omit<React.ComponentPropsWithoutRef<T>, 'as' | 'className' | 'children'>

type ButtonGroupItemProps<T extends React.ElementType> = {
    as?: T
    active?: boolean
    size?: ButtonGroupSize
    className?: string
    children?: React.ReactNode
    isFirst?: boolean
    isLast?: boolean
    orientation?: 'horizontal' | 'vertical'
    wrap?: boolean
} & Omit<React.ComponentPropsWithoutRef<T>, 'as' | 'className' | 'children'>

const groupBaseClass =
    'display:flex align-items:stretch border-radius:10px border:1px_solid_rgba(120,132,156,0.45) background-color:rgba(16,18,24,0.94)'

const groupSizeClass: Record<ButtonGroupSize, string> = {
    sm: 'height:26px',
    md: 'height:32px',
    lg: 'height:38px',
}

const groupWrapSizeClass: Record<ButtonGroupSize, string> = {
    sm: 'min-height:26px',
    md: 'min-height:32px',
    lg: 'min-height:38px',
}

type ButtonGroupVariantProps = {
    orientation?: 'horizontal' | 'vertical'
    wrap?: boolean
}

export const buttonGroupVariants = ({ orientation = 'horizontal', wrap = false }: ButtonGroupVariantProps = {}) => {
    const orientationClass = orientation === 'vertical' ? 'flex-direction:column' : ''
    const wrapClass = wrap
        ? 'flex-wrap:wrap gap:4px padding:2px width:100% height:auto align-content:flex-start'
        : 'width:fit-content max-width:100% overflow:hidden'
    return cx(groupBaseClass, orientationClass, wrapClass)
}

const itemBaseClass =
    'appearance:none border:0 outline:none display:flex align-items:center justify-content:center font-weight:600 letter-spacing:0.06em text-transform:uppercase cursor:pointer transition:background-color_120ms_ease,color_120ms_ease,box-shadow_120ms_ease white-space:nowrap flex-shrink:0 line-height:1'

const itemSizeClass: Record<ButtonGroupSize, string> = {
    sm: 'padding:4px_12px font-size:10px',
    md: 'padding:6px_14px font-size:11px',
    lg: 'padding:8px_16px font-size:12px',
}

const itemActiveClass = 'background:primary-gradient-vertical color:primary-soft'

const itemInactiveClass = 'background:transparent color:#c4cede'

const positionClasses = (_isFirst?: boolean, _isLast?: boolean, _orientation?: 'horizontal' | 'vertical', wrap?: boolean) =>
    wrap ? 'border-radius:8px' : ''

export function ButtonGroup<T extends React.ElementType = 'div'>({
    as,
    size = 'md',
    wrap = false,
    className,
    children,
    ...rest
}: ButtonGroupProps<T>) {
    const Component = (as ?? 'div') as React.ElementType
    const childArray = React.Children.toArray(children)
    const totalItems = childArray.filter(
        child => React.isValidElement(child) && child.type === ButtonGroupItem,
    ).length
    let itemIndex = 0
    const orientation = (rest as { orientation?: 'horizontal' | 'vertical' }).orientation ?? 'horizontal'
    const sizeClass = wrap ? groupWrapSizeClass[size] : groupSizeClass[size]
    const classes = cx(buttonGroupVariants({ orientation, wrap }), sizeClass, className)

    return (
        <Component role="group" data-slot="button-group" className={classes} {...rest}>
            {childArray.map(child => {
                if (!React.isValidElement(child)) return child
                if (child.type !== ButtonGroupItem) return child
                const currentIndex = itemIndex
                itemIndex += 1
                const isFirst = currentIndex === 0
                const isLast = currentIndex === totalItems - 1
                return React.cloneElement(child as React.ReactElement<any>, {
                    size,
                    isFirst,
                    isLast,
                    orientation,
                    wrap,
                } as any)
            })}
        </Component>
    )
}

export function ButtonGroupItem<T extends React.ElementType = 'button'>({
    as,
    active,
    size = 'md',
    className,
    children,
    isFirst,
    isLast,
    orientation,
    wrap,
    ...rest
}: ButtonGroupItemProps<T>) {
    const Component = (as ?? 'button') as React.ElementType
    const stateClass = active ? itemActiveClass : itemInactiveClass
    const positionClass = positionClasses(isFirst, isLast, orientation, wrap)
    const classes = cx(itemBaseClass, itemSizeClass[size], stateClass, positionClass, className)

    return (
        <Component data-slot="button-group-item" className={classes} {...rest}>
            {children}
        </Component>
    )
}

export function ButtonGroupText({ className, render, ...props }: useRender.ComponentProps<'div'>) {
    const baseClass =
        'display:flex align-items:center gap:8px border:1px_solid_rgba(120,132,156,0.4) border-radius:10px padding:4px_10px font-size:11px font-weight:600 background-color:rgba(16,18,24,0.96) color:#d6dfef'
    const classes = cx(baseClass, className)
    return useRender({
        defaultTagName: 'div',
        props: mergeProps<'div'>(
            {
                className: classes,
            },
            props,
        ),
        render,
        state: {
            slot: 'button-group-text',
        },
    })
}

export function ButtonGroupSeparator({
    className,
    orientation = 'vertical',
    ...props
}: SeparatorPrimitive.Props) {
    const base =
        orientation === 'horizontal'
            ? 'height:1px width:100% background-color:rgba(120,132,156,0.3) margin:0_1px'
            : 'width:1px align-self:stretch background-color:rgba(120,132,156,0.3) margin:1px_0'
    const classes = cx(base, className)
    return <SeparatorPrimitive data-slot="button-group-separator" orientation={orientation} className={classes} {...props} />
}
