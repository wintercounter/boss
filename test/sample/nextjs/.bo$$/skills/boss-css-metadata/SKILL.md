---
name: boss-css-metadata
description: "Emitting AI metadata from plugins. Use when you want LLMS sections or custom AI hints."
license: "MIT"
metadata:
  author: "boss-css"
  version: "0.1.0"
---
# Goal
Publish metadata to LLMS.md for agents.

# Guidance
- Emit api.trigger('onMetaData', { kind: 'ai', data: { section, title, content } }).
- Use replace: true for snapshots (prepared, boundaries).
- Keep content as ready-to-render markdown.

# References
See .bo$$/LLMS.md and AI metadata docs.
