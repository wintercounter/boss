# CX

`boss-css/variants` combines css-variants `cx` with Boss `merge` to build className strings with conflict resolution.
These helpers are based on https://css-variants.vercel.app/.

## Recommended usage

Use `$$.cx` when you already rely on the Boss `$$` proxy. This is the preferred helper instead of `merge`.

```ts
$$.cx("card", { "color:red": true }, ["color:blue"])
// -> "card color:blue"
```

You can also import it directly if you prefer:

```ts
import { cx } from "boss-css/variants"

cx("card", { "color:red": true }, ["color:blue"])
// -> "card color:blue"
```

## `className` prop on `$$`

`$$` treats `className` as a `cx` input, so objects/arrays/conditionals are supported and merged with Boss-generated classes.

## API

```ts
import { cx, createBossCx, cv, scv, sv } from "boss-css/variants"

cx("card", false, ["gap:4"])
// -> "card gap:4"

const customCx = createBossCx({
  sortContexts: false,
  cacheSize: 0,
})
```

`$$` also exposes `cx`, `cv`, `scv`, and `sv` for convenience when you are already using the proxy.

## Notes

- `cx` uses css-variants input semantics (strings, arrays, objects, falsy values).
- Output is passed through `merge` to remove Boss class conflicts.
- `cv` and `scv` default to the Boss-aware className resolver, so their outputs also merge conflicts.
- `sv` uses `merge` for style objects, so nested style objects are deep-merged.
- See `docs/MERGE.md` for merge configuration details.
