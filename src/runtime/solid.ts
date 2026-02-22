import { createComponent } from 'solid-js'
import { Dynamic } from 'solid-js/web'

export const createElement = (
    component: unknown,
    props: Record<string, unknown> | null,
    children: unknown,
) => {
    return createComponent(Dynamic as any, {
        component,
        ...(props ?? {}),
        children,
    } as any)
}
