---
title: Compatibility
---

Boss CSS works anywhere you can run a Node build step or PostCSS pipeline, but support differs by framework, strategy, and build mode.

## Framework support

The generated runtime supports these JSX-oriented frameworks out of the box:

- React
- Next.js
- Preact
- Solid
- Qwik
- Stencil
- React Native has its own documented flow

Framework detection is automatic, but you can override it in config.

## Strategy support

- **`inline-first` / `classname-first`**: JSX-oriented strategies that generate `.bo$$/index.js`, `.bo$$/index.d.ts`, and CSS.
- **`runtime`**: JSX-oriented runtime strategy wrapper for runtime-only or hybrid browser evaluation.
- **`classname-only`**: static class string strategy for any stack that can emit static `className` or `class` values.

Important constraints:

- `runtime.only` disables className parsing.
- `classname-only` skips generated runtime files.
- `classname-only` is the static className lane, not a catch-all label for every setup that skips generated runtime files.

## Build tool support

- PostCSS is the default for most web apps.
- `npx boss-css build` / `watch` works when you want Boss to manage CSS outside PostCSS.
- Any environment that can run a Node-based build step can use those flows.

## Compile support

`npx boss-css compile` is an optional build mode, not a strategy.

Current scope:

- JSX only
- `inline-first` and `classname-first` only
- temp mode rewrites source into `compile.tempOutDir` and mirrors generated CSS there when CSS exists
- prod mode mutates source in place and does not write CSS files
