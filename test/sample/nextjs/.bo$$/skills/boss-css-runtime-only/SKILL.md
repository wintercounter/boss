---
name: boss-css-runtime-only
description: "Runtime-only strategy guidance. Use when enabling runtime.only or troubleshooting client-only CSS injection."
license: "MIT"
metadata:
  author: "boss-css"
  version: "0.1.0"
---
# Goal
Use runtime-only mode safely.

# Guidance
- runtime.only: true disables server CSS output.
- runtime.globals controls reset/fontsource/token/$$.css output in runtime-only:
  - inline injects globals at runtime.
  - file emits styles.css even in runtime-only.
  - none skips global CSS output.
- Keep JSX parser enabled and include the runtime strategy plugin.

# References
See .bo$$/LLMS.md for runtime settings and outputs.
