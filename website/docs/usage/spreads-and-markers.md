---
title: Spreads and Markers
---

When you spread style props or className fragments, use the right helpers so Boss can parse and compile them reliably.

## `$$.$` — the no-op marker

`$$.$` returns its input unchanged at runtime, but marks it for Boss parsing/compile.
Use it for spreads and className fragments:

```tsx
const props = $$.$({ color: 'red', hover: { color: 'purple' } })
const className = $$.$('display:flex gap:12')

<$$ {...props} className={className} />
```

Without `$$.$`, the compiler may treat the spread as opaque and skip optimizations.

## `$$.style` — generate output without `<$$>`

If you need Boss output on a plain element, use `$$.style()`:

```tsx
const styleProps = $$.style({ padding: 12, hover: { color: 'purple' } })
return <div {...styleProps} />
```

`$$.style` returns the correct `style`/`className` for the active strategy and merges multiple inputs:

```tsx
const base = { display: 'flex', gap: 12 }
const hover = { hover: { color: 'purple' } }

<div {...$$.style(base, hover)} />
```

## `$$.merge` and `$$.cx`

- Use `$$.merge` to deep-merge style objects.
- Use `$$.cx` to build className strings with conditionals and conflict resolution.

```tsx
const styles = $$.merge({ padding: 12 }, { hover: { color: 'purple' } })
const classes = $$.cx('display:flex', isActive && 'color:blue')
```

## Common patterns

### Spread into `$$`

```tsx
const base = $$.$({ padding: 12 })
const interactive = $$.$({ hover: { color: 'purple' } })

<$$ {...base} {...interactive} />
```

### Spread into plain elements

```tsx
const props = $$.style({ padding: 12, hover: { color: 'purple' } })
<div {...props} />
```

### ClassName-only spreads

```tsx
const className = $$.cx('display:flex', condition && 'gap:12')
<div className={className} />
```
