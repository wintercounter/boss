---
title: Bosswind
---

import Tabs from '@theme/Tabs'; import TabItem from '@theme/TabItem';

Bosswind is a Tailwind-style compatibility layer for Boss CSS. It keeps Boss's `prop:value` syntax, but adds
Tailwind-like aliases and boolean keywords.

In className strings, Bosswind props can be written in dash-case (for example `inline-flex`, `gap-x`, `flex-row`). In
JSX, use camelCase (`inlineFlex`, `gapX`, `flexRow`).

Bosswind preserves the alias token in emitted class selectors. For example `p={6}` emits `.p:6`, and `min-h:100vh`
emits `.min-h:100vh`.

## Setup

Bosswind needs to run before the token plugin so it can add Tailwind defaults and rewrite props.

```js
import * as bosswind from 'boss-css/prop/bosswind/server'
import * as fontsource from 'boss-css/fontsource/server'
import * as reset from 'boss-css/reset/server'
import * as token from 'boss-css/use/token/server'
import * as at from 'boss-css/prop/at/server'
import * as child from 'boss-css/prop/child/server'
import * as css from 'boss-css/prop/css/server'
import * as pseudo from 'boss-css/prop/pseudo/server'
import * as classname from 'boss-css/parser/classname/server'
import * as jsx from 'boss-css/parser/jsx/server'
import * as inlineFirst from 'boss-css/strategy/inline-first/server'

export default {
    plugins: [fontsource, reset, bosswind, token, at, child, css, pseudo, classname, jsx, inlineFirst],
}
```

## What Bosswind adds

### Boolean keywords

These are single keywords (no value) that map to CSS props. Value forms like `block:1` are invalid (use `display:block`
or the real CSS prop instead).

<Tabs>
<TabItem value="classname" label="className">

```html
<div className="block" />
<div className="inline-flex" />
<div className="absolute" />
<div className="flow-root" />
```

</TabItem>
<TabItem value="jsx" label="JSX">

```tsx
<$$ block />
<$$ inlineFlex />
<$$ absolute />
<$$ flowRoot />
```

</TabItem>
</Tabs>

### Aliases

Aliases map short names to CSS props. They work in JSX and className.

<Tabs>
<TabItem value="classname" label="className">

```html
<div className="p:4 px:6 m:2 w:64 h:12" />
<div className="gap-x:4 gap-y:2" />
<div className="rounded:lg shadow:md" />
```

</TabItem>
<TabItem value="jsx" label="JSX">

```tsx
<$$ p="4" px="6" m="2" w="64" h="12" />
<$$ gapX="4" gapY="2" />
<$$ rounded="lg" shadow="md" />
```

</TabItem>
</Tabs>

### flex/grid coexistence

Bosswind keeps the CSS `flex` and `grid` props intact, while also supporting boolean keywords:

<Tabs>
<TabItem value="classname" label="className">

```html
<div className="flex" />
<div className="flex:1" />
<div className="grid" />
```

</TabItem>
<TabItem value="jsx" label="JSX">

```tsx
<$$ flex />
<$$ flex="1" />
<$$ grid />
```

</TabItem>
</Tabs>

### Text inference

`text` resolves to `font-size` or `color` (color wins on token collisions):

- Numeric/length values => `font-size`
- `$$.token.fontSize.*` => `font-size`
- `$$.token.color.*` => `color`
- `text:gray.500` (matches `color` tokens) => `color`
- `text:sm` (matches `fontSize` tokens) => `font-size`
- CSS variables (`var(--*)`) => `color`
- Anything else => `color`

<Tabs>
<TabItem value="classname" label="className">

```html
<div className="text:sm" />
<div className="text:gray.500" />
<div className="text:14" />
```

</TabItem>
<TabItem value="jsx" label="JSX">

```tsx
<$$ text="sm" />
<$$ text="gray.500" />
<$$ text="14" />
```

</TabItem>
</Tabs>

If you need explicit control, use `fontSize:` or `color:` directly.

### Translate/scale/skew axis helpers

Axis shorthands combine into the CSS `translate`/`scale` props, and `skewX`/`skewY` build `transform` when no
`transform` is set:

<Tabs>
<TabItem value="classname" label="className">

```html
<div className="translate-x:4 translate-y:6" />
<div className="scale-x:1.1 scale-y:0.9" />
<div className="skew-x:12deg skew-y:0deg" />
```

</TabItem>
<TabItem value="jsx" label="JSX">

```tsx
<$$ translateX="4" translateY="6" />
<$$ scaleX="1.1" scaleY="0.9" />
<$$ skewX="12deg" skewY="0deg" />
```

</TabItem>
</Tabs>

If `translate`, `scale`, or `transform` are set directly, they win (axis shorthands are ignored).

## Bosswind props

The table lists JSX prop names. In className strings, use dash-case for camelCase entries (for example `inlineFlex` →
`inline-flex`, `gapX` → `gap-x`, `flexRow` → `flex-row`).

