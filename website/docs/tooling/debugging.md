---
title: Debugging and Logs
---

Boss CSS uses a lightweight namespaced logger. Logging is **off by default** and can be enabled with `config.debug` or `BOSS_DEBUG`.

## Quick enable

```js
// .bo$$/config.js
export default {
  debug: true, // enables all namespaces
}
```

## Namespaces

Namespaces look like `boss:parser:jsx` or `boss:strategy:inline-first`. You can enable subsets with patterns:

```bash
# enable all boss logs
BOSS_DEBUG=boss:* npx boss-css build

# only JSX parser logs
BOSS_DEBUG=boss:parser:jsx npx boss-css build

# enable everything except css output
BOSS_DEBUG="boss:* -boss:css" npx boss-css build
```

## Where `BOSS_DEBUG` is read from

If `config.debug` is **not** set, Boss checks the following in order:

1. `localStorage.BOSS_DEBUG` (browser)
2. `globalThis.BOSS_DEBUG` (browser/runtime)
3. `process.env.BOSS_DEBUG` (Node)

Examples:

```js
// Browser devtools
localStorage.setItem('BOSS_DEBUG', 'boss:*')
```

```js
// Runtime-only environments without localStorage
globalThis.BOSS_DEBUG = 'boss:parser:*'
```

## Tips

- `debug: true` is equivalent to `BOSS_DEBUG=boss:*`.
- Use `-boss:...` to exclude noisy areas while keeping the rest enabled.
