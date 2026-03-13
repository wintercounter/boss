---
title: Generated Runtime
---

Boss CSS can generate runtime files inside `.bo$$/`. These files are outputs, not source.

## When the generated runtime exists

Boss generates `.bo$$/index.js` and `.bo$$/index.d.ts` when you use these strategies:

- `inline-first`
- `classname-first`
- `runtime`

Boss does **not** generate those files for `classname-only`.

## Files

- `.bo$$/index.js`: browser entry that wires the generated runtime and exports `$$`
- `.bo$$/index.d.ts`: types for `$$`, prepared components, and token helpers
- `.bo$$/styles.css`: generated CSS for build/watch/PostCSS flows, or globals-only CSS in `runtime.only` when `runtime.globals: 'file'`

`generated runtime` means `.bo$$/index.js` and `.bo$$/index.d.ts`. It does not mean the `runtime` strategy plugin.

## Standard generated runtime output

With `inline-first` or `classname-first`, the generated runtime imports the browser handlers directly:

```js
import './styles.css'
import { createApi } from 'boss-css/api/browser'
import { proxy } from 'boss-css/runtime'
import { onBrowserObjectStart as onToken } from 'boss-css/use/token/browser'
import { onBrowserObjectStart as onJsx } from 'boss-css/parser/jsx/browser'
import { onBrowserObjectStart as onStrategy } from 'boss-css/strategy/inline-first/browser'

createApi({
  plugins: [
    { onBrowserObjectStart: onToken },
    { onBrowserObjectStart: onJsx },
    { onBrowserObjectStart: onStrategy },
  ],
})

globalThis.$$ = proxy
export const $$ = proxy
```

The strategy import is `inline-first` or `classname-first` based on config.

## Runtime strategy output

When you select the `runtime` strategy, the generated runtime wires a wrapper. That wrapper decides which runtime-only handler to use in the browser:

```js
import { createApi } from 'boss-css/api/browser'
import { proxy } from 'boss-css/runtime'
import { onBrowserObjectStart as onToken } from 'boss-css/use/token/browser'
import { onBrowserObjectStart as onJsx } from 'boss-css/parser/jsx/browser'
import { onInit, onBrowserObjectStart as onRuntime } from 'boss-css/strategy/runtime/runtime-only'

createApi({
  selectorPrefix: 'boss-',
  selectorScope: '.scope ',
  strategy: 'inline-first',
  runtime: { only: true, strategy: 'inline-first' },
  plugins: [
    { onBrowserObjectStart: onToken },
    { onBrowserObjectStart: onJsx },
    { onInit, onBrowserObjectStart: onRuntime },
  ],
})

globalThis.$$ = proxy
export const $$ = proxy
```

That is the difference between:

- the **generated runtime files** in `.bo$$/`
- the **runtime strategy wrapper** in `boss-css/strategy/runtime/*`

## CSS import behavior

- `css.autoLoad: true` makes the generated runtime import `./styles.css` when that file should exist
- `runtime.only: true` skips strategy CSS output
- `runtime.globals: 'file'` still emits `styles.css` for globals and keeps the import
- `runtime.globals: 'inline'` or `'none'` means `.bo$$/index.js` does not import `./styles.css`

## Do not edit

Anything inside `.bo$$/` is regenerated. Change config or source generators instead of editing those files directly.