| Bosswind prop | Usage                                     | Maps to                          |
| ------------- | ----------------------------------------- | -------------------------------- |
| `p`           | `p:4`                                     | `padding`                        |
| `px`          | `px:4`                                    | `padding-left`, `padding-right`  |
| `py`          | `py:4`                                    | `padding-top`, `padding-bottom`  |
| `pt`          | `pt:4`                                    | `padding-top`                    |
| `pr`          | `pr:4`                                    | `padding-right`                  |
| `pb`          | `pb:4`                                    | `padding-bottom`                 |
| `pl`          | `pl:4`                                    | `padding-left`                   |
| `m`           | `m:4`                                     | `margin`                         |
| `mx`          | `mx:4`                                    | `margin-left`, `margin-right`    |
| `my`          | `my:4`                                    | `margin-top`, `margin-bottom`    |
| `mt`          | `mt:4`                                    | `margin-top`                     |
| `mr`          | `mr:4`                                    | `margin-right`                   |
| `mb`          | `mb:4`                                    | `margin-bottom`                  |
| `ml`          | `ml:4`                                    | `margin-left`                    |
| `gapX`        | `gapX:4`                                  | `column-gap`                     |
| `gapY`        | `gapY:4`                                  | `row-gap`                        |
| `w`           | `w:64`                                    | `width`                          |
| `h`           | `h:12`                                    | `height`                         |
| `minW`        | `minW:32`                                 | `min-width`                      |
| `minH`        | `minH:32`                                 | `min-height`                     |
| `maxW`        | `maxW:2xl`                                | `max-width`                      |
| `maxH`        | `maxH:96`                                 | `max-height`                     |
| `inset`       | `inset:4`                                 | `top`, `right`, `bottom`, `left` |
| `insetX`      | `insetX:4`                                | `left`, `right`                  |
| `insetY`      | `insetY:4`                                | `top`, `bottom`                  |
| `grow`        | `grow` / `grow:0`                         | `flex-grow`                      |
| `shrink`      | `shrink` / `shrink:0`                     | `flex-shrink`                    |
| `basis`       | `basis:1/2`                               | `flex-basis`                     |
| `items`       | `items:center`                            | `align-items`                    |
| `justify`     | `justify:between`                         | `justify-content`                |
| `self`        | `self:end`                                | `align-self`                     |
| `leading`     | `leading:6`                               | `line-height`                    |
| `tracking`    | `tracking:wide`                           | `letter-spacing`                 |
| `rounded`     | `rounded:lg`                              | `border-radius`                  |
| `shadow`      | `shadow:lg`                               | `box-shadow`                     |
| `z`           | `z:10`                                    | `z-index`                        |
| `aspect`      | `aspect:video`                            | `aspect-ratio`                   |
| `text`        | `text:sm` / `text:gray.500`               | `font-size` or `color`           |
| `bg`          | `bg:gray.500`                             | `background-color`               |
| `border`      | `border` / `border:2` / `border:gray.500` | `border-width` or `border-color` |
| `flex`        | `flex`                                    | `display: flex`                  |
| `grid`        | `grid`                                    | `display: grid`                  |
| `block`       | `block`                                   | `display: block`                 |
| `inline`      | `inline`                                  | `display: inline`                |
| `inlineBlock` | `inlineBlock`                             | `display: inline-block`          |
| `inlineFlex`  | `inlineFlex`                              | `display: inline-flex`           |
| `inlineGrid`  | `inlineGrid`                              | `display: inline-grid`           |
| `contents`    | `contents`                                | `display: contents`              |
| `flowRoot`    | `flowRoot`                                | `display: flow-root`             |
| `table`       | `table`                                   | `display: table`                 |
| `inlineTable` | `inlineTable`                             | `display: inline-table`          |
| `tableRow`    | `tableRow`                                | `display: table-row`             |
| `tableCell`   | `tableCell`                               | `display: table-cell`            |
| `static`      | `static`                                  | `position: static`               |
| `relative`    | `relative`                                | `position: relative`             |
| `absolute`    | `absolute`                                | `position: absolute`             |
| `fixed`       | `fixed`                                   | `position: fixed`                |
| `sticky`      | `sticky`                                  | `position: sticky`               |
| `flexRow`     | `flexRow`                                 | `flex-direction: row`            |
| `flexCol`     | `flexCol`                                 | `flex-direction: column`         |
| `flexWrap`    | `flexWrap`                                | `flex-wrap: wrap`                |
| `flexNoWrap`  | `flexNoWrap`                              | `flex-wrap: nowrap`              |
| `translateX`  | `translateX:4`                            | `translate: 4px 0`               |
| `translateY`  | `translateY:4`                            | `translate: 0 4px`               |
| `scaleX`      | `scaleX:1.1`                              | `scale: 1.1 1`                   |
| `scaleY`      | `scaleY:1.1`                              | `scale: 1 1.1`                   |
| `skewX`       | `skewX:12deg`                             | `transform: skewX(12deg)`        |
| `skewY`       | `skewY:12deg`                             | `transform: skewY(12deg)`        |

## Tailwind default tokens

Bosswind ships Tailwind's default theme tokens. Use token values directly via strings (no `$$.token` needed). The full
theme is merged into your tokens, and your overrides win.

Key token groups and mappings:

- `color` => `color`, `background`, `background-color`, `border-color`, `accent-color`, `caret-color`, `fill`,
  `outline-color`, `stroke`, `text-decoration-color`, `text-shadow`, `box-shadow`, `background-image`,
  `linear-gradient`, `radial-gradient`, `conic-gradient`, `filter`
- `size` => width/height/min/max/inset/top/right/bottom/left, spacing (margin/padding), translate, flex-basis, gap,
  border-spacing, scroll-margin/padding, text-indent (numeric values assume a 12px base unit)
- `grid` => `grid-column`, `grid-row`, `grid-template-columns`, `grid-template-rows`, `grid-auto-columns`,
  `grid-auto-rows`
- `duration` => `transition-duration`, `transition-delay`, `animation-duration`, `animation-delay`
- `backgroundPosition` => `background-position`, `object-position`, `transform-origin`

Duplicate scales (opacity and backdrop/filter variants) are collapsed to the base scale, and Tailwind gradient-stop
helpers (`--tw-gradient-stops`) are omitted. Color tokens also accept an alpha suffix like `gray.600/60`, which compiles
to `color-mix(in oklab, var(--color-gray-600) 60%, transparent)` (string tokens only).

Examples:

<Tabs>
<TabItem value="classname" label="className">

```html
<div className="text:sm" />
<div className="color:gray.500" />
<div className="color:gray.600/60" />
<div className="padding:4" />
```

</TabItem>
<TabItem value="jsx" label="JSX">

```tsx
<$$ text="sm" />
<$$ color="gray.500" />
<$$ color="gray.600/60" />
<$$ padding="4" />
```

</TabItem>
</Tabs>

### Visual token showcase

<style>{`
.bw-color-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
}
.bw-color-card {
  border: 1px solid var(--ifm-color-emphasis-200);
  border-radius: 12px;
  overflow: hidden;
  background: var(--ifm-background-surface-color);
}
.bw-color-title {
  padding: 10px 12px;
  font-weight: 600;
  font-size: 14px;
  text-transform: capitalize;
  background: var(--ifm-color-emphasis-100);
}
.bw-swatch {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--bw-swatch);
  font-family: var(--ifm-font-family-monospace);
  font-size: 12px;
}
.bw-swatch-value {
  opacity: 0.8;
}
.bw-swatch-label,
.bw-swatch-value {
  mix-blend-mode: difference;
}
.bw-breakpoints {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}
.bw-breakpoint-card {
  border: 1px solid var(--ifm-color-emphasis-200);
  border-radius: 12px;
  padding: 12px;
  background: var(--ifm-background-surface-color);
}
.bw-breakpoint-name {
  font-weight: 600;
  font-size: 14px;
}
.bw-breakpoint-range {
  font-family: var(--ifm-font-family-monospace);
  font-size: 12px;
  opacity: 0.8;
  margin-top: 4px;
}
.bw-breakpoint-usage {
  margin-top: 6px;
  font-size: 12px;
  opacity: 0.9;
}
.bw-chip-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
}
.bw-chip {
  border: 1px solid var(--ifm-color-emphasis-200);
  border-radius: 12px;
  padding: 12px;
  background: var(--ifm-background-surface-color);
}
.bw-chip-label {
  font-weight: 600;
  font-size: 13px;
}
.bw-chip-value {
  font-family: var(--ifm-font-family-monospace);
  font-size: 12px;
  opacity: 0.8;
}
.bw-chip-sample {
  margin-top: 6px;
}

`}</style>

#### Colors

