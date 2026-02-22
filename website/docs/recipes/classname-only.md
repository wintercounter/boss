---
title: Classname-only Patterns
---

Classname-only is the no-runtime, static className strategy.

## Setup

```js
import * as classname from 'boss-css/parser/classname/server'
import * as classnameOnly from 'boss-css/strategy/classname-only/server'

export default {
  plugins: [/* ... */, classname, classnameOnly],
}
```

## Usage

```html
<div className="display:flex gap:12 hover:color:purple">
  Static className output
</div>
```

## Notes

- Only static className strings are parsed.
- Import `.bo$$/styles.css` manually (no runtime auto-load).
