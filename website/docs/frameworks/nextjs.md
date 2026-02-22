---
title: Next.js
---

Boss CSS ships with a sample Next.js app in `test/sample/nextjs/`.
This page mirrors that integration.

## 1) PostCSS

```js
// postcss.config.js
module.exports = {
  plugins: {
    'boss-css/postcss': {},
    autoprefixer: {},
  },
}
```

Boss auto-disables directory dependencies when a Turbopack env flag is set (`TURBOPACK` or `__NEXT_TURBOPACK`). To override:

```js
// postcss.config.js
module.exports = {
  plugins: {
    'boss-css/postcss': { dirDependencies: false },
    autoprefixer: {},
  },
}
```

## 2) Instrumentation hooks (required)

Next.js uses instrumentation hooks for Boss runtime setup. Add them in your project root (or `src/`):

```tsx
// instrumentation.ts
import './.bo$$'
```

```tsx
// instrumentation-client.ts
import './.bo$$'
```

## 3) Import CSS manually

Boss does not auto-import CSS in Next.js. `npx boss-css init` sets `css.autoLoad: false`, so import the generated stylesheet in your root layout (path is relative to `app/layout.*`; default is usually `../.bo$$/styles.css`):

```tsx
// app/layout.tsx
import '../.bo$$/styles.css'
```

## 4) Notes

- If you use classname-only, skip instrumentation hooks and only load `.bo$$/styles.css`.
