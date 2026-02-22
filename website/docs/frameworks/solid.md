---
title: Solid (Vite)
---

Boss CSS ships with a Solid + Vite sample in `test/sample/solid-base/`.

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

The sample imports runtime output in `src/index.tsx`:

```tsx
// src/index.tsx
import './.bo$$'
import './.bo$$/styles.css'
```

## 3) Use $$

```tsx
const App: Component = () => {
  return (
    <>
      <$$ color="blue">Hello world!!!!</$$>
      <$$.Prepped>Prepped</$$.Prepped>
    </>
  )
}
```

## Notes

- Importing `./.bo$$/styles.css` is only required when `css.autoLoad` is disabled.
