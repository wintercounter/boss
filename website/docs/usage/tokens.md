---
title: Tokens
---

The token plugin maps design tokens to CSS variables and augments the generated types.

## Define tokens

```js
export default {
  tokens: {
    color: {
      brand: '#0f766e',
      accent: '#ea580c',
      white: '#ffffff',
    },
    spacing: {
      sm: 8,
      md: 16,
      lg: 24,
    },
  },
}
```

This is read by the token plugin, so keep `boss-css/use/token/server` in your `plugins` list.

You can also provide a resolver function if you need to extend existing tokens:

```js
export default {
  tokens: values => ({
    ...values.asObject?.(),
    color: { brand: '#0f766e' },
  }),
}
```

## DTCG tokens

Boss can ingest DTCG token JSON directly (for example from Style Dictionary). `$value` is used as the token value and
`$type` drives CSS-ready normalization, so composite tokens like `border`, `shadow`, `transition`, `gradient`, and
`typography` resolve to CSS shorthands. References like `{colors.black}` are resolved on set. See the
[DTCG format](https://www.designtokens.org/tr/drafts/format/) for the full spec.

Boss also resolves `$ref` JSON pointers and `$extends` group inheritance during token normalization. All `$...`
metadata keys are stripped from the output token map.

```js
import styleTokens from './tokens.json'

export default {
  tokens: styleTokens,
}
```

Example output structure:

```json
{
  "colors": {
    "$type": "color",
    "black": { "$value": "#000000" },
    "link": { "$value": "{colors.black}" }
  },
  "dimensions": {
    "$type": "dimension",
    "4": { "$value": "16px" }
  }
}
```

If your DTCG groups use names like `colors` or `dimensions`, either rename them in your build output or map
them to Boss prop groups via `setTokenPropGroups` so `color="..."` and `gap="..."` resolve as expected.

```js
import * as token from 'boss-css/use/token/server'

const groups = token.getTokenPropGroups()
token.setTokenPropGroups({
  colors: groups.color,
  dimensions: groups.size,
  duration: groups.duration,
  borders: groups.border,
  shadows: groups.shadow,
  gradients: groups.gradient,
  transitions: groups.transition,
  typography: groups.typography,
  font: groups.font,
  grid: groups.grid,
  backgroundPosition: groups.backgroundPosition,
})
```

Composite tokens normalize to CSS-ready strings; `typography` is converted to a `font` shorthand and does not include
`letterSpacing`, so apply `letterSpacing` separately if you need it. Shorthand tokens also work directly on props like
`boxShadow`, `backgroundImage`, `transition`, and `font` when the matching DTCG group is present.

## Use tokens in JSX

```tsx
<$$ color={$$.token.color.brand}>Brand text</$$>
<$$ color="white">Shorthand token</$$>
<$$ color="$$.token.color.accent">String token</$$>
<$$ color="gray.600/60">Token with alpha</$$>
```

## Use tokens in className

```html
<div className="color:brand">Token in className</div>
<div className="color:$$.token.color.accent">String token in className</div>
```

## How it compiles

- Tokens are emitted into `:root` as CSS variables.
- `color="white"` becomes `color: var(--color-white)`.
- `color="gray.600/60"` becomes `color: color-mix(in oklab, var(--color-gray-600) 60%, transparent)`.
- Token variables are grouped by token group (for example `backgroundColor="white"` also uses `var(--color-white)`).
- `$$.token.*` used outside JSX compiles to `var(--...)` for simple dot chains (no computed keys).
- `$$.token` is only generated if you use it in your code.

## Theming and overrides

See [Theming](/docs/usage/theming) for:
- Using CSS variables as token values.
- Overriding tokens with the `tokens` prop.
- Using `$$.tokenVars` directly.
- Light/dark mode patterns.

## Notes

- Tokens are merged, so multiple `token.set()` calls are combined.
- Token values also appear in the generated `.d.ts` for autocomplete.
- Alpha suffixes only work with token keys in strings (not `$$.token.*`), and only accept `0-100`.
- When a prop maps to multiple token groups (like `textShadow` or `backgroundImage`), Boss picks the first group that
  contains the matching key. Use explicit `$$.token.*` paths to force a specific group.
- `String($$.token.color.brand)` (or template literals) yields `var(--color-brand)` at runtime.
