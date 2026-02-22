---
title: Runtime Strategy
---

The `runtime` strategy is a wrapper that can run Boss CSS fully in the browser or in hybrid mode. You configure `runtime` once, and it selects the underlying behavior (`inline-first`, `classname-first`, or `classic`) at runtime.

## When to use

- Runtime-only: skip server CSS output and inject rules on the client.
- Hybrid: keep server CSS output and still run the runtime handler for dynamic values.

## Configuration

```js
import * as fontsource from 'boss-css/fontsource/server'
import * as reset from 'boss-css/reset/server'
import * as at from 'boss-css/prop/at/server'
import * as child from 'boss-css/prop/child/server'
import * as css from 'boss-css/prop/css/server'
import * as pseudo from 'boss-css/prop/pseudo/server'
import * as jsx from 'boss-css/parser/jsx/server'
import * as classname from 'boss-css/parser/classname/server'
import * as runtime from 'boss-css/strategy/runtime/server'
import * as token from 'boss-css/use/token/server'

export default {
  plugins: [fontsource, reset, token, at, child, css, pseudo, classname, jsx, runtime],
  runtime: {
    only: true,
    strategy: 'inline-first', // or 'classname-first' | 'classic'
    globals: 'inline',        // inline | file | none
  },
}
```

Notes:

- Use only the `runtime` strategy plugin; do not include `inline-first` or `classname-first` directly.
- `runtime.only: true` disables server CSS output and skips the `.bo$$/styles.css` import (unless `runtime.globals: 'file'`).
- `runtime.only: false` enables hybrid mode (server CSS + runtime handling).
- `runtime.strategy` selects the underlying semantics at runtime.
- `runtime.globals` controls reset/fontsource/$$.css output in runtime-only:
  - `inline` injects globals into a runtime style tag (default).
  - `file` emits `styles.css` even in runtime-only.
  - `none` skips all global CSS output.
- In runtime-only, tokens resolve to CSS variables and the runtime injects token vars on first use (even if `runtime.globals` is `none`).
- In runtime-only mode, the **className parser is disabled** (className strings are not converted into CSS).

## What happens at runtime

- The runtime wrapper initializes the client CSS injector (`RuntimeCSS`) on `onInit`.
- The runtime wrapper dispatches to `inline-first`, `classname-first`, or `classic` runtime-only handlers.
- Runtime-only selector helpers for `at`, `pseudo`, and `child` are wired automatically when `runtime` config is enabled.

## Classic runtime behavior

`classic` computes a stable hash of the full prop tree at runtime, assigns a className, and injects the full rule set (including nested contexts).
It is runtime-only behavior; server output falls back to inline-first when `runtime.only` is `false`.

## Hybrid mode behavior

In hybrid mode, server CSS is still emitted by the selected strategy, and the runtime still processes props at render time. This keeps server output intact while allowing runtime-only features and dynamic values.
