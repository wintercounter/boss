---
title: Polymorphic CSS-in-JS
---

Boss CSS is “polymorphic” in the sense that **runtime output, CSS, and types are generated based on actual usage**.
Nothing is emitted unless it is needed by your source.

## What this means

- Runtime files only include the plugins and helpers that are actually used.
- Token types are generated from the tokens you define **and** the tokens you reference.
- Prepared components are reflected in `.bo$$/index.d.ts` as you author them.
- ClassName parsing only happens when the classname parser is enabled and used.
- `classname-only` skips runtime output entirely.

## Examples

### Runtime only when needed

If your project only uses static className strings, the runtime doesn’t need to be emitted:

```js
plugins: [classname, classnameOnly]
```

### Tokens only when referenced

`$$.token` types are generated from your configured tokens, and only used token paths are emitted into runtime:

```js
export default {
    tokens: { color: { brand: '#0f766e' } },
}
```

### Prepared components

Assigning prepared components updates the generated types:

```tsx
$$.Card = $$.$({ padding: 12 })
```

`.bo$$/index.d.ts` will include `Card` in the proxy interface.

## Why it matters?

This design keeps output small and precise, and makes Boss adapt to your usage rather than forcing a fixed runtime
shape.
