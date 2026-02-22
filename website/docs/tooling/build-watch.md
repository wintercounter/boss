---
title: Build and Watch
---

Boss CSS ships `npx boss-css build` and `npx boss-css watch` for projects that are not using PostCSS. Stencil projects should use this flow.

## Build

```bash
npx boss-css build
```

`npx boss-css build`:
- Reads `content` globs from `.bo$$/config.js` (or `bo$$` in `package.json`).
- Parses files with your configured plugins.
- Writes runtime output to `folder` (defaults to `configDir`), unless `classname-only` is selected.
- Writes CSS to `stylesheetPath` and any `*.boss.css` boundary files unless `runtime.only = true`.
  - See [CSS Boundaries](/docs/usage/css-boundaries) for directory scoping and hoisting details.

## Watch

```bash
npx boss-css watch
```

`npx boss-css watch` runs `npx boss-css build` once and rebuilds on file changes.

- Uses `@parcel/watcher` for fast file events.
- Ignores common output folders (`node_modules`, `.git`, `dist`) and the Boss output directory to avoid loops.
- Boundary files are treated as outputs and are ignored after each build so they do not trigger rebuild loops.

## Requirements

- `content` must be configured in `.bo$$/config.js` (or `bo$$` in `package.json`).
