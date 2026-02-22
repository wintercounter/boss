---
title: Prepared Components
---

Prepared components let you predefine a style object and reuse it through the `$$` proxy.

Qwik note: if you define prepared components at module scope, import `$$` in that module so SSR evaluation sees it first:

```tsx
import $$ from '~/.bo$$'
```

## Define a prepared component

```tsx
$$.PreparedUppercaseA = $$.$({
  textTransform: 'uppercase',
  width: 300,
  hover: { color: 'purple' },
  at: { 'mobile+': { color: 'cyan' } },
  before: { content: '""' },
})
```

`$$.$` is the no-op marker API: it returns the input at runtime and marks the object as a Boss style definition.

TypeScript note: generated `.bo$$/index.d.ts` now includes JSDoc for prepared components with their source file and the styles/props they apply.

## Use it like a component

```tsx
<$$.PreparedUppercaseA>
  PreparedUppercaseA component
</$$.PreparedUppercaseA>
```

## Override props

Prepared components are still regular `$$` components, so you can pass extra props:

```tsx
<$$.PreparedUppercaseA color="black" margin={[12, 0]}>
  Override styles
</$$.PreparedUppercaseA>
```
