<p align="center">
  <img src="./boss-logo.webp" alt="Boss CSS logo" width="520" />
</p>

<h1 align="center">Boss CSS</h1>

<p align="center">
  Polymorphic, usage-driven CSS-in-JS.
</p>

<p align="center">
  <strong>Warning:</strong> Boss CSS is not production-ready yet. Expect breaking changes and stability issues.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/boss-css"><img src="https://img.shields.io/npm/v/boss-css.svg" alt="npm version" /></a>
  <a href="./package.json"><img src="https://img.shields.io/npm/l/boss-css.svg" alt="license" /></a>
</p>

<p align="center">
  <a href="https://bosscss.com">Website</a> | <a href="https://bosscss.com/docs">Documentation</a> | <a href="https://dev.to/wintercounter/boss-css-i-created-another-css-in-js-lib-and-here-is-why-23kc">Learn More</a>
</p>

## Table of Contents

- [Why Boss CSS](#why-boss-css)
- [Quick Start](#quick-start)
- [What It Looks Like](#what-it-looks-like)
- [Usage Examples](#usage-examples)
- [Solution Patterns](#solution-patterns)
- [How It Works](#how-it-works)
- [Strategy Modes](#strategy-modes)
- [Compile](#compile)
- [CSS Boundaries](#css-boundaries)
- [AI Ready](#ai-ready)
- [Plugin Surface](#plugin-surface)
- [Where It Shines](#where-it-shines)
- [Docs Map](#docs-map)
- [Status](#status)
- [License](#license)

## Why Boss CSS

Boss CSS treats JSX props and `className` syntax as two inputs into the same style system.

What that means in practice:

- Write styles directly on `$$` elements with real CSS prop names.
- Parse static `className` strings using `prop:value` syntax.
- Switch output strategy without changing how components are authored.
- Compose reusable patterns with `$$.cx`, `cv`, `scv`, and `sv`.
- Extend the system through plugins instead of forking the runtime.

The project is built around a plugin pipeline:

- `parser` plugins extract style intent from source files.
- `prop` plugins handle CSS props, pseudos, media queries, child selectors, and Bosswind aliases.
- `use` plugins add cross-cutting features such as tokens.
- `strategy` plugins choose how output is emitted.

Core capabilities:

- Polymorphic `$$` authoring with generated framework runtime adapters.
- Unified JSX props and className parsing.
- Generated TypeScript types for CSS props and prepared components.
- Token support, pseudo selectors, breakpoints, and arbitrary child selectors.
- Multiple output strategies, plus optional compile-time source rewriting.
- Bosswind for Tailwind-like prop aliases on top of the same engine.
- CLI and PostCSS integration for build, watch, compile, and dev workflows.
- Framework and bundler agnostic.

## Quick Start

Scaffold the config, runtime, and starter files:

```bash
npx boss-css init
```

Import the generated runtime once near your app root:

```tsx
import './.bo$$'
```

Typical commands after setup:

```bash
npx boss-css build
npx boss-css watch
npx boss-css dev
```

If you want to wire it up manually, start with the docs:

- Quick start: https://bosscss.com/docs/getting-started/quick-start
- Configuration: https://bosscss.com/docs/getting-started/configuration
- Runtime strategy: https://bosscss.com/docs/concepts/runtime-strategy

Boss CSS using component props is designed for React, Next.js, Preact, Solid, Qwik, and Stencil projects. There is also
a React Native flow in the docs.

## What It Looks Like

### JSX props

```tsx
export function Hero() {
    return (
        <$$
            display="grid"
            gap={16}
            padding={[20, 24]}
            borderRadius={18}
            backgroundColor="#111c31"
            color="#f5f8ff"
            hover={{ backgroundColor: '#15233d' }}
            at={{ 'mobile+': { gap: 20, padding: [24, 28] } }}
        >
            Boss CSS
        </$$>
    )
}
```

## Usage Examples

### Card

<details open>
<summary>JSX props</summary>

```tsx
export function SurfaceCard() {
    return (
        <$$
            display="flex"
            alignItems="center"
            gap={12}
            padding={12}
            borderRadius={18}
            backgroundColor="#111c31"
            color="#f5f8ff"
        >
            Surface card
        </$$>
    )
}
```

</details>

<details>
<summary>className syntax</summary>

```tsx
export function SurfaceCard() {
    return (
        <div className="display:flex align-items:center gap:12 padding:12 border-radius:18 background-color:#111c31 color:#f5f8ff">
            Surface card
        </div>
    )
}
```

</details>

<details>
<summary>Bosswind + JSX props</summary>

```tsx
export function SurfaceCard() {
    return (
        <$$ flex items="center" gap={4} p={4} rounded="xl" backgroundColor="#111c31" color="#f5f8ff">
            Surface card
        </$$>
    )
}
```

</details>

<details>
<summary>Bosswind + className</summary>

```tsx
export function SurfaceCard() {
    return (
        <div className="flex items:center gap:4 p:4 rounded:xl background-color:#111c31 color:#f5f8ff">
            Surface card
        </div>
    )
}
```

</details>

### Button

<details open>
<summary>JSX props</summary>

```tsx
export function ActionButton() {
    return (
        <$$
            display="inline-flex"
            alignItems="center"
            justifyContent="center"
            gap={6}
            padding={[9, 12]}
            borderRadius={999}
            backgroundColor="#111"
            color="#fff"
            hover={{ backgroundColor: '#222' }}
        >
            Save
        </$$>
    )
}
```

</details>

<details>
<summary>className syntax</summary>

```tsx
export function ActionButton() {
    return (
        <button className="display:inline-flex align-items:center justify-content:center gap:6 padding:9_12 border-radius:999 background-color:#111 color:#fff hover:background-color:#222">
            Save
        </button>
    )
}
```

</details>

<details>
<summary>Bosswind + JSX props</summary>

```tsx
export function ActionButton() {
    return (
        <$$
            inlineFlex
            items="center"
            justify="center"
            gap={2}
            py={3}
            px={4}
            rounded="full"
            bg="#111"
            color="#fff"
            hover={{ bg: '#222' }}
        >
            Save
        </$$>
    )
}
```

</details>

<details>
<summary>Bosswind + className</summary>

```tsx
export function ActionButton() {
    return (
        <button className="inline-flex items:center justify:center gap:2 py:3 px:4 rounded:full bg:#111 color:#fff hover:bg:#222">
            Save
        </button>
    )
}
```

</details>

### Nested pseudo and media props

```tsx
export function CTA() {
    return (
        <$$
            color="#111"
            backgroundColor="#fff"
            hover={{
                color: '#fff',
                backgroundColor: '#111',
            }}
            focus={{
                outline: '2px solid #6dd6ff',
                outlineOffset: 2,
            }}
            at={{
                'mobile+': {
                    padding: [14, 18],
                    fontSize: 18,
                },
            }}
        >
            Press
        </$$>
    )
}
```

### Child selectors

```tsx
export function CardList() {
    return (
        <$$
            display="grid"
            gap={12}
            child={{
                '.title': { fontWeight: 700 },
                '.meta': { opacity: 0.65 },
                '&>article': { padding: 16, borderRadius: 16, backgroundColor: '#111c31' },
            }}
        >
            <article>
                <div className="title">Card title</div>
                <div className="meta">Meta copy</div>
            </article>
        </$$>
    )
}
```

### Static className parsing

```tsx
export function Badge() {
    return (
        <span className="display:inline-flex align-items:center gap:6 padding:6_10 border-radius:999 background-color:#111 color:#fff">
            New
        </span>
    )
}
```

Grouped pseudo/media syntax is also supported:

```tsx
<button className="mobile:hover:{background-color:black;color:white} focus-visible:{outline:2_solid;outline-color:#6dd6ff}">
    Hover me
</button>
```

### Arbitrary selectors in className

```tsx
<div className="[&_.title]:font-weight:700 [.title_&]:color:red">
    <span className="title">Title</span>
</div>
```

### Arrays, shorthands, and multiline strings

```tsx
<$$ margin={[20, 0]} padding={[8, 16]} />

<div
  className="
    display:flex
    gap:12
    hover:color:red
    focus-visible:background-color:black
  "
/>
```

### Mix props and className

```tsx
export function Mixed({ tone }: { tone: 'light' | 'dark' }) {
    return (
        <$$
            className="display:flex align-items:center gap:12 border-radius:14 padding:12_16"
            color={tone === 'dark' ? '#fff' : '#111'}
        />
    )
}
```

### Tokens and local theming

```tsx
export function ThemedPanel() {
    return (
        <$$
            tokens={{
                color: {
                    brand: '#8b5cf6',
                    background: '#0b1220',
                },
            }}
            backgroundColor="background"
            color="brand"
            padding={20}
            borderRadius={18}
        >
            Local theme override
        </$$>
    )
}
```

### Reusing style objects on non-`$$` elements

```tsx
const surface = $$.$({
    display: 'flex',
    gap: 12,
    padding: 16,
    borderRadius: 16,
    hover: { color: 'purple' },
})

export function PlainDiv() {
    return <div {...$$.style(surface)} />
}
```

### Composition and variants

```ts
import { cv } from 'boss-css/variants'

const button = cv({
    base: 'display:inline-flex align-items:center justify-content:center gap:8 padding:10_14 border-radius:999',
    variants: {
        tone: {
            primary: 'background-color:black color:white',
            subtle: 'background-color:transparent color:black border:1_solid border-color:black',
        },
    },
    defaultVariants: {
        tone: 'primary',
    },
})

button({ tone: 'subtle' })
```

Access utilities directly on the global `$$` proxy:

```ts
const className = $$.cx('display:flex gap:12', isActive && 'color:blue', isMuted && 'opacity:0.6')
```

### Prepared components

```tsx
$$.Card = $$.$({
    padding: 18,
    borderRadius: 18,
    backgroundColor: '#111c31',
    color: '#f5f8ff',
    hover: { backgroundColor: '#15233d' },
})

export function Demo() {
    return <$$.Card>Prepared component</$$.Card>
}
```

### Bosswind

Enable the Bosswind plugin when you want Tailwind-style aliases and tokens:

```tsx
export function BosswindCard() {
    return (
        <$$ flex items="center" gapX={4} p={4} rounded="xl" bg="blue.600" hover={{ bg: 'blue.700' }}>
            Bosswind
        </$$>
    )
}
```

## Solution Patterns

### Prepared components

```tsx
$$.Stack = $$.$({
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
})

export function DialogSection() {
    return (
        <$$.Stack gap={16} padding={20}>
            <h2>Dialog title</h2>
            <p>Content</p>
        </$$.Stack>
    )
}
```

### Toolbar row

<details open>
<summary>JSX props</summary>

```tsx
export function ToolbarRow() {
    return (
        <$$
            display="flex"
            alignItems="center"
            justifyContent="space-between"
            gap={12}
            padding={12}
            borderRadius={18}
            backgroundColor="#111c31"
            color="#fff"
        >
            <span>Title</span>
            <span>Status</span>
        </$$>
    )
}
```

</details>

<details>
<summary>className syntax</summary>

```tsx
export function ToolbarRow() {
    return (
        <div className="display:flex align-items:center justify-content:space-between gap:12 padding:12 border-radius:18 background-color:#111c31 color:#fff">
            <span>Title</span>
            <span>Status</span>
        </div>
    )
}
```

</details>

<details>
<summary>Bosswind + JSX props</summary>

```tsx
export function ToolbarRow() {
    return (
        <$$ flex items="center" justify="between" gap={4} p={4} rounded="xl" bg="#111c31" color="#fff">
            <span>Title</span>
            <span>Status</span>
        </$$>
    )
}
```

</details>

<details>
<summary>Bosswind + className</summary>

```tsx
export function ToolbarRow() {
    return (
        <div className="flex items:center justify:between gap:4 p:4 rounded:xl bg:#111c31 color:#fff">
            <span>Title</span>
            <span>Status</span>
        </div>
    )
}
```

</details>

### Themeable marketing section

```tsx
export function MarketingSection({ dark }: { dark: boolean }) {
    return (
        <$$
            tokens={{
                color: dark ? { text: '#f8fafc', panel: '#0f172a' } : { text: '#0f172a', panel: '#ffffff' },
            }}
            backgroundColor="panel"
            color="text"
            padding={[24, 28]}
            borderRadius={20}
        >
            Themeable content
        </$$>
    )
}
```

### Dashboard shell, four authoring styles

<details open>
<summary>JSX props</summary>

```tsx
export function DashboardShell() {
    return (
        <$$ display="grid" gap={12}>
            <$$
                display="flex"
                alignItems="center"
                justifyContent="space-between"
                padding={12}
                borderRadius={18}
                backgroundColor="#111c31"
                color="#fff"
            >
                Header
            </$$>
            <$$ display="grid" gap={12}>
                <$$ padding={12} borderRadius={12} backgroundColor="#eef2ff">
                    Card A
                </$$>
                <$$ padding={12} borderRadius={12} backgroundColor="#eef2ff">
                    Card B
                </$$>
            </$$>
        </$$>
    )
}
```

</details>

<details>
<summary>className syntax</summary>

```tsx
export function DashboardShell() {
    return (
        <div className="display:grid gap:12">
            <div className="display:flex align-items:center justify-content:space-between padding:12 border-radius:18 background-color:#111c31 color:#fff">
                Header
            </div>
            <div className="display:grid gap:12">
                <div className="padding:12 border-radius:12 background-color:#eef2ff">Card A</div>
                <div className="padding:12 border-radius:12 background-color:#eef2ff">Card B</div>
            </div>
        </div>
    )
}
```

</details>

<details>
<summary>Bosswind + JSX props</summary>

```tsx
export function DashboardShell() {
    return (
        <$$ grid gap={4}>
            <$$ flex items="center" justify="between" p={4} rounded="xl" bg="#111c31" color="#fff">
                Header
            </$$>
            <$$ grid gap={4}>
                <$$ p={4} rounded="lg" bg="#eef2ff">
                    Card A
                </$$>
                <$$ p={4} rounded="lg" bg="#eef2ff">
                    Card B
                </$$>
            </$$>
        </$$>
    )
}
```

</details>

<details>
<summary>Bosswind + className</summary>

```tsx
export function DashboardShell() {
    return (
        <div className="grid gap:4">
            <div className="flex items:center justify:between p:4 rounded:xl bg:#111c31 color:#fff">Header</div>
            <div className="grid gap:4">
                <div className="p:4 rounded:lg bg:#eef2ff">Card A</div>
                <div className="p:4 rounded:lg bg:#eef2ff">Card B</div>
            </div>
        </div>
    )
}
```

</details>

## How It Works

Boss CSS is usage-driven. The source code you write determines what runtime and CSS output get generated.

High-level flow:

1. Parse source files from JSX and/or static className strings.
2. Convert that input into a normalized prop tree.
3. Run the tree through prop plugins such as `css`, `pseudo`, `at`, `child`, `bosswind`, and `token`.
4. Let the selected strategy decide what becomes CSS, inline styles, variables, or runtime output.
5. Emit generated runtime files, d.ts files, and CSS.

This model is why the same component styles can move between:

- `inline-first` output for minimal CSS,
- `classname-first` for load once, cache forever scenarios,
- `classname-only` output for static utility-style builds,
- `runtime-only` or `hybrid` output when values must be computed in the browser.

## Strategy Modes

Boss CSS supports multiple output strategies:

- `inline-first`: Default. Pushes as much as possible into inline styles or CSS variables and keeps stylesheet output
  small.
- `classname-first`: Prefers classes where possible and uses runtime logic for dynamic values.
- `classname-only`: CSS-only className parsing with no generated JSX runtime files.
- `runtime`: Runtime-only or hybrid mode. Useful when styles or values must be resolved in the browser.

Read more: https://bosscss.com/docs/concepts/runtime-strategy

The same component intent can be emitted very differently depending on the strategy you pick:

<details open>
<summary><code>inline-first</code>: minimal CSS, small generated runtime</summary>

This is the default strategy for `$$` JSX. Top-level props lean inline. Nested selectors like `hover`, `at`, and `child`
become CSS rules with variables.

Config:

```js
import * as jsx from 'boss-css/parser/jsx/server'
import * as css from 'boss-css/prop/css/server'
import * as pseudo from 'boss-css/prop/pseudo/server'
import * as inlineFirst from 'boss-css/strategy/inline-first/server'

export default {
    plugins: [css, pseudo, jsx, inlineFirst],
}
```

You write:

```tsx
<$$
    display="inline-flex"
    alignItems="center"
    gap={8}
    padding={[8, 10]}
    borderRadius={12}
    backgroundColor="#111c31"
    color="white"
    hover={{ backgroundColor: '#15233d' }}
>
    Save
</$$>
```

Boss emits:

- `.bo$$/index.js` and `.bo$$/index.d.ts` for the generated JSX runtime helpers
- a small `.bo$$/styles.css` file mostly for nested selectors
- base props that tend to stay inline, while `hover`, `at`, and `child` rules become CSS

Typical emitted output:

```tsx
<div
    className="hover:background-color"
    style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 12px',
        borderRadius: '12px',
        backgroundColor: '#111c31',
        color: 'white',
        '--hover-background-color': '#15233d',
    }}
>
    Save
</div>
```

What lands in `.bo$$/styles.css`:

```css
.hover\:background-color:hover {
    background-color: var(--hover-background-color);
}
```

Base props like `display`, `gap`, `padding`, and `backgroundColor` stay inline here, so they do not produce class rules.

</details>

<details>
<summary><code>classname-first</code>: load once, reuse classes</summary>

This keeps the same `$$` authoring style, but static values prefer generated classnames instead of inline styles.
Dynamic values need to be functions so the runtime can decide which values need to use static classes versus CSS
variables.

Config:

```js
import * as jsx from 'boss-css/parser/jsx/server'
import * as css from 'boss-css/prop/css/server'
import * as pseudo from 'boss-css/prop/pseudo/server'
import * as classnameFirst from 'boss-css/strategy/classname-first/server'

export default {
    plugins: [css, pseudo, jsx, classnameFirst],
}
```

You write:

```tsx
<$$
    display="inline-flex"
    alignItems="center"
    gap={8}
    padding={[8, 12]}
    borderRadius={12}
    backgroundColor="#111c31"
    color="white"
    hover={{ backgroundColor: '#15233d' }}
>
    Save
</$$>
```

Boss emits:

- `.bo$$/index.js`, `.bo$$/index.d.ts`, and `.bo$$/styles.css`
- class-oriented output for static values, closer to utility-style CSS, eg. Tailwind
- runtime handling only where values are truly dynamic, usually as function props like `backgroundColor={() => tone}`

Typical emitted output:

```tsx
<div className="display:inline-flex align-items:center gap:8 padding:8_12 border-radius:12 background-color:#111c31 color:white hover:background-color:#15233d">
    Save
</div>
```

What lands in `.bo$$/styles.css`:

```css
.display\:inline-flex {
    display: inline-flex;
}
.align-items\:center {
    align-items: center;
}
.gap\:8 {
    gap: 8px;
}
.padding\:8px_12px {
    padding: 8px 12px;
}
.border-radius\:12 {
    border-radius: 12px;
}
.background-color\:\#111c31 {
    background-color: #111c31;
}
.color\:white {
    color: white;
}
.hover\:background-color\:\#15233d:hover {
    background-color: #15233d;
}
```

</details>

<details>
<summary><code>classname-only</code>: CSS only from static className syntax</summary>

This is the CSS-only strategy for static className authoring. It parses static `className` strings, emits CSS, and skips
the generated JSX runtime entirely.

Config:

```js
import * as classname from 'boss-css/parser/classname/server'
import * as css from 'boss-css/prop/css/server'
import * as pseudo from 'boss-css/prop/pseudo/server'
import * as classnameOnly from 'boss-css/strategy/classname-only/server'

export default {
    plugins: [css, pseudo, classname, classnameOnly],
}
```

You write:

```tsx
<button className="display:inline-flex align-items:center gap:8 padding:8px_12px border-radius:12 background-color:#111c31 color:white hover:background-color:#15233d">
    Save
</button>
```

Boss emits:

- `.bo$$/styles.css`
- no `.bo$$/index.js`
- no `.bo$$/index.d.ts`
- no JSX runtime work in the browser
- import `.bo$$/styles.css` manually

Typical output:

```css
.display\:inline-flex {
    display: inline-flex;
}
.align-items\:center {
    align-items: center;
}
.gap\:8 {
    gap: 8px;
}
.padding\:8px_12px {
    padding: 8px 12px;
}
.border-radius\:12 {
    border-radius: 12px;
}
.background-color\:\#111c31 {
    background-color: #111c31;
}
.color\:white {
    color: white;
}
.hover\:background-color\:\#15233d:hover {
    background-color: #15233d;
}
```

Use this when your styles are static and you want the smallest possible client footprint.

</details>

<details>
<summary><code>runtime</code>: runtime-only or hybrid for browser-resolved values</summary>

Use this when values must be computed in the browser. The `runtime` strategy wraps `inline-first`, `classname-first`, or
`classic`, and can run fully client-side or alongside server output.

Config:

```js
import * as jsx from 'boss-css/parser/jsx/server'
import * as css from 'boss-css/prop/css/server'
import * as pseudo from 'boss-css/prop/pseudo/server'
import * as runtime from 'boss-css/strategy/runtime/server'

export default {
    plugins: [css, pseudo, jsx, runtime],
    runtime: {
        only: true,
        strategy: 'inline-first',
    },
}
```

You write:

```tsx
<$$
    display="inline-flex"
    alignItems="center"
    gap={8}
    padding="8px 12px"
    borderRadius={12}
    backgroundColor={() => tone}
    color="white"
    hover={{ backgroundColor: () => hoverTone }}
>
    Save
</$$>
```

Boss emits:

- `.bo$$/index.js` and `.bo$$/index.d.ts`
- no server CSS in `runtime.only: true` mode unless you choose `runtime.globals: 'file'`
- runtime style injection in the browser based on the selected strategy
- hybrid mode when `runtime.only: false`, which keeps server CSS output and still evaluates dynamic props
- static `className` parsing is disabled in `runtime.only` mode

Typical browser output when `runtime.strategy` is `inline-first`:

```tsx
<div
    className="hover:background-color"
    style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 12px',
        borderRadius: '12px',
        backgroundColor: tone,
        color: 'white',
        '--hover-background-color': hoverTone,
    }}
>
    Save
</div>
```

What lands in `.bo$$/styles.css`:

- `runtime.only: true`: no strategy CSS file. Rules are injected by the runtime in the browser. If
  `runtime.globals: 'file'`, the file only contains global CSS such as reset, fontsource, and `$$.css(...)`.
- `runtime.only: false`: the file contains the same strategy CSS you would get without runtime-only. For
  `runtime.strategy: 'inline-first'`, that means:

```css
.hover\:background-color:hover {
    background-color: var(--hover-background-color);
}
```

</details>

## Compile

`boss-css compile` is a separate build step. It is not a strategy. It rewrites static `$$` JSX into plain elements,
folds Boss markers into normal DOM props, optimizes classNames and removes Boss runtime imports when they are no longer
needed.

Today, compile supports `inline-first` and `classname-first`.

Compile is bundler agnostic by design (no Babel, Webpack, Vite, etc. plugins). It is meant to run during CI, it modifies
your source code before your own build step, so ideally you do `lint` => `boss compile` => `build`.

<details open>
<summary>Compile example: static <code>$$</code> becomes a plain element</summary>

Input:

```tsx
export const Example = () => <$$ className="card" display="block" hover={{ color: 'red' }} />
```

Output:

```tsx
export const Example = () => <div className="card hover:color" style={{ display: 'block', '--hover-color': 'red' }} />
```

CSS:

```css
.hover\:color:hover {
    color: var(--hover-color);
}
```

</details>

## CSS Boundaries

Boss can split CSS output by folder boundaries instead of pushing everything into a single stylesheet.

Example layout:

```text
src/
  app/
    app.boss.css
    layout.tsx
    admin/
      admin.boss.css
      layout.tsx
  marketing/
    marketing.boss.css
    layout.tsx
```

Import each boundary where that section of the app starts:

```tsx
// src/app/layout.tsx
import './app.boss.css'

// src/app/admin/layout.tsx
import './admin.boss.css'

// src/marketing/layout.tsx
import './marketing.boss.css'
```

How it behaves:

- Keep the boundary files empty.
- Rules used by only one section stay in that section's `*.boss.css`.
- Shared rules are hoisted to the nearest common ancestor boundary or `.bo$$/styles.css`.
- This is useful when app, admin, marketing, docs, or embedded surfaces should load different CSS bundles.

Read more: https://bosscss.com/docs/recipes/css-boundaries-layout

## AI Ready

Boss can generate live project context for coding agents, not just CSS and runtime files.

The AI plugin writes:

- `.bo$$/LLMS.md`: a live markdown reference with tokens, pseudos, breakpoints, strategies, boundaries, prepared
  components, and other generated metadata
- `.bo$$/skills/`: agent skills, each with its own `SKILL.md`

Minimal setup:

```js
import * as ai from 'boss-css/ai/server'

export default {
    plugins: [
        ai,
        // ...other plugins
    ],
}
```

What makes it useful:

- `boss-css init` enables it by default
- place `ai` early if other plugins emit metadata during `onBoot`
- build, watch, PostCSS, and compile sessions keep the files updated
- plugins can publish extra agent context through `onMetaData`
- generated skills can be installed into agents directly

```bash
npx skills add "./.bo$$/skills" -a codex -a claude-code
```

If you want Boss-aware agents in a repo, this is the bridge between your live config/output and the agent prompt.

Read more: https://bosscss.com/docs/tooling/ai

## Plugin Surface

The built-in plugin set is intentionally modular.

Common plugins:

- `boss-css/parser/jsx/server`
- `boss-css/parser/classname/server`
- `boss-css/prop/css/server`
- `boss-css/prop/pseudo/server`
- `boss-css/prop/at/server`
- `boss-css/prop/child/server`
- `boss-css/prop/bosswind/server`
- `boss-css/use/token/server`
- `boss-css/strategy/inline-first/server`
- `boss-css/strategy/classname-first/server`
- `boss-css/strategy/classname-only/server`
- `boss-css/strategy/runtime/server`

There are matching browser and runtime-only modules where needed.

This makes Boss CSS good at two things:

- staying small when you only want a subset of features,
- staying extensible when you want custom prop plugins or custom non-CSS props.

## Where It Shines

If you want ideas for where Boss CSS feels strongest, start here:

- Build a typed design-system layer where primitives stay close to real CSS props.
- Migrate a utility-heavy codebase toward JSX props without abandoning className parsing.
- Keep a zero-runtime or near-zero-runtime pipeline for mostly static applications.
- Use runtime-only or hybrid mode for dashboards, editors, or theme-heavy apps with dynamic values.
- Create prepared components that feel like styled primitives without hiding the underlying prop model.
- Add a custom prop plugin for product-specific shorthands instead of encoding them in component props.
- Use Bosswind when you want Tailwind-like aliases but still want the same parser, token, and strategy system.

## Docs Map

Useful entry points:

- Quick start: https://bosscss.com/docs/getting-started/quick-start
- Configuration: https://bosscss.com/docs/getting-started/configuration
- JSX usage: https://bosscss.com/docs/usage/jsx
- ClassName syntax: https://bosscss.com/docs/usage/classname
- Tokens and theming: https://bosscss.com/docs/usage/tokens
- Bosswind: https://bosscss.com/docs/usage/bosswind
- Compile: https://bosscss.com/docs/tooling/compile
- CSS boundaries: https://bosscss.com/docs/recipes/css-boundaries-layout
- AI plugin: https://bosscss.com/docs/tooling/ai
- Prepared components: https://bosscss.com/docs/usage/prepared-components
- Composition and variants: https://bosscss.com/docs/recipes/composition-and-variants
- Runtime-only mode: https://bosscss.com/docs/recipes/runtime-only
- Custom plugins: https://bosscss.com/docs/recipes/custom-plugin

## Status

Boss CSS is still early.

Current expectations:

- APIs can change.
- Edge cases still exist in parsing and runtime behavior.
- Documentation is ahead of production hardening in some areas.
- It is better suited to experimentation, internal tools, and early adopters than broad production rollout today.

## License

MIT
