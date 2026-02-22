---
title: Compile
---

:::danger Source rewriting
Boss compile rewrites your source code. Use it in CI/CD or production mode for real builds. In dev mode it writes to a temporary copy so you can inspect the output without mutating your working files. This approach keeps Boss tooling-agnostic (no Babel/Webpack/Vite plugin required).
:::

Boss compile is a build-time, source-to-source optimization pass. It rewrites `$$` JSX into plain DOM elements, emits CSS, and removes runtime imports when possible.

## Quick start

```bash
npx boss-css compile
```

- Default output goes to `compile.tempOutDir`.
- Use `--prod` or `NODE_ENV=production` to mutate files in place.
- If you use a custom config directory, the default `compile.tempOutDir` follows it (`<configDir>/compiled`).

## Configuration

Boss config is loaded from `.bo$$/config.js` plus any `bo$$` key in `package.json`.

```js
// .bo$$/config.js
export default {
  content: ["src/**/*.{ts,tsx,js,jsx,mjs,cjs}"],
  selectorPrefix: "boss-",
  selectorScope: ".scope ",
  stylesheetPath: ".bo$$/styles.css",
  compile: {
    tempOutDir: ".bo$$/compiled",
    spread: true,
    stats: "quick",
  },
}
```

`selectorPrefix` prefixes generated class names and CSS variables.

`selectorScope` scopes selectors and token variables (include a trailing space for descendant selectors).

CLI flags override `compile` keys:

```bash
npx boss-css compile --tempOutDir .bo$$/compiled --spread true
```

`compile.stats` supports `false | "quick" | "detailed"` (default: `"quick"`).

```bash
npx boss-css compile --stats detailed
```

## Output layout

When not in prod mode, output files mirror the source tree under `compile.tempOutDir`.

```
<root>/src/app.tsx        -> <root>/.bo$$/compiled/src/app.tsx
<root>/.bo$$/styles.css   -> <root>/.bo$$/compiled/.bo$$/styles.css
```

Non-JS/TS files are copied in temp mode. In prod mode they are left untouched.

## Stats output

Quick:

```
npx boss-css compile stats (quick)
Mode: temp
Runtime free: yes
Runtime files: 0
Files processed: 42
Elements replaced: 128
Time: 1.24s
```

Detailed:

```
npx boss-css compile stats (detailed)
Mode: temp
Runtime free: no
Runtime files (2):
- src/components/ClientOnly.tsx
- src/app/layout.tsx
Files processed: 42
Files copied: 5
Files skipped: 0
Files total: 47
Elements replaced: 128
Value helper files (1):
- src/components/Padded.tsx
CSS output: /path/to/project/.bo$$/compiled/.bo$$/styles.css (2048 bytes)
Output dir: /path/to/project/.bo$$/compiled
Time: 1.24s
```

## What compile does

- Parses JS/TS/JSX/TSX with SWC.
- Parses classname strings for boss syntax (including normal elements).
- Converts `$$` JSX elements into DOM tags (inline-first or classname-first).
- Rewrites `$$.$({ ... })` into `{ style: { ... } }` to support spreads.
- Rewrites `$$.$("...")` into a string literal for className spreads.
- `$$.$` is a no-op marker (returns input at runtime) that tells the parser/compile to treat inputs as Boss props or className markers.
- Supports `!important` in className tokens via a trailing `!` (for example `color:red!`).
- Rewrites className token strings like `color:$$.token.color.white` to token shorthand (`color:white`).
- Emits CSS (minified with LightningCSS) to `stylesheetPath`.
- Removes boss runtime imports when runtime usage is not required.

## What compile does not do (yet)

- Only inline-first and classname-first strategies are supported.
- `npx boss-css compile` only supports JSX today.
- Classname-first expects dynamic values to be written as functions (`prop={() => value}`).

## Runtime pruning rules

Boss imports are removed when runtime is not needed. Runtime is kept when any of these remain:

- `$$` is used as a value that cannot be inlined (for example non-token `$$` references outside JSX). `$$.token.*` outside JSX is inlined to `var(--...)`.
- A `$$` element cannot be compiled (spread when `compile.spread` is false, or unresolved prepared components).

## Input to output examples

### 1) Simple inline props

Input:

```tsx
export const Example = () => <$$ color="red" padding={8} />
```

Output:

```tsx
export const Example = () => <div style={{ color: "red", padding: "8px" }} />
```

CSS output: none (no CSS file is written when output is empty).

### 2) Pseudo props become class + CSS variable

Input:

```tsx
export const Example = () => <$$ hover={{ color: "red" }} />
```

Output:

```tsx
export const Example = () => (
  <div className="hover:color" style={{ "--hover-color": "red" }} />
)
```

CSS:

```css
.hover\:color:hover { color: var(--hover-color) }
```

### 3) Media queries with `at`

Input:

```tsx
export const Example = () => <$$ at={{ dark: { fontStyle: "italic" } }} />
```

Output:

```tsx
export const Example = () => (
  <div className="at:dark:font-style" style={{ "--at-dark-font-style": "italic" }} />
)
```

CSS:

```css
@media screen and (prefers-color-scheme: dark) {
  .at\:dark\:font-style { font-style: var(--at-dark-font-style) }
}
```

