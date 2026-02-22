/* eslint-disable */
import * as token from 'boss-css/use/token/server'
import * as at from 'boss-css/prop/at/server'
import * as child from 'boss-css/prop/child/server'
import * as css from 'boss-css/prop/css/server'
import * as pseudo from 'boss-css/prop/pseudo/server'
import * as classname from 'boss-css/parser/classname/server'
import * as jsx from 'boss-css/parser/jsx/server'
import * as inlineFirst from 'boss-css/strategy/inline-first/server'

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
    ],
    // Files to look for when parsing
    content: [
        "src/**/*.{html,js,jsx,mjs,cjs,ts,tsx,mdx,md}",
    ],
    tokens: {
        color: {
            primary: '#ed4b9b',
            'primary-70': 'rgba(237,75,155,0.7)',
            'primary-60': 'rgba(237,75,155,0.6)',
            'primary-32': 'rgba(237,75,155,0.32)',
            'primary-25': 'rgba(237,75,155,0.25)',
            'primary-20': 'rgba(237,75,155,0.2)',
            'primary-18': 'rgba(237,75,155,0.18)',
            'primary-soft': '#ffe6f2',
            'primary-soft-2': '#ffe8f4',
            'primary-gradient': 'linear-gradient(90deg,#ed4b9b,#ff8fc2)',
            'primary-gradient-vertical': 'linear-gradient(180deg,rgba(237,75,155,0.32),rgba(237,75,155,0.18))',
            'primary-ring': '0 0 0 3px rgba(237,75,155,0.25)',
        },
    },
}
