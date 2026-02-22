---
title: createApi
---

Boss CSS exposes `createApi` for server and browser environments.

## Server API

```ts
import { createApi } from 'boss-css/api/server'

const api = await createApi({
  plugins: [/* server plugins */],
  content: ['src/**/*.{ts,tsx}'],
  folder: './.bo$$',
  unit: 'px',
  breakpoints: {
    mobile: [376, 639],
  },
})
```

The server API is responsible for parsing, CSS generation, and runtime file output.

## Browser API

```ts
import { createApi } from 'boss-css/api/browser'

const api = createApi({
  plugins: [/* browser plugins */],
  unit: 'px',
})
```

The browser API powers the runtime that transforms props into `style` and `className`.

## Common config fields

- `plugins`: list of plugin modules.
- `content`: file globs for parsing (server only).
- `folder`: output folder for `.bo$$/` runtime (server only).
- `unit`: default unit for numeric values.
- `breakpoints`: custom breakpoints for the `at` plugin.
- `selectorPrefix`: prefixes generated class names and CSS variables.
- `selectorScope`: scopes selectors and token variables (include a trailing space for descendant selectors).
- `debug`: enable extra logs.
- `runtime`: runtime strategy config (`{ only?: boolean; strategy?: 'inline-first' | 'classname-first' | 'classic' }`).
