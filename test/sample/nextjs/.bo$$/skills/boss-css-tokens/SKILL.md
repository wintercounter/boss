---
name: boss-css-tokens
description: "Token authoring and usage. Use when defining tokens, consuming them in props/className, or overriding tokens at runtime."
license: "MIT"
metadata:
  author: "boss-css"
  version: "0.1.0"
---
# Goal
Use tokens consistently and keep theme data centralized.

# Guidance
- Define tokens in config (tokens: { color: { primary: "#..." } }).
- Prefer token keys for props (color="primary") over $$.token.*.
- Use tokens prop for runtime overrides when needed.
- Keep token groups small and named by prop or intent.
- Prefer token shorthands for shadows (boxShadow="md") when provided.

# References
See .bo$$/LLMS.md for live token groups.
