---
title: Runtime Strategy
---

## 1) What this strategy is

`runtime` is the runtime strategy wrapper. It runs Boss behavior in the browser, either fully (`runtime.only: true`) or alongside server CSS output (`runtime.only: false`).

It is a strategy plugin, not the same thing as the generated runtime files in `.bo$$/`.

## 2) What you author

Use `runtime` with `$$` JSX props.

In hybrid mode you can still keep the classname parser in your config for build-time class token parsing. In `runtime.only` mode, static className parsing is disabled, so do not rely on class token authoring there.

## 3) What files are generated

The `runtime` strategy still generates:

- `.bo$$/index.js`
- `.bo$$/index.d.ts`

CSS output depends on mode:

- `runtime.only: true`: no server strategy CSS output
- `runtime.only: true` with `runtime.globals: 'file'`: writes `.bo$$/styles.css` for globals only
- `runtime.only: false`: emits the same server CSS you would get from the selected underlying strategy

## 4) What lands in CSS

- In runtime-only mode, strategy CSS rules are injected in the browser instead of written on the server.
- With `runtime.globals: 'file'`, globals such as reset, fontsource, and `$$.css` are written to `styles.css`.
- In hybrid mode, server CSS comes from the selected underlying strategy (`inline-first` or `classname-first`).

## 5) What runs in the browser

The browser runs the runtime strategy wrapper plus the selected underlying runtime handler:

- `inline-first`
- `classname-first`
- `classic`

That browser work can:

- evaluate browser-evaluated values at render time
- inject CSS rules when needed
- resolve runtime token values from your token config

## 6) Constraints / caveats

- Use only the `runtime` strategy plugin. Do not also include `inline-first` or `classname-first` as strategy plugins.
- `runtime.only: true` disables server strategy CSS output.
- `runtime.only: true` disables className parsing.
- `runtime.strategy: 'classic'` is a browser behavior only. In hybrid mode, server output falls back to `inline-first`.
- `runtime.globals` controls what happens to reset, fontsource, and `$$.css` in runtime-only mode.

## 7) When to choose it

Choose `runtime` when:

- values must be resolved in the browser
- you want runtime-only CSS injection
- you need hybrid mode: server CSS plus browser evaluation
- you are building dashboards, editors, or other UI where style values depend on live state
