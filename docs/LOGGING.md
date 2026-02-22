# Logging

Boss logs are disabled by default. Enable them by setting `debug` in config or by providing a `BOSS_DEBUG` value in the environment.
Logger instances are cached per namespace to keep hook logging low overhead.

## Enable logs

### Config (highest priority)

```js
export default {
  debug: true,
  // or: debug: 'boss:api:* boss:css'
}
```

`debug: true` enables all Boss namespaces (`boss:*`).

### Environment / globals (fallback)

Boss reads `BOSS_DEBUG` when `debug` is not set in config.

- Browser: `localStorage.BOSS_DEBUG`
- Browser/Node: `globalThis.BOSS_DEBUG`
- Node: `process.env.BOSS_DEBUG`

Examples:

```js
// Browser console
localStorage.setItem('BOSS_DEBUG', 'boss:api:* boss:css')
```

```sh
BOSS_DEBUG=boss:* npm run build
```

## Namespace patterns

Patterns use `*` wildcards and support space/comma-separated lists.

Examples:

- `boss:*` - everything
- `boss:api:*` - plugin hooks + API lifecycle
- `boss:parser:*` - JSX/classname parsing
- `boss:css` - selector/rule writes
- `boss:prop:pseudo` - pseudo prop handling
- `boss:runtime:*` - runtime browser object handling

Exclude with `-`:

```
boss:*,-boss:css
```
