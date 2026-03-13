---
title: Core Concepts
---

This page is the shortest version of the Boss CSS mental model.

## The three layers

Boss is easiest to reason about when you separate these layers:

1. **Authoring inputs**
   - `$$` JSX props
   - Static `className` / `class` tokens
2. **Output strategies**
   - `inline-first`
   - `classname-first`
   - `classname-only`
   - `runtime`
3. **Build modes**
   - PostCSS
   - `npx boss-css build` / `watch`
   - optional `npx boss-css compile`

Most confusion comes from mixing those layers together. Strategy answers “what kind of output do I want?”. Build mode answers “how do I generate or rewrite that output?”.

## The pipeline, in 30 seconds

1. Config is loaded from `.bo$$/config.js` plus optional `package.json` overrides.
2. Parsers read your chosen authoring inputs and build a normalized prop tree.
3. Prop plugins handle CSS props, selectors, tokens, and other features.
4. The selected strategy decides what becomes inline styles, class rules, runtime work, or browser-injected CSS.
5. Boss writes generated CSS and, when needed, generated runtime files.

See [Plugin Pipeline](/docs/concepts/pipeline).

## Authoring inputs

- `$$` JSX props are the primary component authoring surface.
- Static `className` / `class` tokens are the static string authoring surface.
- You can mix both in many build flows, but not every strategy supports every input:
  - `classname-only` is the static className lane.
  - `runtime.only` disables className parsing.
  - `compile` currently rewrites JSX only.

## Output strategies

- **`inline-first`**: base JSX props prefer inline styles; nested contexts become CSS rules.
- **`classname-first`**: static JSX props prefer generated class rules; dynamic values must be functions.
- **`classname-only`**: parse static class strings into CSS and skip generated runtime files.
- **`runtime`**: use the runtime strategy wrapper for runtime-only or hybrid browser evaluation.

See [Strategies](/docs/concepts/inline-first).

## Build modes

- **PostCSS / `build` / `watch`** generate CSS and, when needed, generated runtime files.
- **`compile`** is optional. It rewrites supported JSX source after you already chose a strategy.

Compile currently supports JSX with `inline-first` and `classname-first`. It is not a fifth strategy.

## Generated runtime vs runtime strategy vs compile

These terms are related but different:

- **Generated runtime**: `.bo$$/index.js` and `.bo$$/index.d.ts`.
- **Runtime strategy**: the `runtime` strategy plugin that runs styles in the browser in runtime-only or hybrid mode.
- **Compile**: the optional source-rewrite step run with `npx boss-css compile`.

If those three are clear, the rest of the docs become much easier to follow.

## Tokens

Tokens are typed from config and are available through `$$.token`.

See [Tokens](/docs/usage/tokens).
