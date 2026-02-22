---
title: Responsive Patterns
---

This recipe focuses on real-world breakpoint usage with `at`.

## Layout switch (column → row)

```tsx
<$$
  display="flex"
  gap={16}
  at={{
    'mobile-': { flexDirection: 'column' },
    'mobile+': { flexDirection: 'row' },
  }}
>
  <$$ flex={1}>A</$$>
  <$$ flex={1}>B</$$>
</$$>
```

## Range-specific tweaks

```tsx
<$$
  at={{
    'tablet-small': { fontSize: 18 },
    'medium+': { fontSize: 20 },
  }}
>
  Headline
</$$>
```

## Arbitrary ranges

```tsx
<$$ at={{ '640-900': { gap: 20 } }}>Constrained gap</$$>
```

## ClassName shorthand

```html
<div className="mobile:padding:12 tablet:padding:16">Responsive padding</div>
```
