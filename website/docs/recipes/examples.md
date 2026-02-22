---
title: Examples
---

This page is a curated set of Boss CSS patterns. Every snippet is valid based on the runtime and plugins in this repo.

## Basic layout

```tsx
<$$ display="flex" gap={16} alignItems="center">
  <$$ padding={[8, 12]} borderRadius={12} backgroundColor="#fff">
    Card A
  </$$>
  <$$ padding={[8, 12]} borderRadius={12} backgroundColor="#fff">
    Card B
  </$$>
</$$>
```

## Responsive hero

```tsx
<$$
  display="flex"
  gap={24}
  at={{
    'mobile+': { flexDirection: 'row' },
    'mobile-': { flexDirection: 'column' },
  }}
>
  <$$ fontSize={32} fontWeight={700}>
    Headline
  </$$>
  <$$ color="#666">Supporting text</$$>
</$$>
```

## Button with hover + focus

```tsx
<$$
  as="button"
  padding={[10, 16]}
  borderRadius={12}
  backgroundColor="#0f766e"
  color="#fff"
  hover={{ backgroundColor: '#0b5e58' }}
  focus={{ outline: '2px solid #0f766e' }}
>
  Press me
</$$>
```

## Token powered text

```tsx
token.set({
  color: {
    brand: '#0f766e',
    accent: '#ea580c',
  },
})

<$$ color={$$.token.color.brand}>
  Brand headline
</$$>

<$$ color={$$.token.color.accent}>
  Accent caption
</$$>
```

## Prepared component

```tsx
$$.Badge = $$.$({
  display: 'inline-block',
  padding: [4, 8],
  borderRadius: 999,
  backgroundColor: '#ffe3cf',
  color: '#ea580c',
})

<$$.Badge>New</$$.Badge>
```

## ClassName utilities

```html
<div className="display:flex gap:12">
  <div className="padding:6_10 border-radius:10 background-color:#fff">
    Utility card
  </div>
</div>
```

## Pseudo chains

```html
<div className="hover:focus:color:blue active:color:orange">
  Multi-state text
</div>
```

## Media + pseudo combo

```html
<div className="mobile:hover:display:block">
  Hover on mobile only
</div>
```

## Content and before

```html
<div className="before:content:'' before:display:block before:height:2">
  Line above
</div>
```

## Array values

```tsx
<$$ margin={[20, 0]} padding={[8, 16]}>
  Arrays become space-separated values
</$$>

<div className="margin:20_0 padding:8_16">ClassName arrays</div>
```

## Mixed className + props

```tsx
<$$ className="display:flex gap:12" borderRadius={12}>
  Mixed styles
</$$>
```
