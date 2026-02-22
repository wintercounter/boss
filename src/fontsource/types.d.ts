import type {
    FontCategory,
    FontFamily,
    FontId,
    FontStyle,
    FontSubset,
    FontType,
    FontVersion,
    FontWeight,
} from '@/fontsource/directory'

type LooseString<T extends string> = T | (string & {})

type LooseNumber<T extends number> = T | (number & {})

export type FontDelivery = 'cdn' | 'local'

export type FontVariableAxes = {
    wght?: number | [number, number]
    wdth?: number | [number, number]
    slnt?: number | [number, number]
    ital?: 0 | 1
    [axis: string]: number | [number, number] | undefined
}

type FontConfigBase = {
    name: LooseString<FontFamily | FontId>
    subsets?: Array<LooseString<FontSubset>>
    version?: LooseString<FontVersion> | 'latest'
    category?: LooseString<FontCategory>
    type?: LooseString<FontType>
    delivery?: FontDelivery
    token?: string
}

export type FontConfigStatic = FontConfigBase & {
    variable?: false
    weights?: Array<LooseNumber<FontWeight>>
    styles?: Array<LooseString<FontStyle>>
    variableAxes?: never
}

export type FontConfigVariable = FontConfigBase & {
    variable: true
    variableAxes?: FontVariableAxes
    weights?: never
    styles?: never
}

export type FontConfig = FontConfigStatic | FontConfigVariable
