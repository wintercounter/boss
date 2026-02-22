---
title: Runners
---

Boss CSS exposes programmatic runners from the root package so you can drive build/watch/compile/PostCSS work without the CLI.

```ts
import {
  runBuild,
  runWatch,
  runCompile,
  runPostcss,
} from 'boss-css'
```

## runBuild

```ts
const result = await runBuild(userConfig, { baseDir: process.cwd() })
```

Returns:
- `filesParsed`: number of parsed source files
- `cssPath`: absolute path to the global stylesheet (or `null` for runtime-only unless `runtime.globals: 'file'`)
- `cssBytes`: CSS size in bytes
- `durationMs`: build time in milliseconds
- `boundaryPaths`: array of resolved `.boss.css` boundary files (when CSS boundaries are enabled)

## runWatch

```ts
const watcher = await runWatch(userConfig, {
  onBuild(result) {
    console.log(result.cssPath)
  },
  onError(error) {
    console.error(error)
  },
  onReady() {
    console.log('watch ready')
  },
})

// later
await watcher.close()
```

Notes:
- `runWatch` emits a build immediately, then rebuilds on file changes.
- `close()` stops file watching and fires the `onSession` stop hook.

## runCompile

```ts
const result = await runCompile({ config: userConfig, prod: false })
```

This is the programmatic equivalent of `npx boss-css compile`.

## runPostcss

`runPostcss` is the internal helper used by the PostCSS plugin:

```ts
import postcss from 'postcss'
import { runPostcss } from 'boss-css'

const processor = postcss([
  async (root, result) => {
    await runPostcss(root, result, { baseDir: process.cwd() })
  },
])
```

## Auto-start dev server

When the devtools plugin is enabled and `NODE_ENV` is not `production`, `runWatch` and `runPostcss` auto-start the Boss dev server unless `devServer.autoStart` is set to `false`.

```js
// .bo$$/config.js
export default {
  devServer: {
    autoStart: false,
  },
}
```
