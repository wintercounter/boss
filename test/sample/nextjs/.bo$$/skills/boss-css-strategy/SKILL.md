---
name: boss-css-strategy
description: "Guidance for choosing inline-first, classname-first, or runtime-only. Use when deciding strategy or troubleshooting output size/runtime."
license: "MIT"
metadata:
  author: "boss-css"
  version: "0.1.0"
---
# Goal
Pick the rendering strategy that matches your app needs.

# Guidance
- inline-first: safest default; good for mixed dynamic/static props.
- classname-first: smallest runtime styles; use function values for dynamics and return $$.token.* for dynamic tokens.
- runtime-only: client-only CSS injection; reset/fontsource/token/$$.css output is controlled by runtime.globals.

# References
See .bo$$/LLMS.md for the active runtime strategy.
