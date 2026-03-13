---
title: Inline-first Strategy
---

## 1) What this strategy is

`inline-first` is the default JSX-oriented strategy. It keeps as much base styling as possible on the element and emits CSS rules only where selectors or shared rules are needed.

## 2) What you author

Use this strategy when your main authoring input is `$$` JSX props.

You can also keep the classname parser enabled for static `className` / `class` tokens elsewhere in the app, but the core `inline-first` path is JSX authoring.

## 3) What files are generated

In build/watch/PostCSS flows, `inline-first` typically generates:

- `.bo$$/index.js`
- `.bo$$/index.d.ts`
- `.bo$$/styles.css`
- optional `*.boss.css` boundary files

If you later use compile, it follows this strategy and can rewrite supported JSX into plain elements. Compile is separate from the strategy itself.

## 4) What lands in CSS

- Nested selectors such as `hover`, `focus`, `child`, and `at`
- Token declarations and any global CSS from plugins
- Static className token rules if the classname parser is enabled

Base props like `display`, `gap`, or `backgroundColor` usually stay inline instead of becoming standalone class rules.

## 5) What runs in the browser

The generated runtime in `.bo$$/index.js` handles `$$` JSX at render time.

Typical browser work:

- turn JSX props into DOM props
- attach inline styles for base values
- attach CSS variables for nested contexts
- evaluate browser-evaluated values such as function props when present

## 6) Constraints / caveats

- Nested contexts still need CSS output, so this is not “inline only”.
- Function values still need a generated runtime path.
- Compile currently supports JSX with `inline-first`, but compile is optional and not a requirement for using this strategy.

## 7) When to choose it

Choose `inline-first` when:

- you want the default Boss setup
- you prefer small stylesheet output
- your team likes JSX props as the main authoring surface
- most values are static or simple enough to stay on the element