<div className="bw-color-grid">
  <div className="bw-color-card">
    <div className="bw-color-title">black</div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#000' }}>
      <span className="bw-swatch-label">black</span>
      <span className="bw-swatch-value">#000</span>
    </div>
  </div>
  <div className="bw-color-card">
    <div className="bw-color-title">white</div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#fff' }}>
      <span className="bw-swatch-label">white</span>
      <span className="bw-swatch-value">#fff</span>
    </div>
  </div>
  <div className="bw-color-card">
    <div className="bw-color-title">slate</div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#f8fafc' }}>
      <span className="bw-swatch-label">50</span>
      <span className="bw-swatch-value">#f8fafc</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#f1f5f9' }}>
      <span className="bw-swatch-label">100</span>
      <span className="bw-swatch-value">#f1f5f9</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#e2e8f0' }}>
      <span className="bw-swatch-label">200</span>
      <span className="bw-swatch-value">#e2e8f0</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#cbd5e1' }}>
      <span className="bw-swatch-label">300</span>
      <span className="bw-swatch-value">#cbd5e1</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#94a3b8', color: '#fff' }}>
      <span className="bw-swatch-label">400</span>
      <span className="bw-swatch-value">#94a3b8</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#64748b', color: '#fff' }}>
      <span className="bw-swatch-label">500</span>
      <span className="bw-swatch-value">#64748b</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#475569', color: '#fff' }}>
      <span className="bw-swatch-label">600</span>
      <span className="bw-swatch-value">#475569</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#334155', color: '#fff' }}>
      <span className="bw-swatch-label">700</span>
      <span className="bw-swatch-value">#334155</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#1e293b', color: '#fff' }}>
      <span className="bw-swatch-label">800</span>
      <span className="bw-swatch-value">#1e293b</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#0f172a', color: '#fff' }}>
      <span className="bw-swatch-label">900</span>
      <span className="bw-swatch-value">#0f172a</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#020617', color: '#fff' }}>
      <span className="bw-swatch-label">950</span>
      <span className="bw-swatch-value">#020617</span>
    </div>
  </div>
  <div className="bw-color-card">
    <div className="bw-color-title">gray</div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#f9fafb' }}>
      <span className="bw-swatch-label">50</span>
      <span className="bw-swatch-value">#f9fafb</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#f3f4f6' }}>
      <span className="bw-swatch-label">100</span>
      <span className="bw-swatch-value">#f3f4f6</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#e5e7eb' }}>
      <span className="bw-swatch-label">200</span>
      <span className="bw-swatch-value">#e5e7eb</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#d1d5db' }}>
      <span className="bw-swatch-label">300</span>
      <span className="bw-swatch-value">#d1d5db</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#9ca3af', color: '#fff' }}>
      <span className="bw-swatch-label">400</span>
      <span className="bw-swatch-value">#9ca3af</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#6b7280', color: '#fff' }}>
      <span className="bw-swatch-label">500</span>
      <span className="bw-swatch-value">#6b7280</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#4b5563', color: '#fff' }}>
      <span className="bw-swatch-label">600</span>
      <span className="bw-swatch-value">#4b5563</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#374151', color: '#fff' }}>
      <span className="bw-swatch-label">700</span>
      <span className="bw-swatch-value">#374151</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#1f2937', color: '#fff' }}>
      <span className="bw-swatch-label">800</span>
      <span className="bw-swatch-value">#1f2937</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#111827', color: '#fff' }}>
      <span className="bw-swatch-label">900</span>
      <span className="bw-swatch-value">#111827</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#030712', color: '#fff' }}>
      <span className="bw-swatch-label">950</span>
      <span className="bw-swatch-value">#030712</span>
    </div>
  </div>
  <div className="bw-color-card">
    <div className="bw-color-title">zinc</div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#fafafa' }}>
      <span className="bw-swatch-label">50</span>
      <span className="bw-swatch-value">#fafafa</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#f4f4f5' }}>
      <span className="bw-swatch-label">100</span>
      <span className="bw-swatch-value">#f4f4f5</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#e4e4e7' }}>
      <span className="bw-swatch-label">200</span>
      <span className="bw-swatch-value">#e4e4e7</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#d4d4d8' }}>
      <span className="bw-swatch-label">300</span>
      <span className="bw-swatch-value">#d4d4d8</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#a1a1aa', color: '#fff' }}>
      <span className="bw-swatch-label">400</span>
      <span className="bw-swatch-value">#a1a1aa</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#71717a', color: '#fff' }}>
      <span className="bw-swatch-label">500</span>
      <span className="bw-swatch-value">#71717a</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#52525b', color: '#fff' }}>
      <span className="bw-swatch-label">600</span>
      <span className="bw-swatch-value">#52525b</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#3f3f46', color: '#fff' }}>
      <span className="bw-swatch-label">700</span>
      <span className="bw-swatch-value">#3f3f46</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#27272a', color: '#fff' }}>
      <span className="bw-swatch-label">800</span>
      <span className="bw-swatch-value">#27272a</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#18181b', color: '#fff' }}>
      <span className="bw-swatch-label">900</span>
      <span className="bw-swatch-value">#18181b</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#09090b', color: '#fff' }}>
      <span className="bw-swatch-label">950</span>
      <span className="bw-swatch-value">#09090b</span>
    </div>
  </div>
  <div className="bw-color-card">
    <div className="bw-color-title">neutral</div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#fafafa' }}>
      <span className="bw-swatch-label">50</span>
      <span className="bw-swatch-value">#fafafa</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#f5f5f5' }}>
      <span className="bw-swatch-label">100</span>
      <span className="bw-swatch-value">#f5f5f5</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#e5e5e5' }}>
      <span className="bw-swatch-label">200</span>
      <span className="bw-swatch-value">#e5e5e5</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#d4d4d4' }}>
      <span className="bw-swatch-label">300</span>
      <span className="bw-swatch-value">#d4d4d4</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#a3a3a3', color: '#fff' }}>
      <span className="bw-swatch-label">400</span>
      <span className="bw-swatch-value">#a3a3a3</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#737373', color: '#fff' }}>
      <span className="bw-swatch-label">500</span>
      <span className="bw-swatch-value">#737373</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#525252', color: '#fff' }}>
      <span className="bw-swatch-label">600</span>
      <span className="bw-swatch-value">#525252</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#404040', color: '#fff' }}>
      <span className="bw-swatch-label">700</span>
      <span className="bw-swatch-value">#404040</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#262626', color: '#fff' }}>
      <span className="bw-swatch-label">800</span>
      <span className="bw-swatch-value">#262626</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#171717', color: '#fff' }}>
      <span className="bw-swatch-label">900</span>
      <span className="bw-swatch-value">#171717</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#0a0a0a', color: '#fff' }}>
      <span className="bw-swatch-label">950</span>
      <span className="bw-swatch-value">#0a0a0a</span>
    </div>
  </div>
  <div className="bw-color-card">
    <div className="bw-color-title">stone</div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#fafaf9' }}>
      <span className="bw-swatch-label">50</span>
      <span className="bw-swatch-value">#fafaf9</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#f5f5f4' }}>
      <span className="bw-swatch-label">100</span>
      <span className="bw-swatch-value">#f5f5f4</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#e7e5e4' }}>
      <span className="bw-swatch-label">200</span>
      <span className="bw-swatch-value">#e7e5e4</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#d6d3d1' }}>
      <span className="bw-swatch-label">300</span>
      <span className="bw-swatch-value">#d6d3d1</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#a8a29e', color: '#fff' }}>
      <span className="bw-swatch-label">400</span>
      <span className="bw-swatch-value">#a8a29e</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#78716c', color: '#fff' }}>
      <span className="bw-swatch-label">500</span>
      <span className="bw-swatch-value">#78716c</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#57534e', color: '#fff' }}>
      <span className="bw-swatch-label">600</span>
      <span className="bw-swatch-value">#57534e</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#44403c', color: '#fff' }}>
      <span className="bw-swatch-label">700</span>
      <span className="bw-swatch-value">#44403c</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#292524', color: '#fff' }}>
      <span className="bw-swatch-label">800</span>
      <span className="bw-swatch-value">#292524</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#1c1917', color: '#fff' }}>
      <span className="bw-swatch-label">900</span>
      <span className="bw-swatch-value">#1c1917</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#0c0a09', color: '#fff' }}>
      <span className="bw-swatch-label">950</span>
      <span className="bw-swatch-value">#0c0a09</span>
    </div>
  </div>
  <div className="bw-color-card">
    <div className="bw-color-title">red</div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#fef2f2' }}>
      <span className="bw-swatch-label">50</span>
      <span className="bw-swatch-value">#fef2f2</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#fee2e2' }}>
      <span className="bw-swatch-label">100</span>
      <span className="bw-swatch-value">#fee2e2</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#fecaca' }}>
      <span className="bw-swatch-label">200</span>
      <span className="bw-swatch-value">#fecaca</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#fca5a5' }}>
      <span className="bw-swatch-label">300</span>
      <span className="bw-swatch-value">#fca5a5</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#f87171', color: '#fff' }}>
      <span className="bw-swatch-label">400</span>
      <span className="bw-swatch-value">#f87171</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#ef4444', color: '#fff' }}>
      <span className="bw-swatch-label">500</span>
      <span className="bw-swatch-value">#ef4444</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#dc2626', color: '#fff' }}>
      <span className="bw-swatch-label">600</span>
      <span className="bw-swatch-value">#dc2626</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#b91c1c', color: '#fff' }}>
      <span className="bw-swatch-label">700</span>
      <span className="bw-swatch-value">#b91c1c</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#991b1b', color: '#fff' }}>
      <span className="bw-swatch-label">800</span>
      <span className="bw-swatch-value">#991b1b</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#7f1d1d', color: '#fff' }}>
      <span className="bw-swatch-label">900</span>
      <span className="bw-swatch-value">#7f1d1d</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#450a0a', color: '#fff' }}>
      <span className="bw-swatch-label">950</span>
      <span className="bw-swatch-value">#450a0a</span>
    </div>
  </div>
  <div className="bw-color-card">
    <div className="bw-color-title">orange</div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#fff7ed' }}>
      <span className="bw-swatch-label">50</span>
      <span className="bw-swatch-value">#fff7ed</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#ffedd5' }}>
      <span className="bw-swatch-label">100</span>
      <span className="bw-swatch-value">#ffedd5</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#fed7aa' }}>
      <span className="bw-swatch-label">200</span>
      <span className="bw-swatch-value">#fed7aa</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#fdba74' }}>
      <span className="bw-swatch-label">300</span>
      <span className="bw-swatch-value">#fdba74</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#fb923c' }}>
      <span className="bw-swatch-label">400</span>
      <span className="bw-swatch-value">#fb923c</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#f97316', color: '#fff' }}>
      <span className="bw-swatch-label">500</span>
      <span className="bw-swatch-value">#f97316</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#ea580c', color: '#fff' }}>
      <span className="bw-swatch-label">600</span>
      <span className="bw-swatch-value">#ea580c</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#c2410c', color: '#fff' }}>
      <span className="bw-swatch-label">700</span>
      <span className="bw-swatch-value">#c2410c</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#9a3412', color: '#fff' }}>
      <span className="bw-swatch-label">800</span>
      <span className="bw-swatch-value">#9a3412</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#7c2d12', color: '#fff' }}>
      <span className="bw-swatch-label">900</span>
      <span className="bw-swatch-value">#7c2d12</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#431407', color: '#fff' }}>
      <span className="bw-swatch-label">950</span>
      <span className="bw-swatch-value">#431407</span>
    </div>
  </div>
  <div className="bw-color-card">
    <div className="bw-color-title">amber</div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#fffbeb' }}>
      <span className="bw-swatch-label">50</span>
      <span className="bw-swatch-value">#fffbeb</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#fef3c7' }}>
      <span className="bw-swatch-label">100</span>
      <span className="bw-swatch-value">#fef3c7</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#fde68a' }}>
      <span className="bw-swatch-label">200</span>
      <span className="bw-swatch-value">#fde68a</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#fcd34d' }}>
      <span className="bw-swatch-label">300</span>
      <span className="bw-swatch-value">#fcd34d</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#fbbf24' }}>
      <span className="bw-swatch-label">400</span>
      <span className="bw-swatch-value">#fbbf24</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#f59e0b' }}>
      <span className="bw-swatch-label">500</span>
      <span className="bw-swatch-value">#f59e0b</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#d97706', color: '#fff' }}>
      <span className="bw-swatch-label">600</span>
      <span className="bw-swatch-value">#d97706</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#b45309', color: '#fff' }}>
      <span className="bw-swatch-label">700</span>
      <span className="bw-swatch-value">#b45309</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#92400e', color: '#fff' }}>
      <span className="bw-swatch-label">800</span>
      <span className="bw-swatch-value">#92400e</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#78350f', color: '#fff' }}>
      <span className="bw-swatch-label">900</span>
      <span className="bw-swatch-value">#78350f</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#451a03', color: '#fff' }}>
      <span className="bw-swatch-label">950</span>
      <span className="bw-swatch-value">#451a03</span>
    </div>
  </div>
  <div className="bw-color-card">
    <div className="bw-color-title">yellow</div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#fefce8' }}>
      <span className="bw-swatch-label">50</span>
      <span className="bw-swatch-value">#fefce8</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#fef9c3' }}>
      <span className="bw-swatch-label">100</span>
      <span className="bw-swatch-value">#fef9c3</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#fef08a' }}>
      <span className="bw-swatch-label">200</span>
      <span className="bw-swatch-value">#fef08a</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#fde047' }}>
      <span className="bw-swatch-label">300</span>
      <span className="bw-swatch-value">#fde047</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#facc15' }}>
      <span className="bw-swatch-label">400</span>
      <span className="bw-swatch-value">#facc15</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#eab308' }}>
      <span className="bw-swatch-label">500</span>
      <span className="bw-swatch-value">#eab308</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#ca8a04', color: '#fff' }}>
      <span className="bw-swatch-label">600</span>
      <span className="bw-swatch-value">#ca8a04</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#a16207', color: '#fff' }}>
      <span className="bw-swatch-label">700</span>
      <span className="bw-swatch-value">#a16207</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#854d0e', color: '#fff' }}>
      <span className="bw-swatch-label">800</span>
      <span className="bw-swatch-value">#854d0e</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#713f12', color: '#fff' }}>
      <span className="bw-swatch-label">900</span>
      <span className="bw-swatch-value">#713f12</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#422006', color: '#fff' }}>
      <span className="bw-swatch-label">950</span>
      <span className="bw-swatch-value">#422006</span>
    </div>
  </div>
  <div className="bw-color-card">
    <div className="bw-color-title">lime</div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#f7fee7' }}>
      <span className="bw-swatch-label">50</span>
      <span className="bw-swatch-value">#f7fee7</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#ecfccb' }}>
      <span className="bw-swatch-label">100</span>
      <span className="bw-swatch-value">#ecfccb</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#d9f99d' }}>
      <span className="bw-swatch-label">200</span>
      <span className="bw-swatch-value">#d9f99d</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#bef264' }}>
      <span className="bw-swatch-label">300</span>
      <span className="bw-swatch-value">#bef264</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#a3e635' }}>
      <span className="bw-swatch-label">400</span>
      <span className="bw-swatch-value">#a3e635</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#84cc16' }}>
      <span className="bw-swatch-label">500</span>
      <span className="bw-swatch-value">#84cc16</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#65a30d', color: '#fff' }}>
      <span className="bw-swatch-label">600</span>
      <span className="bw-swatch-value">#65a30d</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#4d7c0f', color: '#fff' }}>
      <span className="bw-swatch-label">700</span>
      <span className="bw-swatch-value">#4d7c0f</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#3f6212', color: '#fff' }}>
      <span className="bw-swatch-label">800</span>
      <span className="bw-swatch-value">#3f6212</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#365314', color: '#fff' }}>
      <span className="bw-swatch-label">900</span>
      <span className="bw-swatch-value">#365314</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#1a2e05', color: '#fff' }}>
      <span className="bw-swatch-label">950</span>
      <span className="bw-swatch-value">#1a2e05</span>
    </div>
  </div>
  <div className="bw-color-card">
    <div className="bw-color-title">green</div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#f0fdf4' }}>
      <span className="bw-swatch-label">50</span>
      <span className="bw-swatch-value">#f0fdf4</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#dcfce7' }}>
      <span className="bw-swatch-label">100</span>
      <span className="bw-swatch-value">#dcfce7</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#bbf7d0' }}>
      <span className="bw-swatch-label">200</span>
      <span className="bw-swatch-value">#bbf7d0</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#86efac' }}>
      <span className="bw-swatch-label">300</span>
      <span className="bw-swatch-value">#86efac</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#4ade80' }}>
      <span className="bw-swatch-label">400</span>
      <span className="bw-swatch-value">#4ade80</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#22c55e' }}>
      <span className="bw-swatch-label">500</span>
      <span className="bw-swatch-value">#22c55e</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#16a34a', color: '#fff' }}>
      <span className="bw-swatch-label">600</span>
      <span className="bw-swatch-value">#16a34a</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#15803d', color: '#fff' }}>
      <span className="bw-swatch-label">700</span>
      <span className="bw-swatch-value">#15803d</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#166534', color: '#fff' }}>
      <span className="bw-swatch-label">800</span>
      <span className="bw-swatch-value">#166534</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#14532d', color: '#fff' }}>
      <span className="bw-swatch-label">900</span>
      <span className="bw-swatch-value">#14532d</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#052e16', color: '#fff' }}>
      <span className="bw-swatch-label">950</span>
      <span className="bw-swatch-value">#052e16</span>
    </div>
  </div>
  <div className="bw-color-card">
    <div className="bw-color-title">emerald</div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#ecfdf5' }}>
      <span className="bw-swatch-label">50</span>
      <span className="bw-swatch-value">#ecfdf5</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#d1fae5' }}>
      <span className="bw-swatch-label">100</span>
      <span className="bw-swatch-value">#d1fae5</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#a7f3d0' }}>
      <span className="bw-swatch-label">200</span>
      <span className="bw-swatch-value">#a7f3d0</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#6ee7b7' }}>
      <span className="bw-swatch-label">300</span>
      <span className="bw-swatch-value">#6ee7b7</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#34d399' }}>
      <span className="bw-swatch-label">400</span>
      <span className="bw-swatch-value">#34d399</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#10b981', color: '#fff' }}>
      <span className="bw-swatch-label">500</span>
      <span className="bw-swatch-value">#10b981</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#059669', color: '#fff' }}>
      <span className="bw-swatch-label">600</span>
      <span className="bw-swatch-value">#059669</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#047857', color: '#fff' }}>
      <span className="bw-swatch-label">700</span>
      <span className="bw-swatch-value">#047857</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#065f46', color: '#fff' }}>
      <span className="bw-swatch-label">800</span>
      <span className="bw-swatch-value">#065f46</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#064e3b', color: '#fff' }}>
      <span className="bw-swatch-label">900</span>
      <span className="bw-swatch-value">#064e3b</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#022c22', color: '#fff' }}>
      <span className="bw-swatch-label">950</span>
      <span className="bw-swatch-value">#022c22</span>
    </div>
  </div>
  <div className="bw-color-card">
    <div className="bw-color-title">teal</div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#f0fdfa' }}>
      <span className="bw-swatch-label">50</span>
      <span className="bw-swatch-value">#f0fdfa</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#ccfbf1' }}>
      <span className="bw-swatch-label">100</span>
      <span className="bw-swatch-value">#ccfbf1</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#99f6e4' }}>
      <span className="bw-swatch-label">200</span>
      <span className="bw-swatch-value">#99f6e4</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#5eead4' }}>
      <span className="bw-swatch-label">300</span>
      <span className="bw-swatch-value">#5eead4</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#2dd4bf' }}>
      <span className="bw-swatch-label">400</span>
      <span className="bw-swatch-value">#2dd4bf</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#14b8a6', color: '#fff' }}>
      <span className="bw-swatch-label">500</span>
      <span className="bw-swatch-value">#14b8a6</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#0d9488', color: '#fff' }}>
      <span className="bw-swatch-label">600</span>
      <span className="bw-swatch-value">#0d9488</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#0f766e', color: '#fff' }}>
      <span className="bw-swatch-label">700</span>
      <span className="bw-swatch-value">#0f766e</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#115e59', color: '#fff' }}>
      <span className="bw-swatch-label">800</span>
      <span className="bw-swatch-value">#115e59</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#134e4a', color: '#fff' }}>
      <span className="bw-swatch-label">900</span>
      <span className="bw-swatch-value">#134e4a</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#042f2e', color: '#fff' }}>
      <span className="bw-swatch-label">950</span>
      <span className="bw-swatch-value">#042f2e</span>
    </div>
  </div>
  <div className="bw-color-card">
    <div className="bw-color-title">cyan</div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#ecfeff' }}>
      <span className="bw-swatch-label">50</span>
      <span className="bw-swatch-value">#ecfeff</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#cffafe' }}>
      <span className="bw-swatch-label">100</span>
      <span className="bw-swatch-value">#cffafe</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#a5f3fc' }}>
      <span className="bw-swatch-label">200</span>
      <span className="bw-swatch-value">#a5f3fc</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#67e8f9' }}>
      <span className="bw-swatch-label">300</span>
      <span className="bw-swatch-value">#67e8f9</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#22d3ee' }}>
      <span className="bw-swatch-label">400</span>
      <span className="bw-swatch-value">#22d3ee</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#06b6d4', color: '#fff' }}>
      <span className="bw-swatch-label">500</span>
      <span className="bw-swatch-value">#06b6d4</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#0891b2', color: '#fff' }}>
      <span className="bw-swatch-label">600</span>
      <span className="bw-swatch-value">#0891b2</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#0e7490', color: '#fff' }}>
      <span className="bw-swatch-label">700</span>
      <span className="bw-swatch-value">#0e7490</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#155e75', color: '#fff' }}>
      <span className="bw-swatch-label">800</span>
      <span className="bw-swatch-value">#155e75</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#164e63', color: '#fff' }}>
      <span className="bw-swatch-label">900</span>
      <span className="bw-swatch-value">#164e63</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#083344', color: '#fff' }}>
      <span className="bw-swatch-label">950</span>
      <span className="bw-swatch-value">#083344</span>
    </div>
  </div>
  <div className="bw-color-card">
    <div className="bw-color-title">sky</div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#f0f9ff' }}>
      <span className="bw-swatch-label">50</span>
      <span className="bw-swatch-value">#f0f9ff</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#e0f2fe' }}>
      <span className="bw-swatch-label">100</span>
      <span className="bw-swatch-value">#e0f2fe</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#bae6fd' }}>
      <span className="bw-swatch-label">200</span>
      <span className="bw-swatch-value">#bae6fd</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#7dd3fc' }}>
      <span className="bw-swatch-label">300</span>
      <span className="bw-swatch-value">#7dd3fc</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#38bdf8' }}>
      <span className="bw-swatch-label">400</span>
      <span className="bw-swatch-value">#38bdf8</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#0ea5e9', color: '#fff' }}>
      <span className="bw-swatch-label">500</span>
      <span className="bw-swatch-value">#0ea5e9</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#0284c7', color: '#fff' }}>
      <span className="bw-swatch-label">600</span>
      <span className="bw-swatch-value">#0284c7</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#0369a1', color: '#fff' }}>
      <span className="bw-swatch-label">700</span>
      <span className="bw-swatch-value">#0369a1</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#075985', color: '#fff' }}>
      <span className="bw-swatch-label">800</span>
      <span className="bw-swatch-value">#075985</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#0c4a6e', color: '#fff' }}>
      <span className="bw-swatch-label">900</span>
      <span className="bw-swatch-value">#0c4a6e</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#082f49', color: '#fff' }}>
      <span className="bw-swatch-label">950</span>
      <span className="bw-swatch-value">#082f49</span>
    </div>
  </div>
  <div className="bw-color-card">
    <div className="bw-color-title">blue</div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#eff6ff' }}>
      <span className="bw-swatch-label">50</span>
      <span className="bw-swatch-value">#eff6ff</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#dbeafe' }}>
      <span className="bw-swatch-label">100</span>
      <span className="bw-swatch-value">#dbeafe</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#bfdbfe' }}>
      <span className="bw-swatch-label">200</span>
      <span className="bw-swatch-value">#bfdbfe</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#93c5fd' }}>
      <span className="bw-swatch-label">300</span>
      <span className="bw-swatch-value">#93c5fd</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#60a5fa', color: '#fff' }}>
      <span className="bw-swatch-label">400</span>
      <span className="bw-swatch-value">#60a5fa</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#3b82f6', color: '#fff' }}>
      <span className="bw-swatch-label">500</span>
      <span className="bw-swatch-value">#3b82f6</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#2563eb', color: '#fff' }}>
      <span className="bw-swatch-label">600</span>
      <span className="bw-swatch-value">#2563eb</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#1d4ed8', color: '#fff' }}>
      <span className="bw-swatch-label">700</span>
      <span className="bw-swatch-value">#1d4ed8</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#1e40af', color: '#fff' }}>
      <span className="bw-swatch-label">800</span>
      <span className="bw-swatch-value">#1e40af</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#1e3a8a', color: '#fff' }}>
      <span className="bw-swatch-label">900</span>
      <span className="bw-swatch-value">#1e3a8a</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#172554', color: '#fff' }}>
      <span className="bw-swatch-label">950</span>
      <span className="bw-swatch-value">#172554</span>
    </div>
  </div>
  <div className="bw-color-card">
    <div className="bw-color-title">indigo</div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#eef2ff' }}>
      <span className="bw-swatch-label">50</span>
      <span className="bw-swatch-value">#eef2ff</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#e0e7ff' }}>
      <span className="bw-swatch-label">100</span>
      <span className="bw-swatch-value">#e0e7ff</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#c7d2fe' }}>
      <span className="bw-swatch-label">200</span>
      <span className="bw-swatch-value">#c7d2fe</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#a5b4fc' }}>
      <span className="bw-swatch-label">300</span>
      <span className="bw-swatch-value">#a5b4fc</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#818cf8', color: '#fff' }}>
      <span className="bw-swatch-label">400</span>
      <span className="bw-swatch-value">#818cf8</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#6366f1', color: '#fff' }}>
      <span className="bw-swatch-label">500</span>
      <span className="bw-swatch-value">#6366f1</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#4f46e5', color: '#fff' }}>
      <span className="bw-swatch-label">600</span>
      <span className="bw-swatch-value">#4f46e5</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#4338ca', color: '#fff' }}>
      <span className="bw-swatch-label">700</span>
      <span className="bw-swatch-value">#4338ca</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#3730a3', color: '#fff' }}>
      <span className="bw-swatch-label">800</span>
      <span className="bw-swatch-value">#3730a3</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#312e81', color: '#fff' }}>
      <span className="bw-swatch-label">900</span>
      <span className="bw-swatch-value">#312e81</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#1e1b4b', color: '#fff' }}>
      <span className="bw-swatch-label">950</span>
      <span className="bw-swatch-value">#1e1b4b</span>
    </div>
  </div>
  <div className="bw-color-card">
    <div className="bw-color-title">violet</div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#f5f3ff' }}>
      <span className="bw-swatch-label">50</span>
      <span className="bw-swatch-value">#f5f3ff</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#ede9fe' }}>
      <span className="bw-swatch-label">100</span>
      <span className="bw-swatch-value">#ede9fe</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#ddd6fe' }}>
      <span className="bw-swatch-label">200</span>
      <span className="bw-swatch-value">#ddd6fe</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#c4b5fd' }}>
      <span className="bw-swatch-label">300</span>
      <span className="bw-swatch-value">#c4b5fd</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#a78bfa', color: '#fff' }}>
      <span className="bw-swatch-label">400</span>
      <span className="bw-swatch-value">#a78bfa</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#8b5cf6', color: '#fff' }}>
      <span className="bw-swatch-label">500</span>
      <span className="bw-swatch-value">#8b5cf6</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#7c3aed', color: '#fff' }}>
      <span className="bw-swatch-label">600</span>
      <span className="bw-swatch-value">#7c3aed</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#6d28d9', color: '#fff' }}>
      <span className="bw-swatch-label">700</span>
      <span className="bw-swatch-value">#6d28d9</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#5b21b6', color: '#fff' }}>
      <span className="bw-swatch-label">800</span>
      <span className="bw-swatch-value">#5b21b6</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#4c1d95', color: '#fff' }}>
      <span className="bw-swatch-label">900</span>
      <span className="bw-swatch-value">#4c1d95</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#2e1065', color: '#fff' }}>
      <span className="bw-swatch-label">950</span>
      <span className="bw-swatch-value">#2e1065</span>
    </div>
  </div>
  <div className="bw-color-card">
    <div className="bw-color-title">purple</div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#faf5ff' }}>
      <span className="bw-swatch-label">50</span>
      <span className="bw-swatch-value">#faf5ff</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#f3e8ff' }}>
      <span className="bw-swatch-label">100</span>
      <span className="bw-swatch-value">#f3e8ff</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#e9d5ff' }}>
      <span className="bw-swatch-label">200</span>
      <span className="bw-swatch-value">#e9d5ff</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#d8b4fe' }}>
      <span className="bw-swatch-label">300</span>
      <span className="bw-swatch-value">#d8b4fe</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#c084fc', color: '#fff' }}>
      <span className="bw-swatch-label">400</span>
      <span className="bw-swatch-value">#c084fc</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#a855f7', color: '#fff' }}>
      <span className="bw-swatch-label">500</span>
      <span className="bw-swatch-value">#a855f7</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#9333ea', color: '#fff' }}>
      <span className="bw-swatch-label">600</span>
      <span className="bw-swatch-value">#9333ea</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#7e22ce', color: '#fff' }}>
      <span className="bw-swatch-label">700</span>
      <span className="bw-swatch-value">#7e22ce</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#6b21a8', color: '#fff' }}>
      <span className="bw-swatch-label">800</span>
      <span className="bw-swatch-value">#6b21a8</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#581c87', color: '#fff' }}>
      <span className="bw-swatch-label">900</span>
      <span className="bw-swatch-value">#581c87</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#3b0764', color: '#fff' }}>
      <span className="bw-swatch-label">950</span>
      <span className="bw-swatch-value">#3b0764</span>
    </div>
  </div>
  <div className="bw-color-card">
    <div className="bw-color-title">fuchsia</div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#fdf4ff' }}>
      <span className="bw-swatch-label">50</span>
      <span className="bw-swatch-value">#fdf4ff</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#fae8ff' }}>
      <span className="bw-swatch-label">100</span>
      <span className="bw-swatch-value">#fae8ff</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#f5d0fe' }}>
      <span className="bw-swatch-label">200</span>
      <span className="bw-swatch-value">#f5d0fe</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#f0abfc' }}>
      <span className="bw-swatch-label">300</span>
      <span className="bw-swatch-value">#f0abfc</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#e879f9', color: '#fff' }}>
      <span className="bw-swatch-label">400</span>
      <span className="bw-swatch-value">#e879f9</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#d946ef', color: '#fff' }}>
      <span className="bw-swatch-label">500</span>
      <span className="bw-swatch-value">#d946ef</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#c026d3', color: '#fff' }}>
      <span className="bw-swatch-label">600</span>
      <span className="bw-swatch-value">#c026d3</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#a21caf', color: '#fff' }}>
      <span className="bw-swatch-label">700</span>
      <span className="bw-swatch-value">#a21caf</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#86198f', color: '#fff' }}>
      <span className="bw-swatch-label">800</span>
      <span className="bw-swatch-value">#86198f</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#701a75', color: '#fff' }}>
      <span className="bw-swatch-label">900</span>
      <span className="bw-swatch-value">#701a75</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#4a044e', color: '#fff' }}>
      <span className="bw-swatch-label">950</span>
      <span className="bw-swatch-value">#4a044e</span>
    </div>
  </div>
  <div className="bw-color-card">
    <div className="bw-color-title">pink</div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#fdf2f8' }}>
      <span className="bw-swatch-label">50</span>
      <span className="bw-swatch-value">#fdf2f8</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#fce7f3' }}>
      <span className="bw-swatch-label">100</span>
      <span className="bw-swatch-value">#fce7f3</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#fbcfe8' }}>
      <span className="bw-swatch-label">200</span>
      <span className="bw-swatch-value">#fbcfe8</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#f9a8d4' }}>
      <span className="bw-swatch-label">300</span>
      <span className="bw-swatch-value">#f9a8d4</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#f472b6', color: '#fff' }}>
      <span className="bw-swatch-label">400</span>
      <span className="bw-swatch-value">#f472b6</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#ec4899', color: '#fff' }}>
      <span className="bw-swatch-label">500</span>
      <span className="bw-swatch-value">#ec4899</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#db2777', color: '#fff' }}>
      <span className="bw-swatch-label">600</span>
      <span className="bw-swatch-value">#db2777</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#be185d', color: '#fff' }}>
      <span className="bw-swatch-label">700</span>
      <span className="bw-swatch-value">#be185d</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#9d174d', color: '#fff' }}>
      <span className="bw-swatch-label">800</span>
      <span className="bw-swatch-value">#9d174d</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#831843', color: '#fff' }}>
      <span className="bw-swatch-label">900</span>
      <span className="bw-swatch-value">#831843</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#500724', color: '#fff' }}>
      <span className="bw-swatch-label">950</span>
      <span className="bw-swatch-value">#500724</span>
    </div>
  </div>
  <div className="bw-color-card">
    <div className="bw-color-title">rose</div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#fff1f2' }}>
      <span className="bw-swatch-label">50</span>
      <span className="bw-swatch-value">#fff1f2</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#ffe4e6' }}>
      <span className="bw-swatch-label">100</span>
      <span className="bw-swatch-value">#ffe4e6</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#fecdd3' }}>
      <span className="bw-swatch-label">200</span>
      <span className="bw-swatch-value">#fecdd3</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#fda4af' }}>
      <span className="bw-swatch-label">300</span>
      <span className="bw-swatch-value">#fda4af</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#fb7185', color: '#fff' }}>
      <span className="bw-swatch-label">400</span>
      <span className="bw-swatch-value">#fb7185</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#f43f5e', color: '#fff' }}>
      <span className="bw-swatch-label">500</span>
      <span className="bw-swatch-value">#f43f5e</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#e11d48', color: '#fff' }}>
      <span className="bw-swatch-label">600</span>
      <span className="bw-swatch-value">#e11d48</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#be123c', color: '#fff' }}>
      <span className="bw-swatch-label">700</span>
      <span className="bw-swatch-value">#be123c</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#9f1239', color: '#fff' }}>
      <span className="bw-swatch-label">800</span>
      <span className="bw-swatch-value">#9f1239</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#881337', color: '#fff' }}>
      <span className="bw-swatch-label">900</span>
      <span className="bw-swatch-value">#881337</span>
    </div>
    <div className="bw-swatch" style={{ '--bw-swatch': '#4c0519', color: '#fff' }}>
      <span className="bw-swatch-label">950</span>
      <span className="bw-swatch-value">#4c0519</span>
    </div>
  </div>
