---
title: Stencil
---

Boss CSS ships with a Stencil sample in `test/sample/stencil-base/`.
Stencil does not use PostCSS, so you run the CLI watch/build flow instead.

## 1) Run the watcher

```bash
npx boss-css watch
```

This keeps `.bo$$/styles.css` up to date as you edit files.

## 2) Wire global styles and runtime

```ts
// stencil.config.ts
export const config: Config = {
  globalScript: 'src/global/app.ts',
  globalStyle: 'src/.bo$$/styles.css',
}
```

```ts
// src/global/app.ts
import '../.bo$$'
```

## 3) Notes

- Set `css.autoLoad: false` in `.bo$$/config.js` so Stencil owns the stylesheet import.
- When the devtools plugin is enabled, `npx boss-css watch` auto-starts the dev server unless `devServer.autoStart` is `false`.
