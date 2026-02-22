---
name: boss-css-authoring
description: "Boss CSS authoring conventions and style guidelines. Use when writing or reviewing $$ props, tokens, pseudos, @at, or className usage."
license: "MIT"
metadata:
  author: "boss-css"
  version: "0.1.0"
---
# Goal
Apply Boss CSS props cleanly with tokens and selectors.

# Guidance
- Prefer $$ props for structured styles over raw className strings.
- Use token keys (for example color="primary") when tokens exist.
- Use pseudos and @at for state and breakpoints instead of ad-hoc selectors.
- In classname-first, pass dynamic values as functions (prop={() => value}).
- In classname-first, return $$.token.* from dynamic functions when using tokens.
- Use child for nested selectors instead of manual selector strings.
- Prefer unitless values (padding:12). Use _ for spaces (padding:10_20).
- Avoid hardcoded default unit suffixes in class tokens (border:1_solid, not border:1px_solid).
- Prefer arrays for shorthands (padding={[0, 10]}).

# References
See .bo$$/LLMS.md for live tokens, pseudos, and breakpoints.
