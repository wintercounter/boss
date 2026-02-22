---
name: boss-css-debugging
description: "Debug logging and troubleshooting. Use when investigating Boss parsing, strategy, or CSS output issues."
license: "MIT"
metadata:
  author: "boss-css"
  version: "0.1.0"
---
# Goal
Enable and interpret Boss debug logs.

# Guidance
- Use config.debug or BOSS_DEBUG to enable logs.
- Narrow scopes with namespaces (boss:parser:jsx, boss:strategy:inline-first).
- Disable noisy areas with -boss:css.

# References
See .bo$$/LLMS.md for outputs and active strategy.
