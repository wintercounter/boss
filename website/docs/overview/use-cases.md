---
title: Use Cases
---

Boss CSS is flexible enough for many workflows. These are the best‑fit scenarios.

## Design systems

- Tokens define your system primitives.
- `$$.token` and `tokens` props make theming explicit and typed.
- Prepared components allow consistent base styles.

## Component libraries

- `$$` supports polymorphic components with `as`.
- `cv`/`scv`/`sv` provide variants and composable styles.
- Classname‑only output is great for shared UI with zero runtime.

## Apps with runtime dynamics

- Runtime‑only strategy handles truly dynamic values.
- Hybrid mode keeps server CSS but supports runtime evaluation.

## Non‑JSX or legacy codebases

- Use the className parser with `classname-only` to generate CSS from strings.
