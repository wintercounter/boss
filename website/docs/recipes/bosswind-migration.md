---
title: Bosswind Migration
---

Bosswind helps you migrate Tailwind-style usage into Boss with minimal changes.

## Enable Bosswind

```js
import * as bosswind from 'boss-css/prop/bosswind/server'
import * as token from 'boss-css/use/token/server'

export default {
    plugins: [bosswind, token /* ... */],
}
```

## Common migrations

```html
<!-- Tailwind -->
<div className="flex gap-4 p-4 text-sm text-gray-600" />

<!-- Bosswind -->
<div className="flex gap:4 p:4 text:sm text:gray.600" />
```

```html
<!-- Tailwind -->
<div className="bg-gray-100 rounded-lg shadow-md" />

<!-- Bosswind -->
<div className="bg:gray.100 rounded:lg shadow:md" />
```

## Notes

- Bosswind merges standard Tailwind tokens into your token set.
- Use `text:` for font size or color (Bosswind infers the target).
