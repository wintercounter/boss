---
title: FAQ
---

## Why isn't CSS being generated?

Check:
- `content` globs include your files.
- You imported `.bo$$/styles.css` (or `css.autoLoad` is true).
- You aren’t in `runtime.only` mode (which disables server CSS).

## Why is my className ignored?

The className parser only supports **static** strings. Template literals with `${}` are skipped.

## Do I need the runtime?

Only if you use:
- `$$` JSX props
- Dynamic values (functions)
- Runtime-only features

For static classnames, use `classname-only`.

## How do I enable debug logs?

Set `debug: true` or `BOSS_DEBUG=boss:*`. See [Debugging and Logs](/docs/tooling/debugging).

## How do tokens work?

Tokens compile to CSS variables and are typed from config. Use `tokens` prop for local overrides.
