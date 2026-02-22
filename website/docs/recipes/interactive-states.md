---
title: Interactive States
---

Common hover/focus/active patterns, plus nested pseudo groups.

## Button states

```tsx
<$$
  as="button"
  padding={[10, 14]}
  borderRadius={10}
  backgroundColor="#0f766e"
  color="#fff"
  hover={{ backgroundColor: '#0b5e58' }}
  focus={{ outline: '2px solid #0f766e' }}
  active={{ transform: 'scale(0.98)' }}
>
  Button
</$$>
```

## Pseudo chains in className

```html
<div className="hover:focus:color:purple active:color:orange">
  Multi-state
</div>
```

## Child selector hover

```tsx
<$$
  child={{
    '& .icon': { opacity: 0.6 },
    '&:hover .icon': { opacity: 1 },
  }}
>
  <span className="icon">★</span>
</$$>
```
