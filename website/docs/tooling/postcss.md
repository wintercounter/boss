---
title: PostCSS Plugin
---

Boss CSS ships as a PostCSS plugin that drives parsing and CSS generation.
Stencil note: Stencil projects should skip PostCSS and use `npx boss-css watch` instead.
If you need to call the PostCSS pipeline programmatically, see [Runners](/docs/api/runners).

## Usage

```js
// postcss.config.js
module.exports = {
  plugins: {
    'boss-css/postcss': {},
    autoprefixer: {},
  },
}
```

If your project uses `"type": "module"`, use an ESM config instead:

```js
// postcss.config.js
export default {
  plugins: {
    'boss-css/postcss': {},
    autoprefixer: {},
  },
}
```

## Options

Use options when you want to override auto defaults:

```js
// postcss.config.js
module.exports = {
  plugins: {
    'boss-css/postcss': { dirDependencies: false },
    autoprefixer: {},
  },
}
```

- `dirDependencies`: emits PostCSS `dir-dependency` messages so tooling can watch for new files. Defaults to `true` unless a Turbopack env flag is set (`TURBOPACK` or `__NEXT_TURBOPACK`), in which case it disables directory dependencies to avoid Turbopack errors. Set `true` or `false` to override.

## Entry stylesheet

The plugin runs when it processes the configured stylesheet path (default: `.bo$$/styles.css`) and any `*.boss.css` boundary files.

```css
/* .bo$$/styles.css */
```

Make sure this file is included in your build pipeline (or imported by your app). Boundary files should be imported explicitly where you want their scoped styles to load and are overwritten on each build.

## What happens on build

- The plugin expands `content` globs from `.bo$$/config.js`.
- Each file is parsed for className syntax, plus JSX (`$$`) when the JSX parser is enabled.
- CSS rules are emitted to `.bo$$/styles.css` and any `*.boss.css` boundaries.
- The generated runtime in `.bo$$/index.js` is updated (unless `classname-only` is selected), and PostCSS waits for that write to finish before completing the run.
- See [CSS Boundaries](/docs/usage/css-boundaries) for how boundary files are discovered and hoisted.

## Troubleshooting

- If CSS is not generating, confirm that `.bo$$/styles.css` is part of your build.
- Check that `content` globs include the files you want to parse.
- If a file cannot be parsed, Boss emits a PostCSS warning with the file path (for example: `[boss-css] Failed parsing src/app.tsx: ...`). Fix the parse error and rerun.
