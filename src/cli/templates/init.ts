export const configTemplate = `/* eslint-disable */
// @ts-check
// @@@ each plugin of $.plugins
// @@@ if $.plugin.enabled
import * as /* @@@ echo $.plugin.importName */token/* @@@ endecho */ from '/* @@@ echo $.plugin.importPath */boss-css/use/token/server/* @@@ endecho */'
// @@@ endif
// @@@ endeach

/** @type {import('boss-css/api/config').UserConfig} */
export default {
    // Path from your project root
    folder: /* @@@ echo JSON.stringify($.folder) */'./.bo$$'/* @@@ endecho */,
// @@@ if $.jsxEnabled
    jsx: {
        globals: /* @@@ echo $.globalsEnabled ? 'true' : 'false' */true/* @@@ endecho */,
    },
// @@@ endif
// @@@ if $.cssAutoLoad === false
    css: {
        autoLoad: false,
    },
// @@@ endif
// @@@ if $.runtimeEnabled
    // Runtime-only/hybrid configuration
    runtime: {
        only: /* @@@ echo $.runtimeOnly ? 'true' : 'false' */true/* @@@ endecho */,
        strategy: /* @@@ echo JSON.stringify($.runtimeStrategy) */'inline-first'/* @@@ endecho */,
    },
// @@@ endif
    // Order matters
    plugins: [
// @@@ each plugin of $.plugins
// @@@ if $.plugin.enabled
        /* @@@ echo $.plugin.importName */token/* @@@ endecho */,
// @@@ endif
// @@@ endeach
    ],
    // Files to look for when parsing
    content: [
// @@@ each glob of $.content
        /* @@@ echo JSON.stringify($.glob) */"src/**/*"/* @@@ endecho */,
// @@@ endeach
    ],
}
`

export const packageTemplate = `{
    "type": "module",
    "sideEffects": true
}
`

export const jsconfigTemplate = `{
    "compilerOptions": {
        "checkJs": true
    },
    "include": [
        "./config.js"
    ]
}
`

export const postcssTemplate = `export default {
    plugins: {
        // bo$$:begin
// @@@ if $.useOptions
        'boss-css/postcss': { dirDependencies: /* @@@ echo $.dirDependencies ? 'true' : 'false' */false/* @@@ endecho */ },
// @@@ else
        'boss-css/postcss': {},
// @@@ endif
        // bo$$:end
// @@@ if $.includeAutoprefixer
        'autoprefixer': {},
// @@@ endif
    },
}
`
