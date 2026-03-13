---
title: Why Boss CSS
---

Boss CSS is a styling engine with two authoring inputs, multiple output strategies, and an optional compile step.

## A tiny taste

```tsx
import '../.bo$$'

export default function Hero() {
  return (
    <$$
      display="flex"
      gap={12}
      hover={{ color: 'white', backgroundColor: 'black' }}
      at={{ 'mobile+': { fontSize: 18 } }}
    >
      Inline + class output
    </$$>
  )
}
```

## The product shape

Think about Boss in three layers:

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

That separation matters:

- `classname-only` is the static className lane. It is not the whole no-generated-runtime story.
- `runtime` is the runtime strategy plugin. It is not the same thing as the generated runtime files.
- `compile` is an optional source-rewrite step. It is not a strategy.

## Features at a glance

- **Two authoring inputs**: use `$$` JSX props or static `className` / `class` tokens.
- **Multiple output strategies**: choose inline-heavy, class-heavy, static-class-only, or browser-evaluated output.
- **Generated runtime + types**: Boss writes `.bo$$/index.js` and `.bo$$/index.d.ts` for strategies that use JSX authoring.
- **Usage-driven CSS**: only used rules are emitted into `.bo$$/styles.css` and optional boundary files.
- **Optional compile step**: rewrite supported JSX ahead of your app build when you want source transforms.
- **Tokens + theming**: typed token access with `$$.token`.
- **Bosswind mode**: Tailwind-like aliases on top of the same engine.
- **Tooling agnostic**: use PostCSS, CLI build/watch, or your own build orchestration.
- **CSS boundaries**: split CSS by directory without changing authoring.
- **AI + devtools**: generated agent context, runtime inspection, and linting support.

## What Boss generates

Boss writes generated outputs. It does not expect you to hand-edit them.

- `.bo$$/index.js` and `.bo$$/index.d.ts` are the **generated runtime** for `inline-first`, `classname-first`, and `runtime`.
- `.bo$$/styles.css` and any `*.boss.css` files contain generated CSS for build/watch/PostCSS flows.
- `classname-only` skips the generated runtime files and only emits CSS.
- In `runtime.only`, Boss skips server strategy CSS and only emits `styles.css` when `runtime.globals: 'file'`.
- In compile temp mode, transformed source files and generated CSS are mirrored under `compile.tempOutDir`.

## Ideal use cases

Boss CSS works well when you need:

- Typed styling without committing the whole project to one authoring style.
- A JSX prop lane for component work and a static class string lane for templates or utility-style code.
- Strategy choices based on output trade-offs instead of rewriting every component.
- Browser-evaluated values when needed, without making every page pay that cost.
- A build step that can stay framework-agnostic.

## Learn the model

For the full mental model, read:

- [Core Concepts](/docs/concepts/core-concepts)
- [Thinking in Boss](/docs/concepts/thinking-in-boss)
- [Tooling-Agnostic by Design](/docs/concepts/tooling-agnostic)
