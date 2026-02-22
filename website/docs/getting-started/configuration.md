---
title: Configuration
---

Boss CSS reads configuration from two sources:

1. `package.json` under the `bo$$` key (shared defaults).
2. `<configDir>/config.js` (plugin stack + content).

`configDir` defaults to `.bo$$`. If `.bo$$/config.js` does not exist, Boss also checks `src/.bo$$/config.js`.

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

`folder` defaults to `configDir`, and `stylesheetPath` defaults to `<configDir>/styles.css` if you omit them.

## `package.json` overrides

You can set shared defaults in `package.json` under the `bo$$` key:

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

## Strategy selection

Only one strategy plugin should be included:

- `inline-first` (smallest CSS output)
- `classname-first` (static values become classnames)
- `classname-only` (no JSX, no runtime)
- `runtime` (runtime-only or hybrid)

Inline-first is the default and recommended starting strategy.

For `classname-only`, drop the JSX parser and use `boss-css/strategy/classname-only/server`. See
[Classname-only Strategy](/docs/concepts/classname-only) for details.

## Runtime configuration

```js
runtime: {
  only: true,            // runtime-only (no server CSS output)
  strategy: 'classic',   // inline-first | classname-first | classic
  globals: 'inline',     // inline | file | none
}
```

Notes:

- `runtime.only: true` disables server CSS output and the className parser.
- `runtime.globals` controls reset/fontsource/$$.css output in runtime-only (tokens are injected at runtime on use):
    - `inline` (default): inject globals into a `<style data-boss-globals>` tag at runtime.
    - `file`: emit `styles.css` even in runtime-only and auto-import it (unless `css.autoLoad` is false).
    - `none`: skip all global CSS output.
- `runtime.strategy: 'classic'` is runtime-only behavior; server output falls back to inline-first.

See [Runtime Strategy](/docs/concepts/runtime-strategy) for details.

## JSX parser configuration

```js
jsx: {
    globals: true
}
```

- `jsx.globals`: expose `$$` on `globalThis` and in generated global types. Set `false` to require explicit imports (for
  example `import $$ from './.bo$$'`).

## CSS configuration

```js
css: {
  autoLoad: true,
  boundaries: {
    criticality: 2,
    ignore: ['**/dist/**'],
  },
}
```

- `css.autoLoad`: when `true`, the runtime imports `./styles.css` automatically (disabled in `runtime.only` unless
  `runtime.globals: 'file'`).
- `css.boundaries`: configure `*.boss.css` boundary discovery and hoisting.
- `node_modules` is always ignored for boundary discovery; use `ignore` for extra globs.

See [CSS Boundaries](/docs/usage/css-boundaries) for usage.

## Framework detection

Boss auto-detects React/Preact/Solid/Qwik/Stencil based on `jsxImportSource` or `framework` config. You can override:

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

`devServer` is only used when the devtools plugin is installed.

## Tokens

`tokens` can be an object **or** a function that receives the current token map:

```js
tokens: values => ({
    ...values.asObject(),
    color: { brand: '#0f766e' },
})
```

See [Tokens](/docs/usage/tokens) for usage and theming patterns.

## Debugging

Set `debug: true` or `debug: 'boss:*'` to enable logs. You can also use `BOSS_DEBUG`. See
[Debugging and Logs](/docs/tooling/debugging).

## Other config fields

- `fonts`: used by the Fontsource plugin (see [Fonts](/docs/usage/fonts)).
- `bosswind`: Bosswind plugin options (see [Bosswind](/docs/usage/bosswind)).
- `compile`: compile-time options (see [Compile](/docs/tooling/compile)).
- `nativeStyleProps`: extra React Native style props to treat as style values.
- `ai`: AI plugin settings (see [AI Plugin](/docs/tooling/ai)).
