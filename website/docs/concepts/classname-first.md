---
title: Classname-first Strategy
---

## 1) What this strategy is

`classname-first` is the JSX-oriented strategy that pushes more static values into reusable class rules instead of leaving them inline.

## 2) What you author

This strategy still uses `$$` JSX props as the primary authoring surface.

If you keep the classname parser enabled, Boss can also parse static `className` / `class` tokens elsewhere. The important difference is that JSX props under this strategy prefer class-based output for static values.

## 3) What files are generated

In build/watch/PostCSS flows, `classname-first` typically generates:

- `.bo$$/index.js`
- `.bo$$/index.d.ts`
- `.bo$$/styles.css`
- optional `*.boss.css` boundary files

Compile can also rewrite supported JSX while following `classname-first`, but compile is a separate build step.

## 4) What lands in CSS

- Static JSX prop values as class rules
- Nested selectors such as `hover`, `focus`, `child`, and `at`
- Token declarations and plugin-generated global CSS
- Static className token rules if the classname parser is enabled

Compared with `inline-first`, more of the base styling lands in CSS because static values prefer class rules.

## 5) What runs in the browser

The generated runtime still runs in the browser for `$$` JSX authoring.

Typical browser work:

- build the final `className` for JSX props
- evaluate browser-evaluated values at render time
- attach CSS variables or dynamic output for values that cannot be fixed ahead of time

## 6) Constraints / caveats

- Dynamic values must be functions such as `color={() => tone}`.
- Non-function dynamic values are skipped.
- Stylesheet output is usually larger than `inline-first` because more base props become class rules.
- Compile supports this strategy, but only for JSX and only as an optional build step.

## 7) When to choose it

Choose `classname-first` when:

- you want JSX authoring but more reusable class-based CSS
- you care about cacheable static rules more than minimal CSS size
- your dynamic values already fit the `prop={() => value}` model
