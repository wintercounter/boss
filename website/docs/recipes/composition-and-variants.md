---
title: Composition and Variants
---

Use `cx`, `cv`, `scv`, and `sv` for reusable class and style patterns.

## `cx` for conditional class tokens

```ts
const className = $$.cx(
  'display:flex gap:12',
  isActive && 'color:blue',
  isMuted && 'opacity:0.6'
)
```

## `cv` for variant classes

```ts
import { cv } from 'boss-css/variants'

const button = cv({
  base: 'display:inline-flex align-items:center',
  variants: {
    tone: {
      primary: 'color:white background:blue',
      subtle: 'color:blue background:transparent',
    },
  },
  defaultVariants: { tone: 'primary' },
})

button({ tone: 'subtle' })
```

## `scv` for slot variants

```ts
import { scv } from 'boss-css/variants'

const card = scv({
  slots: ['root', 'title', 'body'],
  base: {
    root: 'border:1_solid border-color:gray-200',
    title: 'font-weight:600',
    body: 'color:gray-600',
  },
})
```

## `sv` for style objects

```ts
import { sv } from 'boss-css/variants'

const panel = sv({
  base: { padding: 12, borderRadius: 10 },
  variants: { tone: { primary: { backgroundColor: 'blue', color: 'white' } } },
})
```
