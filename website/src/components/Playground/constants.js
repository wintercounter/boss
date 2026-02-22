export const DEFAULT_HEIGHT = 720
export const DEFAULT_OPEN_FILE = 'src/App.tsx'
export const MONACO_VERSION = '0.55.1'
export const MONACO_BASE = `https://cdn.jsdelivr.net/npm/monaco-editor@${MONACO_VERSION}/min`
export const MIN_SIDEBAR = 160
export const MIN_PREVIEW = 240
export const MIN_TERMINAL = 120
export const DEFAULT_INIT = {
    command: 'pnpm',
    args: [
        'exec',
        'boss-css',
        'init',
        '-y',
        '--overwrite',
        'false',
        '--src-root',
        'src',
        '--config-dir',
        'src/.bo$$',
        '--strategy',
        'inline-first',
        '--plugins',
        'fontsource,reset,token,at,child,css,pseudo,classname,jsx',
        '--globals',
        'true',
        '--eslint-plugin',
        'false',
        '--postcss',
        'auto',
    ],
}

export const DEFAULT_DEV = {
    command: 'pnpm',
    args: ['run', 'dev', '--', '--host', '0.0.0.0', '--port', '5173'],
}

export const DEFAULT_INSTALL = {
    command: 'pnpm',
    args: ['install', '--reporter=append-only'],
}
