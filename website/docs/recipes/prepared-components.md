---
title: Prepared Components (Patterns)
---

Prepared components are a great way to bundle base styles and override per usage.

## Define a base component

```tsx
$$.Card = $$.$({
  padding: 16,
  borderRadius: 12,
  backgroundColor: '#fff',
  hover: { boxShadow: '0 4px 20px rgba(0,0,0,0.08)' },
})
```

## Use + override

```tsx
<$$.Card borderRadius={20}>
  Custom radius
</$$.Card>
```

## Variant-style prepared components

```tsx
$$.Badge = $$.$({
  padding: [4, 8],
  borderRadius: 999,
  fontSize: 12,
})

const success = { backgroundColor: '#dcfce7', color: '#166534' }
const warning = { backgroundColor: '#ffedd5', color: '#9a3412' }

<$$.Badge {...success}>Success</$$.Badge>
<$$.Badge {...warning}>Warning</$$.Badge>
```
