---
title: The $$ Proxy
---

`$$` is more than a JSX helper — it is a proxy‑powered styling surface that feels as direct as the old jQuery `$`.

## Why a global `$$`?

Making `$$` global is intentional:

- **Less ceremony**: write styles without imports in every file.
- **Faster authoring**: the signal is always available, like `$` in jQuery.
- **Unified API**: JSX elements, helpers (`cx`, `merge`, `style`), tokens, and prepared components all live on one
  surface.

If you prefer explicit imports, disable globals in config and import from `./.bo$$` instead:

```js
export default {
    jsx: {
        globals: false,
    },
}
```

## The proxy is the API surface

The proxy gives you:

- `$$.div`, `$$.a`, `$$.button` — any tag as a component.
- `$$.css` — custom CSS blocks.
- `$$.style` — generate output without rendering `$$`.
- `$$.$` — mark spreads and className fragments for parsing.
- `$$.cx`, `$$.merge`, `$$.cv`, `$$.scv`, `$$.sv` — composition helpers.

## Why it feels like jQuery

Just like `$`:

- It is **always there** and **easy to reach**.
- It encourages **small, expressive snippets**.
- It becomes a **shared mental model** across a team.

The difference is that Boss uses `$$` for **styling semantics**, not DOM mutation.

## Usage examples

```tsx
<$$ display="flex" gap={12} />

const props = $$.style({ padding: 12, hover: { color: 'purple' } })
<div {...props} />

$$.Card = $$.$({ padding: 12, borderRadius: 12 })
<$$.Card />
```
