---
name: boss-css-boundaries
description: "CSS boundary rules and .boss.css behavior. Use when adjusting CSS scoping or boundary outputs."
license: "MIT"
metadata:
  author: "boss-css"
  version: "0.1.0"
---
# Goal
Understand CSS boundaries and output files.

# Guidance
- .boss.css files define boundary scopes for CSS output.
- Boundaries are resolved by nearest .boss.css in the directory tree.
- Use css.boundaries.ignore to skip paths.

# References
See .bo$$/LLMS.md for boundary files.
