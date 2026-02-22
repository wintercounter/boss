---
name: boss-css-compile
description: "Boss compile usage and constraints. Use when running boss-css compile or deciding if compile is appropriate."
license: "MIT"
metadata:
  author: "boss-css"
  version: "0.1.0"
---
# Goal
Use boss-css compile correctly and understand its constraints.

# Guidance
- Compile rewrites $$ JSX into plain elements and can remove runtime imports.
- Compile only supports inline-first or classname-first strategies.
- Avoid spreads if compile.spread is false; spreads can force runtime.
- Prefer static props so compile can fully rewrite output.

# References
See .bo$$/LLMS.md for compile settings and strategy.
