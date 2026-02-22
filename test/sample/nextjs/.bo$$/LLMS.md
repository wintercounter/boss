# Boss CSS AI


<!-- boss:ai:static:start -->
## Boss CSS usage

### Syntax
- Use <$ ...> for Boss props in JSX.
- Use $.$({ ... }) to mark prop objects for compile/runtime.
- Classname tokens look like color:red or hover:color:red (mostly 1:1 with CSS props).

### Tokens
- Prefer token keys (color="primary") over $.token.* when available.
- Token overrides can be passed via the tokens prop at runtime.
- Prefer token shorthands for shadows (boxShadow="md") when available.
- In classname-first, dynamic tokens should return $.token.* from the function.

### Selectors
- Use pseudos for state (hover, focus, etc.).
- Use @at for breakpoints and media queries.
- Use child for nested selectors.
- Prefer shorthand keys (mobile:...) over at:mobile:...
- Prefer the device breakpoint for mobile + small screens when available.

### Values
- Prefer unitless numbers (padding:12) and use _ for space-separated values (padding:10_20).
- Avoid hardcoded default unit suffixes in class tokens (border:1_solid, not border:1px_solid).
- Prefer arrays for shorthands (padding={[0, 10]}).
- For custom shadows, use arrays (boxShadow={[1, 1, 0, '#fff']}).

### Globals
- Use $.css() for global CSS and arbitrary selectors (body, [data-*], etc.).

### Bosswind
- When Bosswind is enabled, prefer shorthands (flex vs display:flex).

### Strategies
- inline-first: default for mixed static/dynamic props.
- classname-first: smaller inline styles; use function values for dynamics.
- runtime-only: client CSS injection only.
 - compile pruning: keep props static when you want runtime-free output.
 - runtime.globals: inline | file | none (reset/fontsource/token/$.css output).
<!-- boss:ai:static:end -->

<!-- boss:ai:summary:start -->
## Summary

- Generated: 2026-02-22T05:24:32.464Z
- Base dir: /Users/winter/PhpstormProjects/boss/test/sample/nextjs
- Config path: /Users/winter/PhpstormProjects/boss/test/sample/nextjs/.bo$/config.js
- LLMS path: /Users/winter/PhpstormProjects/boss/test/sample/nextjs/.bo$/LLMS.md
- Runtime strategy: inline-first
- Plugins: fontsource, reset, token, at, child, css, pseudo, classname, jsx, inline-first, ai
<!-- boss:ai:summary:end -->

<!-- boss:ai:config:start -->
## Config

- content: {src,pages,app,lib,components}/**/*.{html,js,jsx,mjs,cjs,ts,tsx,mdx,md}
- selectorPrefix: (none)
- selectorScope: (none)
- unit: px
- runtime.only: false
- runtime.strategy: (default)
<!-- boss:ai:config:end -->

<!-- boss:ai:plugins:start -->
## Plugins

- fontsource (onBoot)
- reset (onBoot)
- token (onBoot, onReady, onParse, onPropTree)
- at (onBoot, onReady, onProp)
- child (onBoot, onProp)
- css (onBoot, onProp)
- pseudo (onBoot, onProp)
- classname (onParse)
- jsx (onBoot, onParse)
- inline-first (onBoot, onPropTree)
- ai (onBoot, onSession, onMetaData)
<!-- boss:ai:plugins:end -->

<!-- boss:ai:outputs:start -->
## Outputs

- runtime: .bo$/index.js
- types: .bo$/index.d.ts
- styles: /Users/winter/PhpstormProjects/boss/test/sample/nextjs/.bo$/styles.css
<!-- boss:ai:outputs:end -->

<!-- boss:ai:framework:start -->
## Framework

- framework: react
- className: className
- fileType: jsx
<!-- boss:ai:framework:end -->

<!-- boss:ai:props:start -->
## Custom props

- (none)
<!-- boss:ai:props:end -->

<!-- boss:ai:compile:start -->
## Compile

- compile.enabled: true
<!-- boss:ai:compile:end -->

<!-- boss:ai:tokens:start -->
## Tokens

### Token groups
- color: black, white

