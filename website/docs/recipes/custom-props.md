---
title: Custom Props with Tokens
---

This recipe shows how to add a custom prop, map it to a token group, and keep it typed.

## 1) Create a plugin

```ts
import type { Plugin } from 'boss-css'
import { propMap, set as setTokens } from 'boss-css/use/token/server'

export const name = 'brand-props'

export const onBoot: Plugin<'onBoot'> = api => {
  // Define the custom prop so Boss treats it as a CSS prop.
  api.dictionary.set('brandColor', {
    property: 'color',
    description: 'Brand color',
    aliases: ['brandColor'],
    isCSSProp: true,
  })

  // Map the prop to a token group so shorthand values work (brand => var(--brand-*)).
  const next = new Set(propMap.get('brand') ?? [])
  next.add('brandColor')
  propMap.set('brand', next)

  // Register tokens for the new group at boot time.
  setTokens({
    brand: {
      primary: '#0ea5e9',
      subtle: '#7dd3fc',
    },
  })

  // Optional: add typings so `brandColor` is suggested in TS.
  api.file.js.dts.replace('body', '$$:FinalProps', value => `${value} & { brandColor?: $$PropValues }`)
}
```

Put this plugin in `.bo$$/plugins/brand-props/server.ts` and import it in your Boss config.

## 3) Use it

```tsx
<$$ brandColor="primary">Brand text</$$>
```

This resolves to:

```css
color: var(--brand-primary);
```

## Notes

- Register your custom prop plugin **before** the token plugin so the map is ready when tokens resolve.
- `propMap` is synced into the runtime output, but only for **used** token groups.
