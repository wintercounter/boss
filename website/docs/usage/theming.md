---
title: Theming
---

Boss theming is just CSS variables. Tokens compile to `var(--token-name)` and you decide where those variables are defined.

This page covers:
- Setting token values to CSS variables.
- Overriding tokens with the `tokens` prop.
- Using `$$.tokenVars` directly for manual control.
- Light/dark mode patterns.

## Define tokens using CSS variables

Use CSS variables as token values so themes can be swapped without changing your JS/TS:

```js
export default {
  tokens: {
    color: {
      text: 'var(--color-text)',
      background: 'var(--color-background)',
      brand: 'var(--color-brand)',
    },
    spacing: {
      sm: 'var(--space-sm)',
      md: 'var(--space-md)',
      lg: 'var(--space-lg)',
    },
  },
}
```

This is read by the token plugin, so keep `boss-css/use/token/server` in your `plugins` list.

Then define the variables in CSS:

```css
:root {
  --color-text: #0f172a;
  --color-background: #ffffff;
  --color-brand: #0f766e;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
}
```

Now any use of `$$.token.color.brand` or `color="brand"` resolves to your theme.

## Local overrides with the `tokens` prop

Every Boss component accepts a `tokens` prop. It takes the same structure as `token.set()` but all fields are optional. Arrays are treated as leaf overrides, and leaf values accept numbers or strings.

```tsx
<$$
  tokens={{
    color: {
      brand: '#ea580c',
      background: '#0f172a',
    },
    spacing: {
      md: 20,
    },
  }}
>
  Themed section
</$$>
```

The `tokens` prop is applied as inline CSS variables on the element, so it scopes the theme to that subtree. It also merges with `style`, and token overrides win if they target the same CSS variable.

## Manual control with `$$.tokenVars`

`$$.tokenVars()` converts token overrides into a `{ [cssVar]: value }` object. This is useful when you need to pass style props manually or theme non-Boss elements.

```tsx
const theme = {
  color: { brand: '#8b5cf6' },
  spacing: { md: 18 },
}

<div style={$$.tokenVars(theme)}>Plain div</div>
```

You can also combine it with other styles:

```tsx
<div style={{ ...$$.tokenVars(theme), padding: 12 }}>Mixed styles</div>
```

## Light/dark mode

### Data attribute switch

```css
:root {
  --color-text: #0f172a;
  --color-background: #ffffff;
  --color-brand: #0f766e;
}

[data-theme='dark'] {
  --color-text: #e2e8f0;
  --color-background: #0b1220;
  --color-brand: #34d399;
}
```

```tsx
<html data-theme={isDark ? 'dark' : 'light'}>
  <body>
    <$$ color="text" backgroundColor="background">
      Themed content
    </$$>
  </body>
</html>
```

### `prefers-color-scheme`

```css
:root {
  --color-text: #0f172a;
  --color-background: #ffffff;
}

@media (prefers-color-scheme: dark) {
  :root {
    --color-text: #e2e8f0;
    --color-background: #0b1220;
  }
}
```

Both approaches work because tokens ultimately read from CSS variables.

## When to use each option

- `tokens` prop: best for local overrides on a component subtree.
- `$$.tokenVars`: best when you need to pass styles manually or theme non-Boss elements.
- CSS variables in `token.set`: best for global theme switches (light/dark, brands, customer theming).
