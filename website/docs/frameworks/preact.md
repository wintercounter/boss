---
title: Preact (Vite)
---

Boss CSS ships with a Preact + Vite sample in `test/sample/preact-base/`.

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

Import the generated runtime once near the entry:

```tsx
// src/index.tsx
import './.bo$$'
```

## 3) Use $$

```tsx
export function App() {
  return (
    <>
      <$$ color="blue">Hello world!!!!</$$>
      <$$.Prepped>Prepped</$$.Prepped>
    </>
  )
}
```
