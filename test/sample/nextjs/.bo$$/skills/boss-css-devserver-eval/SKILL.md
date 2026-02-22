---
name: boss-css-devserver-eval
description: "Request client-side data via eval-client over the dev server. Use when you need runtime state or DOM data during local dev."
license: "MIT"
compatibility: "Requires devtools plugin and a running dev server."
metadata:
  author: "boss-css"
  version: "0.1.0"
---
# Goal
Request client-side data by sending eval-client to the dev server.

# Usage
1) Connect to ws://localhost:<port> (port from dev server).
2) Send:
   { "type": "eval-client", "id": 1, "code": "return { href: location.href }" }
3) Receive:
   { "type": "eval-client-result", "id": 1, "ok": true, "result": { ... } }

# Notes
- Dev-only, local workflow. No safety checks.
- The code is executed in the devtools client window.

# References
See .bo$$/LLMS.md for dev server output paths.
