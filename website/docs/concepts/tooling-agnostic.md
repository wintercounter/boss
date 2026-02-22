---
title: Tooling-Agnostic by Design
---

Boss CSS is built to be tooling agnostic. It does not depend on Babel, Webpack, Vite, or any specific framework compiler. You can run it through PostCSS, the Boss CLI, or your own build orchestration without tying your project to a single toolchain.

## Why this matters

- **Portable setup**: move between build systems without changing your styling API.
- **Predictable output**: parsing and CSS generation always run through the same Boss pipeline.
- **No compiler lock‑in**: you can integrate in places where Babel/SWC plugins are not available.

## Type-driven DX instead of editor extensions

Boss puts most of the editor experience in TypeScript types rather than editor plugins:

- **Accurate CSS prop types**: generated from Webref and CSSType, so you get full CSS property docs and values.
- **Token-aware props**: props with tokens offer token key autocomplete and value hints.
- **Runtime + prepared types**: the generated runtime ships types for prepared components and Boss props out of the box.

## Tradeoffs

- **Classname autocomplete is limited**: className strings are plain strings, so TypeScript can’t autocomplete them.
- **Validation still exists**: use the Boss ESLint plugin to validate classnames, props, and tokens inside class strings.

If you want full className autocomplete, prefer the JSX/prop syntax where types can guide you, and use the ESLint plugin to keep class strings safe.
