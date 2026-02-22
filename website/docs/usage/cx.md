---
title: ClassName Helper (cx)
---

`cx` is the recommended helper for building className strings. It combines css-variants input semantics with Boss
`merge` conflict resolution and is based on https://css-variants.vercel.app/.

## Use this instead of `merge`

`merge` supports className merging (strings + arrays) and object deep merging. `cx` is still preferred because it gives
you full css-variants semantics for composition and then merges Boss conflicts.

## Recommended usage

If you already use the `$$` proxy, call `$$.cx` directly:

```ts
$$.cx('card', { 'color:red': true }, ['color:blue'])
// -> "card color:blue"
```

You can also import it directly if you prefer:

```ts
import { cx } from 'boss-css/variants'

cx('card', { 'color:red': true }, ['color:blue'])
// -> "card color:blue"
```

## `className` prop on `$$`

`$$` treats `className` as a `cx` input, so objects/arrays/conditionals are supported and merged with Boss-generated
classes.

## Custom configuration

```ts
import { createBossCx } from 'boss-css/variants'

const cx = createBossCx({
    sortContexts: false,
    cacheSize: 0,
})
```

`$$` also exposes `cx`, `cv`, `scv`, and `sv` if you prefer to keep everything on the proxy.

## Class variants (`cv`)

`cv` builds className strings with variants and uses the Boss-aware resolver by default.

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
    defaultVariants: {
        tone: 'primary',
    },
})

button()
// -> "display:inline-flex align-items:center color:white background:blue"
```

## Slot class variants (`scv`)

`scv` returns className strings per slot, also using the Boss-aware resolver.

```ts
import { scv } from 'boss-css/variants'

const card = scv({
    slots: ['root', 'header', 'body'],
    base: {
        root: 'border:1_solid border-color:gray',
        header: 'font-weight:600',
        body: 'padding:16',
    },
    variants: {
        tone: {
            primary: { root: 'border-color:blue' },
            muted: { root: 'border-color:gray-50' },
        },
    },
})

const classes = card({ tone: 'primary' })
// classes.root -> "border:1_solid border-color:blue"
```

## Style variants (`sv`)

`sv` returns style objects. Boss `merge` is used so nested styles are deep-merged.

```ts
import { sv } from 'boss-css/variants'

const panel = sv({
    base: { borderRadius: 8, padding: 12 },
    variants: {
        tone: {
            primary: { backgroundColor: 'blue', color: 'white' },
        },
    },
})

panel({ tone: 'primary', style: { padding: 16 } })
// -> { borderRadius: 8, padding: 16, backgroundColor: "blue", color: "white" }
```

## Notes

- `cx` calls `merge` internally, so all merge behavior still applies.
- `$$.merge` is available, but `$$.cx` is preferred for composition.
- `sv` uses `merge` for style objects, so nested style objects are deep-merged.
