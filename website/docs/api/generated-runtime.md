---
title: Generated Runtime
---

Boss CSS generates runtime files inside `.bo$$/`. These are outputs, not source.

## Files

- `.bo$$/styles.css` contains compiled CSS rules.
- `.bo$$/index.js` wires the browser runtime and exports `$$`.
- `.bo$$/index.d.ts` provides types for `$$` and token autocompletion.

## Typical runtime output (inline-first / classname-first)

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

The strategy import is either `inline-first` or `classname-first` depending on your config.

## Runtime strategy output

When using the `runtime` strategy, the generated runtime wires a wrapper that selects the correct runtime-only handler at startup:

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

Notes:

- In runtime-only mode (`runtime.only: true`), `.bo$$/index.js` does not import `./styles.css` unless `runtime.globals: 'file'`.
- The runtime wrapper initializes the client CSS injector and then dispatches to `inline-first`, `classname-first`, or `classic` based on `runtime.strategy`.
- `css.autoLoad` controls whether `.bo$$/index.js` imports `./styles.css` (default: `true`). Set it to `false` when you want to manage CSS yourself.

## Do not edit

Any changes to `.bo$$/` are overwritten on build. If you need to change output, update the source generators in `src/`.
