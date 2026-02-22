---
title: No JS (Any Language)
---

For static sites or non-JS stacks (PHP, Ruby, Go templates, etc.), use classname-only with the Boss CLI build/watch flow.

## 1) Configure classname-only

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
  content: ['**/*.{html,php,rb,go,tmpl,twig,liquid}'],
}
```

## 2) Build CSS

```bash
npx boss-css build
```

Or watch for changes:

```bash
npx boss-css watch
```

## 3) Load the output

```html
<link rel="stylesheet" href="/.bo$$/styles.css" />
```

## Example

```html
<div class="padding:16 border:1_solid border-color:#ddd border-radius:10">
  Static Boss CSS
</div>
```
