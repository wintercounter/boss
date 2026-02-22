# Compile

:::danger Source rewriting
Boss compile rewrites your source code. Use it in CI/CD or production mode for real builds. In dev mode it writes to a temporary copy so you can inspect the output without mutating your working files. This approach keeps Boss tooling-agnostic (no Babel/Webpack/Vite plugin required).
:::

Boss compile is a source-to-source optimization pass. It rewrites `$$` JSX usage into plain DOM elements, removes runtime imports when they are not needed, and can emit CSS in temp (non-prod) mode for debugging.

This is a build-time tool. It does not run in dev by default.

## Quick start

```sh
npx boss-css compile
```

- By default this writes to `compile.tempOutDir` (see config).
- For in-place mutation, use `--prod` or set `NODE_ENV=production` (no CSS is written in prod mode).
- If you use a custom config directory, the default `compile.tempOutDir` follows it (`<configDir>/compiled`).

## Configuration

Config is loaded from `.bo$$/config.js` plus any `bo$$` key in `package.json`.

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
    classNameStrategy: false,
  },
}
```

`selectorPrefix` prefixes generated class names and CSS variables. Default: `""`.

`selectorScope` scopes selectors and token variables by prepending a selector (e.g. `.scope `). Include a trailing space when you want a descendant combinator. When set, token variables are emitted under that selector instead of `:root`. Default: `""`.

CLI flags override `compile` keys:

```sh
npx boss-css compile --tempOutDir .bo$$/compiled --spread true --classNameStrategy hash
```

`compile.stats` supports `false | "quick" | "detailed"` (default: `"quick"`).

```sh
npx boss-css compile --stats detailed
```

`compile.classNameStrategy` supports `false | "hash" | "shortest" | "unicode"` (default: `false`).
- `hash` uses `@emotion/hash` to generate deterministic class names.
- `shortest` and `unicode` are sequential; compile runs file transforms in order to keep output stable.
- `unicode` skips control, whitespace, and non-character code points to avoid CSS parsing issues.
- Single-word selectors (`/^[a-zA-Z]+$/`) are left untouched to avoid ambiguous tokens.
- When enabled, compile rewrites static string literals and no-expression template literals (excluding module specifiers).
- Classname parsing runs on all files; non-JS/TS files are scanned via quoted strings.

## Output layout

When not in prod mode, the output is written to `compile.tempOutDir` with the same relative paths as the input.

Example (root = project):

```
<root>/src/app.tsx        -> <root>/.bo$$/compiled/src/app.tsx
<root>/.bo$$/styles.css   -> <root>/.bo$$/compiled/.bo$$/styles.css
```

Non-JS/TS files are copied only in temp mode. In prod mode they are left untouched.
CSS output is only written in temp mode.

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
- Parses className strings for boss class syntax (including strings outside JSX).
- Converts `$$` JSX elements into DOM tags (inline-first or classname-first strategy).
- Rewrites `$$.$({ ... })` into `{ style: { ... } }` to support spreads.
- Rewrites `$$.$("...")` into a string literal for className spreads.
- `$$.$` is a no-op marker (returns input at runtime) that tells the parser/compile to treat inputs as Boss props or className markers.
- Captures `$$.css` blocks (template literals or static objects) and appends them to the generated stylesheet.
- Supports `!important` in className tokens via a trailing `!` (for example `color:red!`).
- Rewrites className token strings like `color:$$.token.color.white` to token shorthand (`color:white`).
- Uses framework detection (`framework` config or tsconfig `jsxImportSource`) to choose the class prop (for example `class` in Solid/Qwik/Stencil, `className` in React/Preact).
- Emits CSS (minified with LightningCSS) and writes it to `stylesheetPath` in temp mode.
- Orders generated `@media` rules after base rules and sorts them by width (max-width desc, min-width asc).
- Removes boss runtime imports when the runtime is not needed.

## What compile does not do (yet)

- Only inline-first and classname-first strategies are supported.
- `npx boss-css compile` only supports JSX today.
- Other strategies are not wired.

## Runtime pruning rules

Boss imports are removed when the runtime is not needed. Runtime is kept when any of these remain:

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

### 3b) Container queries

Container queries use the same `at`/context syntax, plus the `container` shorthand. You still need to set a
container on an ancestor (for example `containerType="inline-size"`).

Basic unnamed container (props):

```tsx
export const Example = () => (
  <$$ containerType="inline-size" container={{ mobile: { fontStyle: "italic" } }} />
)
```

Basic unnamed container (className):

```tsx
export const Example = () => (
  <div className="container:mobile:font-style" style={{ "--container-mobile-font-style": "italic" }} />
)
```

CSS:

```css
@container (min-width: 376px) and (max-width: 639px) {
  .container\:mobile\:font-style { font-style: var(--container-mobile-font-style) }
}
```

#### Setting the container (CSS props)

You can use any of these:

```tsx
<$$ containerType="inline-size" containerName="card" />
<$$ container="card / inline-size" />
<div className="container-type:inline-size container-name:card" />
```

If you need both the CSS `container` shorthand **and** the `container` query object on the same element,
prefer `containerType`/`containerName` for the CSS values and reserve `container` for the query object.

#### Named containers

Props (named container):

```tsx
export const Example = () => (
  <$$
    containerType="inline-size"
    containerName="card"
    at={{ "container card": { mobile: { fontStyle: "italic" } } }}
  />
)
```

Props (named container shorthand):

```tsx
<$$ container_card={{ mobile: { fontStyle: "italic" } }} />
```

ClassName (named container):

```tsx
<div className="at:container_card:mobile:font-style" />
```

Notes:
- In props, use `at={{ "container card": ... }}` for named containers.
- In className, replace the space with `_` (`container_card`).
- For unnamed containers inside `at`, you can also use `at={{ container: { mobile: { ... } } }}`.

#### Composition with pseudos, child selectors, and groups

Props:

```tsx
<$$
  container={{ mobile: { hover: { display: "block" }, child: { ".item": { color: "red" } } } }}