</div>

#### Breakpoints (@at defaults)

Bosswind uses the core `@at` breakpoint defaults shown below. Use `+` for min-width, `-` for max-width, or combine
ranges.

<div className="bw-breakpoints">
  <div className="bw-breakpoint-card">
    <div className="bw-breakpoint-name">micro</div>
    <div className="bw-breakpoint-range">≤ 375px</div>
    <div className="bw-breakpoint-usage">micro / micro-</div>
  </div>
  <div className="bw-breakpoint-card">
    <div className="bw-breakpoint-name">mobile</div>
    <div className="bw-breakpoint-range">376–639px</div>
    <div className="bw-breakpoint-usage">mobile / mobile+ / mobile-</div>
  </div>
  <div className="bw-breakpoint-card">
    <div className="bw-breakpoint-name">tablet</div>
    <div className="bw-breakpoint-range">640–1023px</div>
    <div className="bw-breakpoint-usage">tablet / tablet+ / tablet-</div>
  </div>
  <div className="bw-breakpoint-card">
    <div className="bw-breakpoint-name">small</div>
    <div className="bw-breakpoint-range">1024–1439px</div>
    <div className="bw-breakpoint-usage">small / small+ / small-</div>
  </div>
  <div className="bw-breakpoint-card">
    <div className="bw-breakpoint-name">medium</div>
    <div className="bw-breakpoint-range">1440–1919px</div>
    <div className="bw-breakpoint-usage">medium / medium+ / medium-</div>
  </div>
  <div className="bw-breakpoint-card">
    <div className="bw-breakpoint-name">large</div>
    <div className="bw-breakpoint-range">≥ 1920px</div>
    <div className="bw-breakpoint-usage">large / large+</div>
  </div>
  <div className="bw-breakpoint-card">
    <div className="bw-breakpoint-name">device</div>
    <div className="bw-breakpoint-range">≤ 1023px</div>
    <div className="bw-breakpoint-usage">device / device-</div>
  </div>
