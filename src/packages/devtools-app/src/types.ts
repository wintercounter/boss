export type SourceLocation = {
    fileName: string
    lineNumber: number
    columnNumber: number
}

export type PropEntry = {
    path: string[]
    value: string | number | boolean | null | Array<string | number | boolean>
    editable: boolean
    kind: string
    code?: string
}

export type PropRow = {
    key: string
    label: string
    value: string
    editable: boolean
    kind: string
    hint?: string
    path: string[]
}

export type SelectionState = {
    element: Element
    source: SourceLocation
}

export type UiStatus = 'idle' | 'connecting' | 'connected' | 'error'

export type TokenSnapshot = {
    tokens: Record<string, Record<string, any>>
    propGroups: Record<string, string[]>
}
