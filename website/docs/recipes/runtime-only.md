---
title: Runtime-only Patterns
---

Runtime-only is a `runtime` strategy setup with `runtime.only: true`.

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

Runtime-only is the cleanest path when values must be resolved in the browser:

```tsx
<$$
  padding={() => (isCompact ? 8 : 16)}
  hover={{ color: () => (isActive ? 'white' : 'gray') }}
/>
```

## Nested selectors still work

`at`, `pseudo`, and `child` still work because the runtime strategy injects the needed rules in the browser:

```tsx
<$$ at={{ 'mobile+': { fontSize: () => 18 } }} />
```

## Important caveats

- Static className parsing is disabled in `runtime.only`.
- `runtime.strategy` chooses the browser behavior: `inline-first`, `classname-first`, or `classic`.
- `runtime.globals` controls reset, fontsource, and `$$.css` output:
  - `inline`: inject them into a runtime style tag
  - `file`: write them to `.bo$$/styles.css`
  - `none`: skip them
- Tokens resolve in the browser from your token config.
