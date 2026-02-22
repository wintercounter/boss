---
title: No Framework (Vite)
---

Use Boss CSS with plain HTML and JavaScript in a Vite project. This setup uses classnames only, so there is no runtime.

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
  content: ['index.html', 'src/**/*.{js,ts}'],
}
```

## 2) PostCSS

```js
// postcss.config.js
module.exports = {
  plugins: {
    'boss-css/postcss': {},
    autoprefixer: {},
  },
}
```

## 3) Use Boss classnames

```html
<!-- index.html -->
<button class="padding:8_12 border-radius:8 background:#111 color:white">
  Boss button
</button>
```

## Notes

- Use `class` (not `className`) in HTML.
- Boss will generate `.bo$$/styles.css` from your classnames.
