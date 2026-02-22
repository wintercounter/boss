---
title: Why Boss CSS
---

Boss CSS is designed for teams that want a **polymorphic, usage‑driven pipeline** with **strong types**, minimal runtime, and flexible authoring styles.

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

## Features at a glance

- **Usage‑driven output**: runtime + types are generated from actual usage.
- **Polymorphic strategies**: inline‑first, classname‑first, runtime‑only, and classname‑only.
- **Zero‑runtime paths**: classname‑only or compile mode to drop the runtime entirely.
- **Tooling‑agnostic**: run via PostCSS/CLI only, no bundler plugin required.
- **JSX + className**: use `$$` props or CSS‑like className syntax with nested contexts.
- **Tokens + theming**: token variables + typed access with `$$.token`.
- **CSS boundaries**: split output by folder with `*.boss.css` files.
- **Bosswind mode**: Tailwind‑like props and classnames.
- **Composable**: prepared components, variants (`cv`/`scv`/`sv`), and `cx` helpers.
- **TypeScript‑first**: rich prop + token types without an IDE extension.
- **CLI + PostCSS**: init, watch, compile, and parse without framework-specific loaders.
- **Devtools + linting**: optional runtime inspection plus an ESLint plugin for authoring rules.
- **Tooling‑agnostic**: works without Babel/Webpack/Vite plugins; leans on TS types for DX.

## Thinking in Boss

If you want the conceptual model, read [Thinking in Boss](/docs/concepts/thinking-in-boss), [Core Concepts](/docs/concepts/core-concepts), and [Tooling-Agnostic by Design](/docs/concepts/tooling-agnostic).

## What is generated

Boss CSS does not edit your source files. It only writes generated outputs:

- `.bo$$/styles.css` for compiled CSS rules
- `.bo$$/index.js` for browser runtime setup
- `.bo$$/index.d.ts` for typed `$$` and token hints

When using `classname-only`, runtime files are not generated.

## Ideal use cases

Boss CSS works well when you need:

- **Consistent, typed styling** across large codebases.
- **Multiple authoring styles** (props + className) in the same project.
- **Runtime flexibility** for dynamic values without shipping heavy runtime CSS.
- **Token‑driven design systems** with scoped theming.

If you only need static classnames, use `classname-only` for zero runtime.