/>
```

ClassName:

```tsx
<div className="container:mobile:hover:display:block" />
<div className="container:mobile:[&_.item]:color:red" />
<div className="container:mobile:{width:100;color:red}" />
<div className="at:container_card:mobile:hover:{color:red;text-decoration:underline}" />
```

#### Range shorthands (media + container)

Range syntax is `min-max`, `min+`, or `max-`. The left side is the min bound, the right side is the max bound.
Named breakpoints resolve to their configured px values; raw numbers use your `unit` config (default: `px`).
If you provide a unit (like `rem`), it is used as-is.

Examples (props):

```tsx
<$$ at={{ "200-400": { fontSize: 12 } }} />
<$$ at={{ "200+": { fontSize: 12 } }} />
<$$ at={{ "200-": { fontSize: 12 } }} />

<$$ container={{ "200-400": { fontSize: 12 } }} />
<$$ container={{ "200+": { fontSize: 12 } }} />
<$$ container={{ "200-": { fontSize: 12 } }} />
<$$ container={{ "mobile-810": { fontSize: 12 } }} />
<$$ container={{ "810-mobile": { fontSize: 12 } }} />
<$$ container={{ "mobile-8.2rem": { fontSize: 12 } }} />
```

Examples (className):

```tsx
<div className="container:200-400:font-size:12" />
<div className="container:200+:font-size:12" />
<div className="container:200-:font-size:12" />
<div className="container:mobile-810:font-size:12" />
<div className="container:810-mobile:font-size:12" />
<div className="container:mobile-8.2rem:font-size:12" />
```

### 3c) Keyframes

Keyframes are declared as contexts and auto-attach `animation-name` to the same selector.
Auto-names are hashed from selector contexts (no manual name needed).
Keyframes are top-level only (except under `at`/container contexts).
Steps accept `from`, `to`, or percentages (`0%`, `50%`, `100%`).

ClassName (auto-name):

```tsx
<div className="keyframes:from:opacity:0 keyframes:50%:opacity:1 keyframes:to:opacity:0" />
```

ClassName (grouped properties):

```tsx
<div className="keyframes:from:{opacity:0;transform:scale(0.95)} keyframes:to:{opacity:1;transform:scale(1)}" />
```

ClassName (named):

```tsx
<div className="keyframes_fade:from:opacity:0 keyframes_fade:to:opacity:1" />
```

ClassName (with pseudo/child context):

```tsx
<div className="hover:keyframes:from:opacity:0 hover:keyframes:to:opacity:1" />
<div className="[&>img]:keyframes:from:transform:scale(0.9) [&>img]:keyframes:to:transform:scale(1)" />
```

Props (auto-name):

```tsx
<$$ keyframes={{ from: { opacity: 0 }, "50%": { opacity: 1 }, to: { opacity: 0 } }} />
```

Props (named):

```tsx
<$$ keyframes_fade={{ from: { opacity: 0 }, to: { opacity: 1 } }} />
```

Props (named, inside `at`):

```tsx
<$$ at={{ "keyframes fade": { from: { opacity: 0 }, to: { opacity: 1 } } }} />
```

Keyframes can also live under container/media contexts:

```tsx
<$$ at={{ mobile: { keyframes: { from: { opacity: 0 }, to: { opacity: 1 } } } }} />
<div className="at:mobile:keyframes:from:opacity:0 at:mobile:keyframes:to:opacity:1" />
<div className="container:200-400:keyframes:from:opacity:0 container:200-400:keyframes:to:opacity:1" />
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

Token overrides can be applied at runtime via the `tokens` prop or the `$$.tokenVars` helper:

```tsx
export const Example = props => (
  <$$
    tokens={{ color: { primary: "#fff" }, size: { sm: 8 } }}
    style={{ ...props.style, ...$$.tokenVars(props.tokens) }}
  />
)
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
export const Example = () => <div className="hover:{color:red;text-decoration:underline}" />
```

CSS:

```css
[class~="hover:{color:red;text-decoration:underline}"]:hover { color: red }
[class~="hover:{color:red;text-decoration:underline}"]:hover { text-decoration: underline }
```

### 10) Arbitrary selector classnames

Input:

```tsx
export const Example = () => <div className="[&>div]:color:red" />
```

Output (JSX unchanged):

```tsx
export const Example = () => <div className="[&>div]:color:red" />
```

CSS:

```css
.\[\&\>div\]\:color\:red>div { color: red }
```

Notes:
- Use `_` to represent spaces inside the brackets (e.g. `[&_.child]` -> `& .child`).

### 11) Dynamic values use a helper for units

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

### 12) Dynamic `as` compiles into a local component

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

### 13) Prepared components are inlined when available

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

TypeScript note: generated `.bo$$/index.d.ts` includes JSDoc for prepared components with their source file and the styles/props they apply.

### 14) Custom CSS blocks

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
- Classname-first emits class names for static values and CSS variables for `prop={() => value}`.
- Prepared components can be inlined across files when their definitions are static.
- Non-CSS attributes on `$$` elements are preserved and not converted into CSS variables.
