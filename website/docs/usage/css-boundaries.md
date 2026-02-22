---
title: CSS Boundaries
---

Boss CSS can split generated CSS by directory using `*.boss.css` boundary files. This lets you load styles only where
they’re used while still hoisting shared rules to common ancestors or global `styles.css`.

## What is a boundary?

A boundary is a user‑created `*.boss.css` file placed anywhere in your source tree. Boss CSS overwrites these files with
generated output. You import the boundary file where you want its styles to load.

Example layout:

```
src/
  app/
    app.boss.css
    page.tsx
    admin/
      admin.boss.css
      page.tsx
  marketing/
    marketing.boss.css
    page.tsx
.bo$$/styles.css
```

In this setup:

- `src/app/app.boss.css` receives styles used in `src/app/**` (unless hoisted).
- `src/app/admin/admin.boss.css` receives styles used in `src/app/admin/**` (unless hoisted).
- `src/marketing/marketing.boss.css` receives styles used in `src/marketing/**`.
- `.bo$$/styles.css` is the global fallback (also used for hoisted rules).

## How boundaries are resolved

Boss CSS uses filesystem paths (not the import graph):

- Each parsed source file is mapped to the nearest boundary in the same directory or an ancestor.
- If no boundary exists above it, the rule lands in `.bo$$/styles.css`.
- If multiple boundaries exist in the same directory, the first one (alphabetically) wins and a warning is logged.

## Hoisting (criticality)

When the same rule appears in more than one boundary, Boss CSS hoists it upward:

- By default, when a rule appears in **2** boundaries, it moves to their **nearest common ancestor** boundary.
- If no ancestor boundary exists, it lands in `.bo$$/styles.css`.

You can tune the threshold:

```js
export default {
    css: {
        boundaries: {
            criticality: 3,
        },
    },
}
```

## Rule identity (what counts as “the same rule”)

Rules are matched by normalized selector + declarations, including `@media` and `@keyframes` wrappers. Whitespace and
trailing semicolons do not affect matching.

Examples treated as the same rule:

```css
.btn {
    color: red;
}
.btn {
    color: red;
}
```

## Root declarations and custom CSS

- `:root` variables (tokens) are tracked per source and follow the same hoisting rules.
- `$$.css` custom blocks are also attributed and hoisted by boundary usage.
- `@import` rules always stay in the global stylesheet (`.bo$$/styles.css`).

## Config options

```js
export default {
    css: {
        boundaries: {
            criticality: 2,
            ignore: ['**/dist/**'],
        },
    },
}
```

- `criticality`: number of boundaries a rule must appear in before it is hoisted.
- `ignore`: extra glob patterns to exclude from boundary discovery.
- `node_modules` is always ignored.

## Build / PostCSS / Watch behavior

- **PostCSS**: the plugin processes `.bo$$/styles.css` and any `*.boss.css` files, and overwrites them each run.
- **npx boss-css build / watch**: writes `.bo$$/styles.css` and all boundary files; watch ignores boundary outputs to
  avoid rebuild loops.
- **npx boss-css compile**: does not write CSS files (it only rewrites source output). Boundary files are unchanged in
  compile mode.

## Practical usage

1. Create empty boundary files:

```bash
touch src/app/app.boss.css
```

2. Import them where needed:

```tsx
// src/app/layout.tsx (or equivalent)
import './app.boss.css'
```

3. Keep them empty. Boss CSS overwrites them on build/postcss runs.

## Notes and caveats

- Boundary discovery happens every run, so adding/removing boundary files is safe.
- Because boundaries are outputs, do not hand‑edit them. Keep them empty and committed if you want consistent imports.
- Filesystem based and NOT import‑graph based.
