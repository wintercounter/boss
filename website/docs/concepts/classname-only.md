---
title: Classname-only Strategy
---

`classname-only` is the zero-runtime strategy. It parses static `className` (or `class`) strings, emits CSS, and skips all runtime output.

Use it when:
- You are not using `$$` JSX (or you want to avoid it entirely).
- You only need static className syntax (`prop:value` tokens).
- You want the smallest possible runtime footprint (none).

## What it does (and does not) do

- ✅ Parses static className strings on the server and emits CSS.
- ✅ Works with `boss-css/parser/classname/server`.
- ❌ Does **not** generate `.bo$$/index.js` or `.bo$$/index.d.ts`.
- ❌ Does **not** support dynamic values (functions) because there is no runtime.
- ❌ Does **not** parse template literals with `${}` (classnames must be static).

## Setup

```js
// .bo$$/config.js
import * as fontsource from 'boss-css/fontsource/server'
import * as reset from 'boss-css/reset/server'
import * as token from 'boss-css/use/token/server'
import * as at from 'boss-css/prop/at/server'
import * as child from 'boss-css/prop/child/server'
import * as css from 'boss-css/prop/css/server'
import * as pseudo from 'boss-css/prop/pseudo/server'
import * as classname from 'boss-css/parser/classname/server'
import * as classnameOnly from 'boss-css/strategy/classname-only/server'

export default {
  plugins: [fontsource, reset, token, at, child, css, pseudo, classname, classnameOnly],
  content: ['{src,pages,app,lib,components}/**/*.{html,js,jsx,ts,tsx,mdx,md}'],
}
```

## Usage

```html
<div className="display:flex gap:12 hover:color:purple">
  Static className output
</div>
```

## Notes

- You must import `.bo$$/styles.css` manually since there is no runtime auto-load.
- For dynamic values or runtime-only features, use the `runtime` strategy instead.
