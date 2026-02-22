---
title: Pseudo + Media Queries
---

Boss CSS includes `pseudo` and `at` prop plugins for pseudo classes and media queries.

Arbitrary selectors are handled by the `child` prop plugin. See [JSX usage](/docs/usage/jsx) and [className syntax](/docs/usage/classname).

In JSX (inline-first), nested props emit stable class selectors and push values into CSS variables. That means selectors
omit values (`hover:color` instead of `hover:color:red`). In className strings, selectors keep the value.

## Pseudo props

```tsx
<$$
  color="black"
  hover={{ color: 'purple' }}
  focus={{ color: 'blue' }}
  before={{ content: '""', display: 'block' }}
>
  Hover and focus
</$$>
```

## `at` prop

```tsx
<$$
  at={{
    'mobile+': { fontSize: 18 },
    '@media (max-width: 768px)': { fontStyle: 'italic' },
  }}
>
  Responsive styles
</$$>
```

## `at` shorthand in className

```html
<div className="at:mobile+:display:block">
  Mobile display
</div>
```

## Container queries

Boss supports CSS container queries via the `container` prop and `container_*` shorthands. You must set a container on an ancestor (or the same element) using `containerType` / `containerName` or the `container` CSS shorthand.

### Set the container

```tsx
<$$ containerType="inline-size" containerName="card" />
<$$ container="card / inline-size" />
```

ClassName equivalent:

```html
<div className="container-type:inline-size container-name:card" />
```

### Unnamed container queries

```tsx
<$$ containerType="inline-size" container={{ mobile: { fontStyle: 'italic' } }} />
```

```html
<div className="container:mobile:font-style:italic" />
```

### Named container queries

You can name containers in two ways:

```tsx
<$$ containerName="card" containerType="inline-size" container_card={{ mobile: { fontStyle: 'italic' } }} />
<$$ at={{ 'container card': { mobile: { fontStyle: 'italic' } } }} />
```

```html
<div className="container_card:mobile:font-style:italic" />
<div className="at:container_card:mobile:font-style:italic" />
```

### Composition with pseudos and child selectors

```tsx
<$$ container={{ mobile: { hover: { display: 'block' }, child: { '.item': { color: 'red' } } } }} />
```

```html
<div className="container:mobile:hover:display:block" />
<div className="container:mobile:[&_.item]:color:red" />
```

## Pseudo + `at` chaining

```html
<div className="mobile:hover:focus:display:block">
  Mobile hover focus
</div>
```

### Breakpoint shorthands

The `at` plugin generates shorthands for each breakpoint:

- `name` uses the full range
- `name+` uses min width
- `name-` uses max width

You can customize breakpoints in `.bo$$/config.js`.

## Built-in breakpoints

Boss ships these defaults (all widths in px):

```
micro: 0-375
mobile: 376-639
tablet: 640-1023
small: 1024-1439
medium: 1440-1919
large: 1920+
device: 0-1023
```

These are available both as `at` keys and as shorthand props:

```tsx
<$$ mobile={{ fontSize: 16 }} />
<$$ tablet={{ fontSize: 18 }} />
```

ClassName equivalent:

```html
<div className="mobile:font-size:16 tablet:font-size:18" />
```

## Ranges and arbitrary values

You can define ranges using `-`, `+`, and `-` suffixes:

```tsx
<$$ at={{ 'mobile+': { display: 'flex' } }} />
<$$ at={{ 'tablet-': { display: 'block' } }} />
<$$ at={{ 'mobile-tablet': { gap: 12 } }} />
```

Arbitrary ranges also work:

```tsx
<$$ at={{ '640-1023': { fontSize: 18 } }} />
<$$ at={{ '768+': { padding: 24 } }} />
```

Values without units use the configured `unit` (default `px`).

## Built-in media shorthands

The `at` plugin also includes:

- `dark` → `prefers-color-scheme: dark`
- `light` → `prefers-color-scheme: light`
- `hdpi` → `min-resolution: 192dpi`

```tsx
<$$ dark={{ color: 'white' }} />
<$$ light={{ color: 'black' }} />
```
