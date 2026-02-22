---
title: Qwik
---

Boss CSS ships with a Qwik sample in `test/sample/qwik-base/`.

## 1) PostCSS

```js
// postcss.config.js
module.exports = {
  plugins: {
    'boss-css/postcss': {},
    autoprefixer: {},
  },
}
```

## 2) Import the runtime

The sample imports runtime output in `src/root.tsx`:

```tsx
// src/root.tsx
import './.bo$$'
```

## 3) Use $$

```tsx
export default component$(() => {
  return (
    <$$ padding="20" display="grid" gap="8">
      <$$.h1 fontSize="24">Qwik + Boss</$$.h1>
      <$$.p opacity="0.7">Generated styles, minimal runtime.</$$.p>
    </$$>
  )
})
```

## Notes

- If you use `$$` outside of `component$` (for example in module scope), import it directly:

```tsx
import $$ from './.bo$$'
```
