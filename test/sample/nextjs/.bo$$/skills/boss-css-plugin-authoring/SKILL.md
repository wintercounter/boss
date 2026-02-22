---
name: boss-css-plugin-authoring
description: "Creating Boss plugins and emitting metadata. Use when adding plugins or extending the prop pipeline."
license: "MIT"
metadata:
  author: "boss-css"
  version: "0.1.0"
---
# Goal
Add a new Boss plugin with the correct hooks and tests.

# Checklist
- Implement onBoot and onProp (or onParse/onPropTree for parser/strategy).
- Update dictionary and d.ts types via api.file.js.dts.
- Register the plugin in config order.
- Add tests under src/**/test.ts.
- Emit AI metadata with onMetaData (kind: "ai") when helpful.
