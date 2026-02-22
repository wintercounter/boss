import fastGlob from 'fast-glob'

const DEFAULT_IGNORE = ['**/node_modules/**', '**/.bo$$/**', '**/dist/**']

export const resolveContentPaths = async (content: string | string[]) => {
    return fastGlob(content, {
        onlyFiles: false,
        absolute: true,
        cwd: process.cwd(),
        ignore: DEFAULT_IGNORE,
    })
}