</div>

#### Font sizes

<div className="bw-chip-grid">
  <div className="bw-chip">
    <div className="bw-chip-label">xs</div>
    <div className="bw-chip-value">9px</div>
    <div className="bw-chip-sample" style={{ fontSize: '9px' }}>Aa</div>
  </div>
  <div className="bw-chip">
    <div className="bw-chip-label">sm</div>
    <div className="bw-chip-value">10.5px</div>
    <div className="bw-chip-sample" style={{ fontSize: '10.5px' }}>Aa</div>
  </div>
  <div className="bw-chip">
    <div className="bw-chip-label">base</div>
    <div className="bw-chip-value">12px</div>
    <div className="bw-chip-sample" style={{ fontSize: '12px' }}>Aa</div>
  </div>
  <div className="bw-chip">
    <div className="bw-chip-label">lg</div>
    <div className="bw-chip-value">13.5px</div>
    <div className="bw-chip-sample" style={{ fontSize: '13.5px' }}>Aa</div>
  </div>
  <div className="bw-chip">
    <div className="bw-chip-label">xl</div>
    <div className="bw-chip-value">15px</div>
    <div className="bw-chip-sample" style={{ fontSize: '15px' }}>Aa</div>
  </div>
  <div className="bw-chip">
    <div className="bw-chip-label">2xl</div>
    <div className="bw-chip-value">18px</div>
    <div className="bw-chip-sample" style={{ fontSize: '18px' }}>Aa</div>
  </div>
  <div className="bw-chip">
    <div className="bw-chip-label">3xl</div>
    <div className="bw-chip-value">22.5px</div>
    <div className="bw-chip-sample" style={{ fontSize: '22.5px' }}>Aa</div>
  </div>
  <div className="bw-chip">
    <div className="bw-chip-label">4xl</div>
    <div className="bw-chip-value">30px</div>
    <div className="bw-chip-sample" style={{ fontSize: '30px' }}>Aa</div>
  </div>
  <div className="bw-chip">
    <div className="bw-chip-label">5xl</div>
    <div className="bw-chip-value">36px</div>
    <div className="bw-chip-sample" style={{ fontSize: '36px' }}>Aa</div>
  </div>
  <div className="bw-chip">
    <div className="bw-chip-label">6xl</div>
    <div className="bw-chip-value">45px</div>
    <div className="bw-chip-sample" style={{ fontSize: '45px' }}>Aa</div>
  </div>
  <div className="bw-chip">
    <div className="bw-chip-label">7xl</div>
    <div className="bw-chip-value">54px</div>
    <div className="bw-chip-sample" style={{ fontSize: '54px' }}>Aa</div>
  </div>
  <div className="bw-chip">
    <div className="bw-chip-label">8xl</div>
    <div className="bw-chip-value">72px</div>
    <div className="bw-chip-sample" style={{ fontSize: '72px' }}>Aa</div>
  </div>
  <div className="bw-chip">
    <div className="bw-chip-label">9xl</div>
    <div className="bw-chip-value">96px</div>
    <div className="bw-chip-sample" style={{ fontSize: '96px' }}>Aa</div>
  </div>
</div>

If you override tokens in your Boss config, your values take precedence.
