import path from 'node:path'
import ts from 'typescript'

type TypecheckOptions = {
    files: Record<string, string>
    compilerOptions?: ts.CompilerOptions
    moduleStubs?: Record<string, string>
    cwd?: string
}

type TypecheckResult = {
    diagnostics: ts.Diagnostic[]
    program: ts.Program
    cwd: string
}

const defaultModuleStubs: Record<string, string> = {
    react: `export namespace JSX {
  export interface IntrinsicElements {
    a: { href?: string; onClick?: (event: MouseEvent) => void }
    button: { onClick?: (event: MouseEvent) => void; type?: string }
    div: { onClick?: (event: MouseEvent) => void }
    span: { onClick?: (event: MouseEvent) => void }
  }

  export type Element = any
}

export type ComponentType<P = {}> =
  | { (props: P): any }
  | { bivarianceHack(props: P): any }['bivarianceHack']
export type ElementType = keyof JSX.IntrinsicElements | ComponentType
export type ComponentPropsWithoutRef<T> = T extends keyof JSX.IntrinsicElements
  ? JSX.IntrinsicElements[T]
  : T extends ComponentType<infer P>
    ? P
    : never
`,
    'react/jsx-runtime': `import type { JSX } from 'react'
export { JSX }
export const Fragment: unique symbol
export const jsx: (...args: any[]) => JSX.Element
export const jsxs: (...args: any[]) => JSX.Element
`,
    'react/jsx-dev-runtime': `import type { JSX } from 'react'
export { JSX }
export const Fragment: unique symbol
export const jsxDEV: (...args: any[]) => JSX.Element
`,
    'boss-css/cx': `export type CxValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | { [key: string]: boolean }
  | CxValue[]

export const cv: (...inputs: CxValue[]) => string
export const scv: (...inputs: CxValue[]) => string
export const sv: (...inputs: CxValue[]) => string
`,
    'boss-css/variants': `export type CxValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | { [key: string]: boolean }
  | CxValue[]

export const cv: (...inputs: CxValue[]) => string
export const scv: (...inputs: CxValue[]) => string
export const sv: (...inputs: CxValue[]) => string
`,
    'boss-css/merge': `export type MergeInput = unknown
export type MergeOutput = unknown
`,
}

const toPosix = (value: string) => value.split(path.sep).join(path.posix.sep)

export const typecheck = (options: TypecheckOptions): TypecheckResult => {
    const cwd = options.cwd ?? process.cwd()
    const compilerOptions: ts.CompilerOptions = {
        target: ts.ScriptTarget.ESNext,
        module: ts.ModuleKind.NodeNext,
        moduleResolution: ts.ModuleResolutionKind.NodeNext,
        jsx: ts.JsxEmit.ReactJSX,
        jsxImportSource: 'react',
        strict: true,
        skipLibCheck: true,
        noEmit: true,
        types: [],
        ...options.compilerOptions,
    }

    const virtualFiles = new Map<string, string>()
    const rootNames: string[] = []

    const addVirtualFile = (fileName: string, content: string, includeInRoots: boolean) => {
        const resolved = path.resolve(cwd, fileName)
        virtualFiles.set(resolved, content)
        if (includeInRoots) rootNames.push(resolved)
        return resolved
    }

    for (const [fileName, content] of Object.entries(options.files)) {
        addVirtualFile(fileName, content, true)
    }

    const moduleStubs = { ...defaultModuleStubs, ...options.moduleStubs }
    if (Object.keys(moduleStubs).length) {
        compilerOptions.baseUrl ??= cwd
        compilerOptions.paths = { ...compilerOptions.paths }

        for (const [moduleName, content] of Object.entries(moduleStubs)) {
            const stubRel = path.join('__virtual__', 'module-stubs', ...moduleName.split('/')) + '.d.ts'
            addVirtualFile(stubRel, content, false)
            compilerOptions.paths[moduleName] = [toPosix(stubRel)]
        }
    }

    const defaultHost = ts.createCompilerHost(compilerOptions, true)
    const resolveVirtual = (fileName: string) => virtualFiles.get(path.resolve(fileName))

    const host: ts.CompilerHost = {
        ...defaultHost,
        fileExists(fileName) {
            return resolveVirtual(fileName) !== undefined || defaultHost.fileExists(fileName)
        },
        readFile(fileName) {
            const virtual = resolveVirtual(fileName)
            if (virtual !== undefined) return virtual
            return defaultHost.readFile(fileName)
        },
        getSourceFile(fileName, languageVersion, onError, shouldCreateNewSourceFile) {
            const virtual = resolveVirtual(fileName)
            if (virtual !== undefined) {
                return ts.createSourceFile(fileName, virtual, languageVersion, true)
            }
            return defaultHost.getSourceFile(fileName, languageVersion, onError, shouldCreateNewSourceFile)
        },
        getCurrentDirectory() {
            return cwd
        },
    }

    const program = ts.createProgram(rootNames, compilerOptions, host)
    const diagnostics = [...ts.getPreEmitDiagnostics(program)]

    return { diagnostics, program, cwd }
}

export const formatDiagnostics = (diagnostics: ts.Diagnostic[], cwd = process.cwd()) =>
    ts.formatDiagnosticsWithColorAndContext(diagnostics, {
        getCanonicalFileName: fileName => fileName,
        getCurrentDirectory: () => cwd,
        getNewLine: () => '\n',
    })
