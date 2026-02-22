---
title: Compatibility
---

Boss CSS works anywhere you can run a Node build step or PostCSS pipeline.

## Frameworks

Boss runtime supports out of the box:

- React, React Native, Next.js, Preact, Solid, Qwik, Stencil

Framework detection is automatic but can be overridden in config.

## Any language with className

In **classname‑only** mode, Boss works with any language or template system that can emit static class strings.

## Build tools

- PostCSS (recommended for most web apps)
- `npx boss-css build` / `npx boss-css watch` (for non‑PostCSS setups, e.g. Stencil)
- `npx boss-css compile` (optional build‑time transform)

## Runtime modes

- Inline‑first / classname‑first: server CSS + runtime for dynamic values
- Runtime‑only: no server CSS output
- Classname‑only: no runtime at all
