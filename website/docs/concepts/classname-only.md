---
title: Classname-only Strategy
---

## 1) What this strategy is

`classname-only` is the static class string strategy. It parses static `className` / `class` tokens into CSS and skips the generated runtime files.

## 2) What you author

Author with static `className` or `class` strings:

```html
<div className="display:flex gap:12 hover:color:purple">
  Static className output
</div>
```

This is the class string lane. It is not the umbrella term for every setup that skips generated runtime files in Boss.

## 3) What files are generated

`classname-only` generates CSS outputs only:

- `.bo$$/styles.css`
- optional `*.boss.css` boundary files

It does **not** generate:

- `.bo$$/index.js`
- `.bo$$/index.d.ts`

## 4) What lands in CSS

- Every parsed static class token
- Nested selector rules expressed in class syntax
- Token declarations and plugin-generated global CSS

Because there is no JSX runtime here, all Boss output is stylesheet-based.

## 5) What runs in the browser

Nothing from Boss runs in the browser for this strategy.

You import the generated stylesheet yourself:

```tsx
import './.bo$$/styles.css'
```

## 6) Constraints / caveats

- Class strings must be static.
- Function values and browser-evaluated values are not available.
- `$$` JSX authoring is not the intended path for this strategy.
- `boss-css compile` is not part of this strategy and currently does not target `classname-only`.

## 7) When to choose it

Choose `classname-only` when:

- you want the static className lane
- your templates already emit static class strings
- you do not want Boss-generated runtime files in the client bundle
- you are working in non-React or low-JS environments
