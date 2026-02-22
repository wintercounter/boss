import type * as Monaco from 'monaco-editor'

export const darculaTheme: Monaco.editor.IStandaloneThemeData = {
    base: 'vs-dark',
    inherit: true,
    rules: [
        { token: '', foreground: 'A9B7C6' },
        { token: 'comment', foreground: '808080' },
        { token: 'keyword', foreground: 'CC7832' },
        { token: 'number', foreground: '6897BB' },
        { token: 'string', foreground: '6A8759' },
        { token: 'type', foreground: 'FFC66D' },
        { token: 'delimiter', foreground: 'A9B7C6' },
        { token: 'operator', foreground: 'A9B7C6' },
        { token: 'function', foreground: 'FFC66D' },
    ],
    colors: {
        'editor.background': '#2B2B2B',
        'editor.foreground': '#A9B7C6',
        'editor.lineHighlightBackground': '#323232',
        'editorLineNumber.foreground': '#606366',
        'editorCursor.foreground': '#BBBBBB',
        'editor.selectionBackground': '#214283',
        'editor.inactiveSelectionBackground': '#3A3D41',
        'editorIndentGuide.background': '#3B3F43',
        'editorIndentGuide.activeBackground': '#5A5F66',
        'editorWhitespace.foreground': '#3B3F43',
    },
}
