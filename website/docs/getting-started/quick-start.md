---
title: Quick Start
---

import Tabs from '@theme/Tabs'; import TabItem from '@theme/TabItem';

This guide sets up Boss CSS in an existing React, Next.js, Preact, Qwik, Solid, or Stencil project.

## 1) Choose your setup

Start by choosing the authoring input and output strategy you want:

| You want to author with | Pick this strategy | Import near app root | Notes |
| --- | --- | --- | --- |
| `$$` JSX props with the default output | `inline-first` | `import './.bo$$'` | Recommended starting point |
| `$$` JSX props, but more static class rules | `classname-first` | `import './.bo$$'` | Dynamic values must be functions |
| Static `className` / `class` tokens only | `classname-only` | `import './.bo$$/styles.css'` | No generated runtime files |
| `$$` JSX props with browser-evaluated values or no server CSS | `runtime` | `import './.bo$$'` | Configure `runtime.only` or hybrid mode |

`npx boss-css compile` is optional and comes later. It is a build step, not a strategy.

## 2) Scaffold with the CLI

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

## 3) Manual install

### Install

```bash
npm install boss-css
```

Boss plugs into PostCSS or the Boss CLI build/watch flow. Next.js already ships with PostCSS. Stencil does not, so use `npx boss-css watch`.

### Create `.bo$$/config.js`

This is the default JSX setup with `inline-first`:

```js
// @ts-check
import * as at from 'boss-css/prop/at/server'
import * as child from 'boss-css/prop/child/server'
import * as css from 'boss-css/prop/css/server'
import * as pseudo from 'boss-css/prop/pseudo/server'
import * as jsx from 'boss-css/parser/jsx/server'
import * as classname from 'boss-css/parser/classname/server'
import * as inlineFirst from 'boss-css/strategy/inline-first/server'
import * as fontsource from 'boss-css/fontsource/server'
import * as reset from 'boss-css/reset/server'
import * as token from 'boss-css/use/token/server'

/** @type {import('boss-css/api/config').UserConfig} */
export default {
  folder: './.bo$$',
  jsx: {
    globals: true,
  },
  plugins: [fontsource, reset, token, at, child, css, pseudo, classname, jsx, inlineFirst],
  content: ['{src,pages,app,lib,components}/**/*.{html,js,jsx,ts,tsx,mdx,md}'],
}
```

Boss init also writes `.bo$$/jsconfig.json` so TypeScript can type-check the config file even if dot-folders are excluded by your root `tsconfig`.

### Pick a different strategy if needed

Use `classname-first` when you still want JSX authoring but prefer more static class output:

```js
import * as classnameFirst from 'boss-css/strategy/classname-first/server'

export default {
  plugins: [fontsource, reset, token, at, child, css, pseudo, classname, jsx, classnameFirst],
}
```

Use `classname-only` when you want the static className lane:

```js
import * as classnameOnly from 'boss-css/strategy/classname-only/server'

export default {
  plugins: [fontsource, reset, token, at, child, css, pseudo, classname, classnameOnly],
}
```

Use the `runtime` strategy when values must be resolved in the browser or you want runtime-only output:

```js
import * as runtime from 'boss-css/strategy/runtime/server'

export default {
  plugins: [fontsource, reset, token, at, child, css, pseudo, jsx, runtime],
  runtime: {
    only: true,
    strategy: 'inline-first', // or 'classname-first' | 'classic'
  },
}
```

Set `runtime.only` to `false` for hybrid mode. In runtime-only mode, static className parsing is disabled.

## 4) Generate CSS

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

When the devtools plugin is enabled, the PostCSS plugin auto-starts the Boss dev server in non-production. Use `devServer.autoStart: false` to disable or run `npx boss-css dev` manually.

</TabItem>
<TabItem value="stencil" label="Watcher">

```bash
npx boss-css watch
```

Run `npx boss-css watch` if you use Boss without PostCSS. It keeps `.bo$$/styles.css` and any boundary files up to date. When the devtools plugin is enabled, `watch` auto-starts the Boss dev server in non-production.

</TabItem>
</Tabs>

## 5) Import the generated runtime or stylesheet

Import the generated runtime once near your app root for `inline-first`, `classname-first`, and `runtime`:

```tsx
// src/index.tsx
import './.bo$$'
```

Use this instead for `classname-only`:

```tsx
import './.bo$$/styles.css'
```

By default, the generated runtime imports `.bo$$/styles.css`. Set `css.autoLoad: false` if you want to import the CSS file yourself.

## 6) Write styles

JSX authoring:

```tsx
export default function Demo() {
  return (
    <$$ display="flex" gap={12} hover={{ color: 'white', backgroundColor: 'black' }}>
      Hello Boss CSS
    </$$>
  )
}
```

Static className authoring:

```tsx
export default function Demo() {
  return <div className="display:flex gap:12 hover:color:white hover:background-color:black">Hello Boss CSS</div>
}
```

## 7) Add compile only if you need it

`npx boss-css compile` is optional. Use it when you want a source-rewrite step ahead of your app build.

Current scope:

- JSX only
- `inline-first` and `classname-first` only
- temp mode writes transformed files and generated CSS under `compile.tempOutDir`
- prod mode mutates source in place and does not write CSS files

## Next steps

- [Configuration](/docs/getting-started/configuration)
- [Generated Runtime](/docs/api/generated-runtime)
- [JSX usage](/docs/usage/jsx)
- [className syntax](/docs/usage/classname)
- [Runtime Strategy](/docs/concepts/runtime-strategy)
- [Compile](/docs/tooling/compile)
