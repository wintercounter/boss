---
name: boss-css-classname-only
description: "Classname-only mode guidance. Use when running classname-only strategy or migrating from utility classes."
license: "MIT"
metadata:
  author: "boss-css"
  version: "0.1.0"
---
# Goal
Use classname-only mode correctly.

# Guidance
- Classname-only skips JSX parsing and runtime output.
- Only className strings are processed; props are ignored.
- Import styles.css manually in your app entry.

# References
See .bo$$/LLMS.md for outputs and strategy.
