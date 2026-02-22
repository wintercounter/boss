---
title: JSX Usage
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

Boss CSS exposes a `$$` proxy that lets you use CSS props directly in JSX.

Qwik note: refs must be Signals. Pass `ref` as a prop (for example `ref={mySignal}`); Boss does not forward a React-style ref argument for Qwik. `$$` elements also participate in Qwik’s click-to-source inspector in dev.

## Basic usage

```tsx
<$$ display="flex" gap={12} alignItems="center">
  Flex row
</$$>
```

```tsx
<$$.a href="https://example.com" fontSize={12}>
  Link with CSS props
</$$.a>
```

`$$.a`, `$$.img`, and other DOM tags are all supported through the proxy.

## Polymorphic `as`

```tsx
<$$ as="button" padding={12} borderRadius={10}>
  Button via `as`
</$$>
```

## Nested props (pseudo + media)

```tsx
<$$
  color="blue"
  hover={{ color: 'purple', focus: { color: 'black' } }}
  at={{ 'mobile+': { fontStyle: 'italic' } }}
>
  Nested props
</$$>
```

## Arbitrary selectors with `child`

Use the `child` prop to target any selector relative to the component:

```tsx
<$$
  child={{
    '&>div': { color: 'red' },
    '& .title': { fontWeight: 700 },
  }}
>
  <div className="title">Nested title</div>
</$$>
```

`&` is optional. If you omit it, the selector is treated as a descendant. You can also place `&` anywhere in the selector:

```tsx
<$$
  child={{
    '.title': { color: 'blue' },
    '.title &': { color: 'red' },
  }}
>
  <span className="title">Title</span>
</$$>
```

## Dynamic values

Functions are executed in the browser runtime, so you can compute values at render time:

```tsx
<$$ textTransform={() => 'uppercase'} margin={() => [1, 2, 3]}>
  Dynamic values
</$$>
```

Notes:
- In `classname-first`, dynamic values **must** be functions (non-function dynamics are skipped).
- In `classname-first`, dynamic token values should return `$$.token.*` from the function (string tokens are not resolved).
- Runtime-only or hybrid output is required to evaluate functions at render time.

## Custom CSS blocks (`$$.css`)

Use `$$.css` to append raw CSS to the generated stylesheet. This works with the PostCSS pipeline and compile output.

```tsx
$$.css`
.banner { background: linear-gradient(#fff, #eee); }
`
```

```tsx
$$.css({
  ".card": {
    padding: 12,
    "&:hover": { color: "red" },
    "@media screen and (min-width: 640px)": { padding: 16 },
  },
})
```

Notes:
- Template literals must be static (no `${}` expressions).
- Object values must be static; nested objects are treated as selectors or `@` rules.
- Top-level declarations without a selector are wrapped in `:root`.
- Tokens are not resolved; use CSS variables (for example `var(--color-white)`) if needed.
- Not supported in `runtime.only` mode (server CSS output is disabled there).

## Arrays and units

Arrays are joined with spaces and numbers use the configured unit (`px` by default):

```tsx
<$$ margin={[20, 0]} padding={[8, 16]}>
  Array values
</$$>
```

## Mixing className and props

<Tabs>
<TabItem value="react" label="React / Next.js">

```tsx
<$$ className="display:flex color:red" fontWeight="bold">
  ClassName + props
</$$>
```

</TabItem>
<TabItem value="solid" label="Solid">

```tsx
<$$ class="display:flex color:red" fontWeight="bold">
  Class + props
</$$>
```

</TabItem>
</Tabs>

`className` inputs use `cx` semantics, so objects/arrays/conditionals are supported.

## Style helper (`$$.style`)

`$$.style` takes Boss style objects and returns the generated props for the current strategy, so you can spread them onto any element.
It merges multiple inputs using the same deep-merge logic as `$$.merge`.

```tsx
const base = { display: "flex", gap: 12 }
const interactive = { hover: { color: "purple" } }

<div {...$$.style(base, interactive)} />
```

## No-op marker (`$$.$`)

`$$.$` returns the input unchanged at runtime and marks it for Boss parsing/compile. Use it for spreads or prepared definitions:

```tsx
const props = $$.$({ color: 'red', padding: 12 })
const className = $$.$("display:flex hover:color:red")

<div {...props} className={className} />
```

For prepared components, see [Prepared Components](/docs/usage/prepared-components).
For spread patterns and non-`$$` elements, see [Spreads and Markers](/docs/usage/spreads-and-markers).
