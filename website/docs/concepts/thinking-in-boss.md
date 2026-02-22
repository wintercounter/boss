---
title: Thinking in Boss
---

Boss CSS is not just “props or className”. It’s a pipeline that turns usage into output. Once you internalize that, the rest of the system makes sense.

## 1) Authoring is flexible

You can mix:

- **JSX props** with `$$`
- **Static className tokens** in templates
- **Prepared components** for reusable styles

This lets teams adopt Boss incrementally and meet different code styles where they are.

## 2) Output follows usage

Boss only emits what you actually use:

- Types reflect your real tokens and prepared components.
- Runtime handlers only appear when required.
- CSS output stays small and scoped.

See [Polymorphic CSS‑in‑JS](/docs/overview/polymorphic-css-in-js).

## 3) Strategies are trade‑offs, not forks

Inline‑first, classname‑first, runtime‑only, and classname‑only are all views of the same pipeline.
Choose the strategy that matches your needs without rewriting your authoring style.

## 4) Props are a language

Boss props encode:

- **Selectors** (`hover`, `child`, `at`)
- **Tokens** (`color="brand"`)
- **Values** (arrays, functions, objects)

The pipeline then decides how to serialize them based on strategy.

## 5) Composition is built‑in

Use:

- `$$.style` to compute output on any element
- `$$.cx` and `$$.merge` for composition
- `cv`/`scv`/`sv` for variants

You don’t need extra tooling to build a system of reusable styles.
