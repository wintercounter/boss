---
name: boss-css-values
description: "Preferred value forms (arrays, unitless numbers, shadows). Use when deciding how to express CSS values."
license: "MIT"
metadata:
  author: "boss-css"
  version: "0.1.0"
---
# Goal
Use Boss-friendly value forms for consistent output.

# Guidance
- Prefer unitless numbers for numeric props (padding:12).
- Avoid hardcoded default unit suffixes in class tokens (border:1_solid, not border:1px_solid).
- Use arrays for shorthands: padding={[0, 10]}.
- Use token shorthands when available (boxShadow="md").
- For custom shadow values, use arrays: boxShadow={[1, 1, 0, '#fff']}.

# References
See .bo$$/LLMS.md for live tokens and props.