### 4) Tokens become CSS variables

Input:

```tsx
export const Example = () => <$$ color="white" />
```

Output:

```tsx
export const Example = () => <div style={{ color: "var(--color-white)" }} />
```

CSS (default tokens):

```css
:root { --color-white: #fff }
```

If you reference tokens via `$$.token.*`, compile inlines them to CSS variables:

```tsx
export const Example = () => <$$ color={$$.token.color.white} />
```

### 5) `$$.$({ ... })` marker unwrap

Input:

```tsx
const props = $$.$({ color: 1 })
```

Output:

```tsx
const props = { color: 1 }
```

`$$.$` is a marker only; it does not generate `className` or `style`. Use it to mark Boss prop objects (for example when passing them into `<$$ {...props} />` or `style={$$.$({ ... })}`). If you want a spreadable object with valid DOM props, use `$$.style(...)`.

### 6) Spreads on `$$` elements (compile.spread = true)

Input:

```tsx
const domProps = $$.style({ color: 1 })
export const Example = () => <$$ {...domProps} />
```

Output:

```tsx
const domProps = $$.style({ color: 1 })
export const Example = () => <div {...domProps} />
```

When `compile.spread` is false, the `$$` element is left as-is and runtime imports are preserved.

### 6b) `$$.$("...")` className marker

Input:

```tsx
const className = $$.$("display:flex hover:color:red")
export const Example = () => <div className={className} />
```

Output:

```tsx
const className = "display:flex hover:color:red"
export const Example = () => <div className={className} />
```

### 6c) Token strings in className are normalized

Input:

```tsx
export const Example = () => <div className="color:$$.token.color.white" />
```

Output:

```tsx
export const Example = () => <div className="color:white" />
```

### 7) Existing className/style are preserved and merged

Input:

```tsx
export const Example = () => (
  <$$ className="card" style={{ display: "block" }} hover={{ color: "red" }} />
)
```

Output:

```tsx
export const Example = () => (
  <div className="card hover:color" style={{ display: "block", "--hover-color": "red" }} />
)
```

CSS:

```css
.hover\:color:hover { color: var(--hover-color) }
```

### 8) Classname parser on normal elements

Input:

```tsx
export const Example = () => <div className="display:flex hover:color:red" />
```

Output (JSX unchanged):

```tsx
export const Example = () => <div className="display:flex hover:color:red" />
```

CSS:

```css
.display\:flex { display: flex }
.hover\:color\:red:hover { color: red }
```

### 9) Grouped selector classnames

Input:

```tsx
export const Example = () => <div className="hover:{color:red;text-decoration:underline}" />
```

Output (JSX unchanged):

```tsx
export const Example = () => (
  <div className="hover:color:red hover:text-decoration:underline" />
)
```

CSS:

```css
.hover\:color\:red:hover { color: red }
.hover\:text-decoration\:underline:hover { text-decoration: underline }
```

### 10) Dynamic values use a helper for units

Input:

```tsx
export const Example = ({ pad }: { pad: number }) => <$$ padding={pad} />
```

Output:

```tsx
import { createBossValue } from "boss-css/compile/runtime"
const __bossValue = createBossValue("px")

export const Example = ({ pad }: { pad: number }) => (
  <div style={{ padding: __bossValue(pad) }} />
)
```

### 11) Dynamic `as` compiles into a local component

Input:

```tsx
export const Example = () => <$$ as={tag} />
```

Output:

```tsx
export const Example = () => (function () {
  const __BossCmp = tag
  return <__BossCmp />
})()
```

### 12) Prepared components are inlined when available

Input:

```tsx
$$.PreparedUppercaseA = $$.$({ color: "red", hover: { color: "blue" } })
export const Example = () => <$$.PreparedUppercaseA fontWeight="bold" />
```

Output:

```tsx
export const Example = () => (
  <div className="hover:color" style={{ color: "red", "--hover-color": "blue", fontWeight: "bold" }} />
)
```

Prepared definitions can live in any file matched by `content`. Compile collects them before transforming, so usages in other files can be inlined too. Cross-file inlining only happens when the prepared definition is fully static (no dynamic expressions and `as` is a static string). Non-static prepared definitions keep runtime behavior and the assignment remains in the output.

### 13) Custom CSS blocks

Input:

```tsx
$$.css`
.banner { background: linear-gradient(#fff, #eee); }
`
$$.css({ ".card": { padding: 12, color: "red" } })
```

Output:

```tsx
/* removed from JS output when used as a statement */
```

CSS:

```css
.banner { background: linear-gradient(#fff, #eee); }
.card { padding: 12px; color: red }
```

Notes:
- Template literals must be static (no `${}` expressions).
- Object values must be static; nested objects are treated as selectors or `@` rules.
- Top-level declarations without an explicit selector are wrapped in `:root`.
- If `$$.css(...)` is used in an expression position, it is replaced with `void 0`.

## Notes

- `content` is required for compile to know which files to scan.
- CSS output is written only when non-empty.
- Only inline-first and classname-first strategies are supported right now.
- Inline-first keeps first-level CSS props inline (deep contexts use CSS variables).
- Prepared components can be inlined across files when their definitions are static.
- Non-CSS attributes on `$$` elements are preserved and not converted into CSS variables.
