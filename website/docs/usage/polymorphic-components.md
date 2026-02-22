---
title: Polymorphic Components
---

Boss’s `$$` proxy is polymorphic: it can render different tags or components while still applying Boss props.

## Default tag

`$$` defaults to `div` on web, and `View` on React Native.

```tsx
<$$ padding={12}>Defaults to div</$$>
```

## Tag proxies

Each tag is exposed as a property on the proxy:

```tsx
<$$.a href="/docs" fontSize={14}>Docs</$$.a>
<$$.button padding={[8, 12]}>Click</$$.button>
```

## `as` prop

Use `as` to switch the element or component at call time:

```tsx
<$$ as="section" padding={24} />
```

`as` also accepts custom components, as long as they forward `style` and `className`:

```tsx
const Card = ({ className, style, ...props }) => (
  <div className={className} style={style} {...props} />
)

<$$ as={Card} padding={16} borderRadius={12} />
```

## Framework notes

Boss will use `className` or `class` based on framework detection (React/Next/Preact vs Solid/Qwik/Stencil).

## When to use `$$.style`

If you are not rendering `$$` but still want Boss output, use `$$.style()`:

```tsx
const props = $$.style({ padding: 12, hover: { color: 'purple' } })
return <div {...props} />
```

`$$.style` computes `style` and `className` for the active strategy.
