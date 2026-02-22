---
title: Token Theming Patterns
---

Use tokens as the API, and swap values with CSS variables for themes.

## Global theme via CSS variables

```js
// .bo$$/config.js
export default {
  tokens: {
    color: {
      text: 'var(--color-text)',
      background: 'var(--color-bg)',
      brand: 'var(--color-brand)',
    },
  },
}
```

```css
:root {
  --color-text: #0f172a;
  --color-bg: #ffffff;
  --color-brand: #0f766e;
}

[data-theme='dark'] {
  --color-text: #e2e8f0;
  --color-bg: #0b1220;
  --color-brand: #34d399;
}
```

```tsx
<$$ color="text" backgroundColor="background">
  Themed content
</$$>
```

## Local overrides per component

```tsx
<$$
  tokens={{ color: { brand: '#ea580c' } }}
  color="brand"
>
  Local theme
</$$>
```
