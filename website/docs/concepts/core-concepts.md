---
title: Core Concepts
---

This page collects the mental model you need to use Boss confidently.

## The pipeline

Boss parses your source files, builds a prop tree, runs strategy logic, and emits CSS/runtime/types.

See [Plugin Pipeline](/docs/concepts/pipeline).

## The pipeline, in 30 seconds

1. Config is loaded from `.bo$$/config.js` (plus `package.json` overrides).
2. `createApi()` wires dictionaries, CSS output, and file generators.
3. Parsers (`jsx`, `classname`) build a prop tree from your source.
4. A strategy (`inline-first`, `classname-first`, `classname-only`, or `runtime`) decides how CSS is emitted.
5. Prop plugins (`reset`, `fontsource`, `css`, `pseudo`, `at`, `child`, `token`) emit CSS rules.
6. Runtime files are generated in `.bo$$/` and imported by your app.

## Usage‑driven output

Boss only generates what you use. Runtime, CSS, and types are all usage‑driven.

See [Polymorphic CSS‑in‑JS](/docs/overview/polymorphic-css-in-js).

## Strategies

Choose how props become output:

- **Inline‑first**: minimal CSS output
- **Classname‑first**: static values become classnames
- **Classname‑only**: no runtime, className strings only
- **Runtime**: runtime‑only or hybrid output

When a strategy emits classnames, Boss uses atomic CSS generation for those class rules.

See [Strategies](/docs/concepts/inline-first).

## Tokens

Tokens compile to CSS variables and are typed based on your config.

See [Tokens](/docs/usage/tokens).

## Runtime vs compile

Boss can run:

- in PostCSS/build mode (server CSS output),
- in runtime‑only mode,
- or with `npx boss-css compile` for build‑time transforms.

See [Compile](/docs/tooling/compile).
