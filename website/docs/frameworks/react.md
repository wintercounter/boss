---
title: React (Vite)
---

Boss CSS ships with a React + Vite sample in `test/sample/vite-base/`.

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

The sample imports runtime output in `src/App.tsx`:

```tsx
// src/App.tsx
import './.bo$$'
import './.bo$$/styles.css'
```

You can also import `./.bo$$` in `src/main.tsx` if you prefer a single entrypoint.

## 3) Use $$

```tsx
export function Hero() {
  return (
    <$$
      display="flex"
      gap="12"
      alignItems="center"
      padding="16"
      background="color-mix(in srgb, #000 6%, transparent)"
    >
      <$$.span fontWeight="600">Boss CSS</$$.span>
      <$$.button padding="8_12" borderRadius="6">
        Install
      </$$.button>
    </$$>
  )
}
```

## Notes

- Importing `./.bo$$/styles.css` is only required when `css.autoLoad` is disabled.
