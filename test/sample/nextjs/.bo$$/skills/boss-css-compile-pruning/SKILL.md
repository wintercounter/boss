---
name: boss-css-compile-pruning
description: "How to keep compile output runtime-free. Use when you want compile to prune Boss runtime imports."
license: "MIT"
metadata:
  author: "boss-css"
  version: "0.1.0"
---
# Goal
Let compile prune Boss runtime imports when possible.

# Guidance
- Avoid dynamic props that require runtime (functions, spreads without compile.spread).
- Avoid unresolved prepared components (they force runtime).
- Keep JSX props static when possible so compile can rewrite fully.
- Ensure your strategy is inline-first or classname-first (compile requirement).

# References
See .bo$$/LLMS.md for strategy and compile settings.
