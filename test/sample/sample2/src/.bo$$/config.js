/* eslint-disable */
import * as token from 'boss-css/use/token/server'
import * as at from 'boss-css/prop/at/server'
import * as child from 'boss-css/prop/child/server'
import * as css from 'boss-css/prop/css/server'
import * as pseudo from 'boss-css/prop/pseudo/server'
import * as classname from 'boss-css/parser/classname/server'
import * as jsx from 'boss-css/parser/jsx/server'
import * as inlineFirst from 'boss-css/strategy/inline-first/server'
import * as devtools from 'boss-css/dev/plugin/server'

// globalThis.$$
jsx.settings.set('globals', true)

export default {
    // Path from your project root
    folder: "./src/.bo$$",
    // Order matters
    plugins: [
        token,
        at,
        child,
        css,
        pseudo,
        classname,
        jsx,
        inlineFirst,
        devtools,
    ],
    // Files to look for when parsing
    content: [
        "{src,pages,app,lib,components}/**/*.{html,js,jsx,mjs,cjs,ts,tsx,mdx,md}",
    ],
}
