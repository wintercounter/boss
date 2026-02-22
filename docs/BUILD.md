# Build and Watch (No PostCSS)

`npx boss-css build` and `npx boss-css watch` generate Boss output without relying on PostCSS.

## Commands

```sh
npx boss-css build
npx boss-css watch
```

## What build does

- Reads `content` globs from `.bo$$/config.js` (or `bo$$` in `package.json`).
- Parses files through the configured Boss plugins.
- Writes runtime output (`index.js`, `index.d.ts`) to `folder` (defaults to `configDir`), unless the `classname-only` strategy is selected.
- Writes CSS to `stylesheetPath` when runtime-only is not enabled.

## What watch does

- Runs `npx boss-css build` once, then rebuilds on file changes.
- Uses `@parcel/watcher` for fast filesystem events.
- Ignores common output folders (`node_modules`, `.git`, `dist`) and the Boss output directory to avoid loops.

## Notes

- `content` is required; add it to `.bo$$/config.js` if missing.
- Runtime-only mode (`runtime.only = true`) skips CSS output.
- Classname-only mode skips runtime file output entirely.
- Generated CSS emits base rules before at-rules; `@media` queries are sorted by width (max-width desc, min-width asc).
