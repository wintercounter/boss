---
title: Custom Non‑CSS Props
---

This recipe shows how to add a **non‑CSS** prop with a runtime behavior. The prop is consumed at runtime, so it doesn’t end up as an invalid DOM attribute.

We’ll add a `tooltip` prop that sets `data-tooltip` and `aria-label` at runtime.

## 1) Browser plugin (runtime behavior)

Create `.bo$$/plugins/tooltip/browser.ts`:

```ts
import type { Plugin } from 'boss-css'

export const name = 'tooltip'

export const onBrowserObjectStart: Plugin<'onBrowserObjectStart'> = (_api, { input, output = {} }) => {
  const record = input as Record<string, unknown>
  if (!('tooltip' in record)) return

  // Consume the prop so it doesn't get forwarded to the DOM as a raw attribute.
  const value = record.tooltip
  delete record.tooltip

  if (typeof value === 'string' && value.trim()) {
    // Attach runtime-only attributes.
    const out = output as Record<string, unknown>
    out['data-tooltip'] = value
    out['aria-label'] = value
  }
}
```

## 2) Server plugin (types + runtime wiring)

Create `.bo$$/plugins/tooltip/server.ts`:

```ts
import type { Plugin } from 'boss-css'

export const name = 'tooltip'

export const onBoot: Plugin<'onBoot'> = api => {
  // Add typing for the custom prop.
  api.file.js.dts.replace('body', '$$:FinalProps', value => `${value} & { tooltip?: string }`)

  // Include the browser runtime plugin so the prop is handled at runtime.
  api.file.js.importAndConfig({ name: 'onBrowserObjectStart', from: './browser' }, () => true)
}
```

## 3) Use it

```tsx
<$$ tooltip="Save changes">Save</$$>
```

At runtime, this becomes:

```html
<div data-tooltip="Save changes" aria-label="Save changes">Save</div>
```

## Notes

- Put your plugin **before** the strategy plugin (`inlineFirst` / `classnameFirst`) so the prop is consumed before CSS processing.
- This pattern is **runtime‑only** unless you add a compile‑time rewrite (see below).

## Compile‑time rewrite

If you use `boss-css compile`, add a compile hook so the prop is rewritten before runtime is removed:

```ts
import type { Plugin } from 'boss-css'

export const onCompileProp: Plugin<'onCompileProp'> = (_api, payload) => {
  if (payload.name !== 'tooltip') return

  // Rewrite into real DOM attributes at compile time.
  payload.output['data-tooltip'] = payload.prop
  payload.output['aria-label'] = payload.prop
}
```

This lets you keep `<$$ tooltip="Save">` in source while producing:

```html
<div data-tooltip="Save" aria-label="Save">Save</div>
```
