---
title: Custom Plugin (Typed)
---

This recipe shows how to build a typed Boss plugin and wire it into your config.

## Minimal typed plugin

```ts
// my-plugin.ts
import type { Plugin } from 'boss-css'

export const name = 'my-plugin'

export const onBoot: Plugin<'onBoot'> = async api => {
  api.log.child('plugin').child(name).log('Boot')
}
```

## Emit CSS from props

```ts
import type { Plugin } from 'boss-css'

export const name = 'spacing-clamp'

export const onProp: Plugin<'onProp'> = async (api, { name, prop, contexts }) => {
  if (name !== 'padding') return
  const value = prop?.value
  if (typeof value !== 'number') return

  api.css.selector({
    className: api.contextToClassName(name, value, contexts, true, api.selectorPrefix),
    query: prop.query ?? null,
  })
  api.css.rule('padding', `clamp(8px, ${value}px, 32px)`)
  api.css.write()
}
```

## Add dictionary entries

```ts
import type { Plugin } from 'boss-css'

export const name = 'custom-props'

export const onBoot: Plugin<'onBoot'> = async api => {
  api.dictionary.set('bleed', {
    property: 'margin',
    aliases: ['bleed'],
    description: 'Negative margin helper',
  })
}
```

## Runtime hooks (browser)

Use `onBrowserObjectStart` to transform props into runtime output:

```ts
import type { Plugin } from 'boss-css'

export const name = 'runtime-example'

export const onBrowserObjectStart: Plugin<'onBrowserObjectStart'> = (api, { input, output = {} }) => {
  if (!('cursor' in input)) return
  output.style = { ...(output.style as Record<string, unknown>), cursor: input.cursor }
}
```

## Add plugin to config

```js
// .bo$$/config.js
import * as myPlugin from './my-plugin'

export default {
  plugins: [
    // ...boss plugins
    myPlugin,
  ],
}
```

## Tips

- Use `Plugin<'onProp'>` (or other hook types) for full type safety.
- Most server-side work is done in `onPropTree` or `onProp`.
- Keep runtime work small and gated to dynamic values.
