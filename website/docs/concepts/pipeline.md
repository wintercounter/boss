---
title: Plugin Pipeline
---

Boss CSS is built around a plugin pipeline. Each plugin contributes to parsing, prop handling, or runtime generation.

## Pipeline flow

```
config -> createApi -> onBoot -> onReady
      -> onParse -> onPropTree -> onProp
      -> file generation (.bo$$/)
```

## Hook overview

- `onBoot`: initialize dictionaries, types, and runtime wiring.
- `onReady`: post-process types and dictionaries.
- `onParse`: parse source code into a prop tree (JSX and className).
- `onPropTree`: strategy-level filtering and variable decisions.
- `onProp`: emit CSS rules for each prop.
- `onCompileProp`: compile-only hook to rewrite non‑CSS props into DOM attrs.
- `onBrowserObjectStart`: runtime handler to translate props to DOM output.

## Default plugin stack

```js
plugins: [fontsource, reset, token, at, child, css, pseudo, classname, jsx, inlineFirst]
```

Each plugin is free to add entries to `api.dictionary`, write to `api.css`, and emit runtime code via `api.file.js`.

Only one strategy should be included (`inlineFirst`, `classnameFirst`, `classnameOnly`, or `runtime`).

When using `runtime`, the strategy wrapper reads `runtime.strategy` to decide which behavior to run in the browser, and `runtime.only` to determine whether server CSS should be emitted (hybrid) or skipped (runtime-only).

## Why it matters

The pipeline makes Boss CSS future-proof. Adding new syntax or strategies is a matter of adding or swapping plugins, not rewriting core.
