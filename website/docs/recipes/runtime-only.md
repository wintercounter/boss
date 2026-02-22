---
title: Runtime-only Patterns
---

Runtime-only is useful when you need dynamic values or want to avoid server CSS output.

## Setup

```js
import * as runtime from 'boss-css/strategy/runtime/server'

export default {
  plugins: [/* ... */, runtime],
  runtime: {
    only: true,
    strategy: 'inline-first',
    globals: 'inline', // inline | file | none
  },
}
```

## Dynamic values

```tsx
<$$
  padding={() => (isCompact ? 8 : 16)}
  hover={{ color: () => (isActive ? 'white' : 'gray') }}
/>
```

## Runtime-only selectors

`at`, `pseudo`, and `child` are wired for runtime-only output, so nested contexts still work:

```tsx
<$$ at={{ 'mobile+': { fontSize: () => 18 } }} />
```

## Notes

- ClassName parsing is disabled in `runtime.only`.
- Use `runtime.strategy: 'classic'` for a fully runtime-driven className output.
- `runtime.globals` controls reset/fontsource/$$.css output in runtime-only (`inline` is the default).
- Tokens resolve to CSS variables in runtime-only, and the runtime injects token vars on first use (works even with `globals: 'none'`).
