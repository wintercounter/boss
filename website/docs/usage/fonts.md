---
title: Fonts (Fontsource)
---

Boss CSS can load fonts via the Fontsource catalog. The `fontsource` plugin injects the necessary CSS when `fonts` is configured.

## Enable the plugin

Make sure the plugin is included early in `.bo$$/config.js` (before `reset`):

```js
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
  plugins: [fontsource, reset, token, at, child, css, pseudo, classname, jsx, inlineFirst],
}
```

## Basic usage

```js
export default {
  plugins: [fontsource, reset, token, at, child, css, pseudo, classname, jsx, inlineFirst],
  fonts: [
    { name: 'Inter' },
  ],
}
```

Then use it in props or classnames:

```tsx
<$$ fontFamily="Inter" />
<div className="font-family:Inter" />
```

## Delivery modes

### CDN (default)

```js
fonts: [
  { name: 'Inter', delivery: 'cdn' },
]
```

Boss injects `@import` rules pointing at jsDelivr:

```
@import url("https://cdn.jsdelivr.net/npm/@fontsource/inter@<version>/latin-400.css");
```

### Local (downloaded files)

```js
fonts: [
  { name: 'Inter', delivery: 'local' },
]
```

Boss downloads the font files into:

```
.bo$$/fonts/<name>-<version>/
```

It also caches the fetched CSS alongside those files so restarts do not trigger network requests.

## Pinning versions

If you want a stable version (or to avoid an API call on first run), pin it:

```js
fonts: [
  { name: 'Inter', version: '5.2.8', delivery: 'local' },
]
```

When `version` is omitted and local delivery is used, Boss will reuse the latest cached version folder if it exists.

## Subsets, weights, and styles

```js
fonts: [
  {
    name: 'Inter',
    subsets: ['latin', 'latin-ext'],
    weights: [400, 600, 700],
    styles: ['normal', 'italic'],
  },
]
```

If you omit these, Boss uses the defaults from the Fontsource directory for that font.

## Variable fonts

```js
fonts: [
  {
    name: 'Roboto Flex',
    variable: true,
    delivery: 'local',
    variableAxes: {
      wght: [100, 900],
      wdth: [75, 125],
      ital: 1,
      opsz: [14, 32],
      slnt: -10,
    },
  },
]
```

Boss adjusts the `@font-face` declarations to reflect the provided axes.

## Tokens for font-family

Use `token` to register a custom name:

```js
fonts: [
  { name: 'Inter', token: 'sans' },
  { name: 'IBM Plex Mono', token: 'mono' },
]
```

Then:

```jsx
<div font-family="sans" />
<div className="font-family:mono" />
```

## Multiple fonts + fallbacks

```jsx
<div className="font-family:Inter,system-ui,sans-serif" />
```

Boss does not modify or validate fallback lists; it emits them as-is.
