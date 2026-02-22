---
title: Quick Start
---

import Tabs from '@theme/Tabs'; import TabItem from '@theme/TabItem';

This guide sets up Boss CSS in an existing React, Next.js, Preact, Qwik, Solid, or Stencil project. For
framework-specific notes, see the [Frameworks](/docs/frameworks/nextjs) section.

## Quick Start (CLI)

Use the initializer to scaffold `.bo$$`, plugins, and config:

<Tabs>
<TabItem value="npm" label="npm">

```bash
npx boss-css init
```

</TabItem>
<TabItem value="pnpm" label="pnpm">

```bash
pnpm dlx boss-css init
```

</TabItem>
<TabItem value="yarn" label="yarn">

```bash
yarn dlx boss-css init
```

</TabItem>
<TabItem value="bun" label="bun">

```bash
bunx boss-css init
```

</TabItem>
<TabItem value="deno" label="deno">

```bash
deno run -A npm:boss-css init
```

</TabItem>
</Tabs>

If `boss-css` was added to `package.json`, run your package manager’s install command before starting the app.

## Manual install

### 1) Install

```bash
npm install boss-css
```

Boss CSS plugs into your PostCSS pipeline, so make sure PostCSS is already part of your build (Next.js ships with it by
default). Stencil does not use PostCSS; run `npx boss-css watch` instead.

### 2) Create `.bo$$/config.js`

```js
// @ts-check
import * as at from 'boss-css/prop/at/server'
import * as child from 'boss-css/prop/child/server'
import * as css from 'boss-css/prop/css/server'
import * as pseudo from 'boss-css/prop/pseudo/server'
import * as jsx from 'boss-css/parser/jsx/server'
import * as classname from 'boss-css/parser/classname/server'
import * as inlineFirst from 'boss-css/strategy/inline-first/server'
import * as classnameFirst from 'boss-css/strategy/classname-first/server'
import * as fontsource from 'boss-css/fontsource/server'
import * as reset from 'boss-css/reset/server'
import * as token from 'boss-css/use/token/server'

/** @type {import('boss-css/api/config').UserConfig} */
export default {
    folder: './.bo$$',
    jsx: {
        globals: true,
    },
    // Choose one strategy: inlineFirst, classnameFirst, classnameOnly, or runtime
    plugins: [fontsource, reset, token, at, child, css, pseudo, classname, jsx, inlineFirst],
    content: ['{src,pages,app,lib,components}/**/*.{html,js,jsx,ts,tsx,mdx,md}'],
}
```

Boss init also writes `.bo$$/jsconfig.json` so TypeScript will type-check the config file even if dot-folders are
excluded by your root `tsconfig`.

To use `classname-first`, swap `inlineFirst` for `classnameFirst` (only one strategy should be included).

For **classname-only** (no runtime, no JSX), drop the JSX parser and use the classname-only strategy:

```js
import * as classnameOnly from 'boss-css/strategy/classname-only/server'

export default {
    plugins: [fontsource, reset, token, at, child, css, pseudo, classname, classnameOnly],
}
```

If you want runtime-only or hybrid output, use the runtime strategy instead:

```js
import * as runtime from 'boss-css/strategy/runtime/server'
import * as fontsource from 'boss-css/fontsource/server'

export default {
    // ...
    plugins: [fontsource, reset, token, at, child, css, pseudo, classname, jsx, runtime],
    runtime: {
        only: true,
        strategy: 'inline-first', // or 'classname-first' | 'classic'
    },
}
```

Set `runtime.only` to `false` for hybrid mode (server CSS + runtime handling).

### 3) Configure CSS generation

<Tabs>
<TabItem value="postcss" label="PostCSS">

```js
// postcss.config.js
module.exports = {
    plugins: {
        'boss-css/postcss': {},
        autoprefixer: {},
    },
}
```

When the devtools plugin is enabled, the PostCSS plugin auto-starts the Boss dev server in non-production. Use
`devServer.autoStart: false` to disable or run `npx boss-css dev` manually.

</TabItem>
<TabItem value="stencil" label="Watcher">

```bash
npx boss-css watch
```

Run `npx boss-css watch` if you use Boss without PostCSS. It'll update `.bo$$/styles.css` on file changes. When the
devtools plugin is enabled, `npx boss-css watch` auto-starts the Boss dev server in non-production. Use
`devServer.autoStart: false` to disable or run `npx boss-css dev` manually.

</TabItem>
</Tabs>

### 4) Import the runtime

Import the generated runtime once near your app root:

```tsx
// src/index.tsx
import './.bo$$'
```

If you are using **classname-only**, skip this step and import `.bo$$/styles.css` manually instead.

By default, the generated runtime imports `.bo$$/styles.css`. To manage CSS yourself, set `css.autoLoad: false` in
`.bo$$/config.js` and import `./.bo$$/styles.css` in your root or global stylesheet.

### 5) Write styles

```tsx
export default function Demo() {
    return (
        <$$ display="flex" gap={12} hover={{ color: 'white', backgroundColor: 'black' }}>
            Hello Boss CSS
        </$$>
    )
}
```

## Next steps

- See [JSX usage](/docs/usage/jsx) and [className syntax](/docs/usage/classname).
- Set up tokens in [Tokens](/docs/usage/tokens).
- Learn the pipeline in [Concepts](/docs/concepts/pipeline).
- For React Native output, see [React Native](/docs/usage/react-native).
