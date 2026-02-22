---
name: boss-css-classname
description: "Classname syntax and shorthands. Use when writing className strings or converting from CSS."
license: "MIT"
metadata:
  author: "boss-css"
  version: "0.1.0"
---
# Goal
Write correct className tokens and shorthands.

# Guidance
- className tokens are mostly CSS prop:value (1:1 with props).
- Use unitless values (padding:12), and _ for space-separated values (padding:10_20).
- Avoid hardcoded default unit suffixes in class tokens (border:1_solid, not border:1px_solid).
- Prefer shorthand pseudos and breakpoints: hover:color:red, mobile:gap:12.
- For @at, prefer shorthand (mobile:...) over at:mobile:... when available.

# References
See .bo$$/LLMS.md for live props, pseudos, and breakpoints.
