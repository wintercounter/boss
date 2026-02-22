import { UserConfig } from '@/api/config'
import { RuntimeType } from '@/shared/types'

export type ParsedArgs = {
    _: Array<string | number>
    '--'?: string[]
    [key: string]: unknown
}

export type Procedure = {
    prompt: (config: Config) => Promise<void>
}

export type Config = {
    argv: ParsedArgs
    runtimeType: RuntimeType
    procedures: Procedure[]
    userConfig: UserConfig
    isInitialized?: boolean
    repositoryType?: RepositoryType
    monorepoType?: MonorepoType
    monorepoDirectories?: string[]
    packageManager?: PackageManagerType
    [key: string]: unknown
}

export type Task = {
    procedures?: Procedure[]
    prompt: (config: Config) => Promise<string | number | boolean>
    key?: keyof Config
}

export type Tasks = Task[]

export type TaskFn = (config: Config) => Promise<Tasks>

export type StepFn = (config: Config) => Promise<string | number | boolean | undefined | symbol | unknown[] | void>

export enum RepositoryType {
    SINGLE = 'single',
    MONOREPO = 'monorepo',
}

export enum MonorepoType {
    WORKSPACES = 'workspaces',
    TURBOREPO = 'turborepo',
}

export enum PackageManagerType {
    NPM = 'npm',
    PNPM = 'pnpm',
    YARN = 'yarn',
    BUN = 'bun',
}

export enum MergeStrategy {
    TEXT_SKIP_DUPLICATE_LINES = 'textSkipDuplicateLines',
}

export type TemplateFileConfig = {
    file: string
    mergeStrategy?: MergeStrategy
}

export type TemplateFileConfigLoader = (config: Config) => Promise<TemplateFileConfig>

export { RuntimeType }