### Token prop groups
- gradient: background-image, linear-gradient, radial-gradient, conic-gradient
- shadow: box-shadow, text-shadow
- color: color, background, background-color, border-color, accent-color, caret-color, fill, outline-color, stroke, text-decoration-color, text-shadow, box-shadow, background-image, linear-gradient, radial-gradient, conic-gradient, filter
- border: border, border-top, border-right, border-bottom, border-left, outline, outline-offset
- transition: transition
- size: width, height, min-width, min-height, max-width, max-height, inset, top, right, bottom, left, translate, flex-basis, gap, column-gap, row-gap, margin, margin-top, margin-right, margin-bottom, margin-left, padding, padding-top, padding-right, padding-bottom, padding-left, border-spacing, scroll-margin, scroll-margin-top, scroll-margin-right, scroll-margin-bottom, scroll-margin-left, scroll-padding, scroll-padding-top, scroll-padding-right, scroll-padding-bottom, scroll-padding-left, text-indent
- grid: grid-column, grid-row, grid-template-columns, grid-template-rows, grid-auto-columns, grid-auto-rows
- duration: transition-duration, transition-delay, animation-duration, animation-delay
- backgroundPosition: background-position, object-position, transform-origin
- typography: font
- font: font-family
<!-- boss:ai:tokens:end -->

<!-- boss:ai:pseudos:start -->
## Pseudos

- defined
- any-link
- link
- visited
- local-link
- target
- target-within
- scope
- hover
- active
- focus
- focus-visible
- focus-within
- current
- past
- future
- playing
- paused
- seeking
- buffering
- stalled
- muted
- volume-locked
- open
- closed
- modal
- fullscreen
- picture-in-picture
- enabled
- disabled
- read-write
- read-only
- placeholder-shown
- autofill
- default
- checked
- indeterminate
- blank
- valid
- invalid
- in-range
- out-of-range
- user-valid
- root
- empty
- first-child
- last-child
- only-child
- first-of-type
- last-of-type
- only-of-type
- after
- before
<!-- boss:ai:pseudos:end -->

<!-- boss:ai:at:start -->
## At (breakpoints and media)

### Breakpoints
- micro: 0-375
- mobile: 376-639
- tablet: 640-1023
- small: 1024-1439
- medium: 1440-1919
- large: 1920-100000
- device: 0-1023

### Base values
- dark: @media screen and (prefers-color-scheme: dark)
- light: @media screen and (prefers-color-scheme: light)
- hdpi: @media and screen (min-resolution: 192dpi)
- micro: @media screen and (min-width: 0px) and (max-width: 375px)
- mobile: @media screen and (min-width: 376px) and (max-width: 639px)
- tablet: @media screen and (min-width: 640px) and (max-width: 1023px)
- small: @media screen and (min-width: 1024px) and (max-width: 1439px)
- medium: @media screen and (min-width: 1440px) and (max-width: 1919px)
- large: @media screen and (min-width: 1920px) and (max-width: 100000px)
- device: @media screen and (min-width: 0px) and (max-width: 1023px)
- micro+: @media screen and (min-width: 0px)
- micro-: @media screen and (max-width: 375px)
- mobile+: @media screen and (min-width: 376px)
- mobile-: @media screen and (max-width: 639px)
- tablet+: @media screen and (min-width: 640px)
- tablet-: @media screen and (max-width: 1023px)
- small+: @media screen and (min-width: 1024px)
- small-: @media screen and (max-width: 1439px)
- medium+: @media screen and (min-width: 1440px)
- medium-: @media screen and (max-width: 1919px)
- large+: @media screen and (min-width: 1920px)
- large-: @media screen and (max-width: 100000px)
- device+: @media screen and (min-width: 0px)
- device-: @media screen and (max-width: 1023px)
<!-- boss:ai:at:end -->

<!-- boss:ai:prepared:start -->
## Prepared components

- Prepared (as: div, file: app/layout.tsx)
- PreparedUppercaseA (as: a, file: app/layout.tsx)
<!-- boss:ai:prepared:end -->

<!-- boss:ai:boundaries:start -->
## CSS boundaries

- (none)
<!-- boss:ai:boundaries:end -->