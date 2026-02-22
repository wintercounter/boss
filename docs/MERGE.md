# Merge

`boss-css/merge` provides a helper to merge Boss className strings by removing conflicts.

## Usage

```ts
$$.merge("display:flex", "display:grid")
// -> "display:grid"
```

You can also import it directly if you prefer:

```ts
import { merge } from "boss-css/merge"

merge("display:flex", "display:grid")
// -> "display:grid"
```

## Prefer `cx` for composition

`merge` supports className merging (strings + arrays) and object deep merging. For component className composition (conditionals, nested arrays), prefer `$$.cx` (or `cx` from `boss-css/variants`) so you get full css-variants semantics plus Boss conflict resolution.

## API

```ts
import { createBossMerge, join, merge } from "boss-css/merge"

join("card", ["color:red"])
// -> "card color:red"

merge("margin:1", "margin-top:2")
// -> "margin-top:2"

const customMerge = createBossMerge({
  sortContexts: false,
  cacheSize: 0,
  orderSensitiveContexts: ["before"],
  compoundContexts: ["at", "container"],
  conflictMap: {
    inset: ["top", "right", "bottom", "left"],
  },
})
```

## Behavior

- Only Boss-style tokens are merged (colon-delimited with a recognized CSS prop).
- Conflicts are resolved by the last matching token for the same context + property.
- Shorthand props remove matching longhand tokens defined by `conflictMap`.
- Contexts are normalized by default (sorted alphabetically) to de-duplicate order-insensitive variants.
- Contexts listed in `orderSensitiveContexts` keep their relative order.
- Compound contexts (for example `at:dark` or `container:mobile`) are kept together when sorting.
- Grouped selectors with multiple entries expand to per-prop tokens to allow merging.
- Non-Boss classes are preserved as-is.
- Results are cached by the full input string (LRU style). Set `cacheSize: 0` to disable.

## Configuration

```ts
type BossMergeConfig = {
  cacheSize?: number
  sortContexts?: boolean
  orderSensitiveContexts?: string[]
  compoundContexts?: string[]
  conflictMap?: Record<string, string[]>
}
```

`conflictMap` entries describe shorthand-to-longhand relationships. Only shorthands remove longhands; longhands do not conflict with each other.

## Inputs

`merge` accepts:

- Strings
- Arrays (nested arrays allowed)
- Plain objects (deep merged)
- Falsy values are ignored

```ts
import { merge } from "boss-css/merge"

merge("color:red", [null, false, ["color:blue"]])
// -> "color:blue"

merge({ hover: { color: "red" } }, { hover: { fontWeight: "bold" } })
// -> { hover: { color: "red", fontWeight: "bold" } }
```
