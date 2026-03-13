---
title: Configuration
---

Boss CSS reads configuration from two sources:

1. `package.json` under the `bo$$` key for shared defaults
2. `<configDir>/config.js` for the plugin stack and project-specific settings

`configDir` defaults to `.bo$$`. If `.bo$$/config.js` does not exist, Boss also checks `src/.bo$$/config.js`.

## Think in three layers

Most config questions map to one of these layers:

1. **Authoring inputs**: which parsers are enabled
2. **Output strategies**: which strategy plugin is selected
3. **Build modes**: PostCSS/build/watch, plus optional compile settings

Keeping those layers separate avoids most setup confusion.

## Quick reference

```js
// .bo$$/config.js
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

export default {
  configDir: '.bo$$',
  folder: '.bo$$',
  stylesheetPath: '.bo$$/styles.css',
  content: ['{src,pages,app,lib,components}/**/*.{html,js,jsx,ts,tsx,mdx,md}'],
  plugins: [fontsource, reset, token, at, child, css, pseudo, classname, jsx, inlineFirst],
  unit: 'px',
  selectorPrefix: 'boss-',
  selectorScope: '.scope ',
  debug: false,
  runtime: {
    only: false,
    strategy: 'inline-first',
  },
  jsx: {
    globals: true,
  },
  css: {
    autoLoad: true,
    boundaries: {
      criticality: 2,
      ignore: ['**/dist/**'],
    },
  },
  breakpoints: {
    mobile: [376, 639],
    tablet: [640, 1023],
  },
  devServer: {
    port: 5199,
    autoStart: true,
  },
  framework: {
    name: 'react',
    className: 'className',
  },
  tokens: {
    color: { brand: '#0f766e' },
  },
}
```

`folder` defaults to `configDir`, and `stylesheetPath` defaults to `<configDir>/styles.css`.

## `package.json` overrides

You can set shared defaults in `package.json`:

```json
{
  "bo$$": {
    "configDir": ".bo$$",
    "unit": "px",
    "selectorPrefix": "boss-",
    "selectorScope": ".scope "
  }
}
```

## Authoring inputs

Your enabled parsers control what Boss can read from source:

- `boss-css/parser/jsx/server` enables `$$` JSX props
- `boss-css/parser/classname/server` enables static `className` / `class` token parsing

Common combinations:

- `inline-first` / `classname-first`: usually keep both parsers enabled
- `classname-only`: keep the classname parser and drop the JSX parser
- `runtime.only`: className parsing is disabled at runtime, so rely on JSX authoring there

## Strategy selection

Include exactly one strategy plugin:

- `inline-first`
- `classname-first`
- `classname-only`
- `runtime`

Recommended mapping:

- `inline-first`: default JSX setup
- `classname-first`: JSX authoring with more class-based output
- `classname-only`: static class strings only, no generated runtime
- `runtime`: runtime-only or hybrid browser evaluation

Compile is not part of this list because compile is a build mode, not a strategy.

## Runtime configuration

This block only matters when the selected strategy plugin is `runtime`:

```js
runtime: {
  only: true,            // runtime-only (no server strategy CSS output)
  strategy: 'classic',   // inline-first | classname-first | classic
  globals: 'inline',     // inline | file | none
}
```

Notes:

- `runtime.only: true` disables server strategy CSS output and disables className parsing.
- `runtime.only: false` enables hybrid mode, so Boss still emits server CSS using the selected underlying strategy.
- `runtime.strategy` selects the underlying browser behavior.
- `runtime.globals` controls reset/fontsource/`$$.css` output in runtime-only:
  - `inline`: inject globals into a runtime style tag
  - `file`: emit `styles.css` and import it unless `css.autoLoad` is `false`
  - `none`: skip global CSS output
- `runtime.strategy: 'classic'` is runtime-only behavior. In hybrid mode, server output falls back to `inline-first`.

## JSX configuration

```js
jsx: {
  globals: true
}
```

- `jsx.globals`: expose `$$` on `globalThis` and in generated global types. Set `false` to require explicit imports.

## CSS output

```js
css: {
  autoLoad: true,
  boundaries: {
    criticality: 2,
    ignore: ['**/dist/**'],
  },
}
```

- `css.autoLoad`: when `true`, the generated runtime imports `./styles.css` automatically
- `css.boundaries`: configure `*.boss.css` boundary discovery and hoisting
- `node_modules` is always ignored for boundary discovery

See [CSS Boundaries](/docs/usage/css-boundaries).

## Build modes

Boss has two build-mode families:

- **PostCSS / `build` / `watch`**: generate CSS and, when needed, generated runtime files
- **`compile`**: optional source rewrite that follows your selected strategy

Compile settings live under `compile`, but compile currently supports only JSX with `inline-first` and `classname-first`.

## Framework detection

Boss auto-detects React/Preact/Solid/Qwik/Stencil based on `jsxImportSource` or `framework` config. You can override it:

```js
framework: {
  name: 'custom',
  className: 'class',
  jsx: {
    importSource: '@my/jsx',
    typesModule: '@my/jsx/types',
    typesNamespace: 'JSX',
  },
}
```

## Tokens

`tokens` can be an object or a function that receives the current token map:

```js
tokens: values => ({
  ...values.asObject(),
  color: { brand: '#0f766e' },
})
```

See [Tokens](/docs/usage/tokens).

## Debugging

Set `debug: true` or `debug: 'boss:*'` to enable logs. You can also use `BOSS_DEBUG`.

## Other config fields

- `fonts`: used by the Fontsource plugin
- `bosswind`: Bosswind plugin options
- `compile`: optional compile build-mode settings
- `nativeStyleProps`: extra React Native style props to treat as style values
- `ai`: AI plugin settings
