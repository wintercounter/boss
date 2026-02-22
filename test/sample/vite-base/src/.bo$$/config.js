/* eslint-disable */
// @ts-check
import * as fontsource from 'boss-css/fontsource/server'
import * as reset from 'boss-css/reset/server'
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

/** @type {import('boss-css/api/config').UserConfig} */
export default {
    // Path from your project root
    folder: './src/.bo$$',
    // Order matters
    plugins: [fontsource, reset, token, at, child, css, pseudo, classname, jsx, inlineFirst],
    // Files to look for when parsing
    content: ['src/**/*.{html,js,jsx,mjs,cjs,ts,tsx,mdx,md,astro,svelte}'],
    fonts: [{ name: 'Inter', token: 'inter' }],
}
