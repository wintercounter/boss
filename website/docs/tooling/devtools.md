---
title: Devtools and Dev Server
---

Boss CSS ships an experimental devtools plugin that starts a local WebSocket server and enables in-app inspection and editing.

## Enable the plugin

Add the devtools plugin to your server plugin list:

```js
import * as devtools from 'boss-css/dev/plugin/server'

export default {
  plugins: [
    // ...your normal plugins
    devtools,
  ],
}
```

The plugin is **dev-only**. It is skipped when `NODE_ENV=production`.

## What it does

When enabled in dev:

- Injects a dev client into the runtime.
- Starts a local WebSocket server (default port `48400`).
- Exposes live inspection and edits from the devtools app.

## Features exposed by the server

- Select a source location and return the resolved Boss props.
- Edit existing props or add new ones.
- Read/write source files (for editor integrations).
- Fetch current token values.
- Fetch generated Boss types.
- Run dev-only client evals via `eval-client` (useful for AI/debugging).

## Configuration

```js
export default {
  devServer: {
    port: 48400,
    autoStart: true,
  },
}
```

- `port`: preferred dev server port.
- `autoStart`: when `false`, the dev server will not start automatically from PostCSS/watch sessions.

## When it starts

The dev server auto-starts during `npx boss-css watch` and PostCSS runs (if `autoStart` is not `false`).
You can also start it manually with `npx boss-css dev` when that command is available in your setup.

## Devtools app

The devtools UI is a separate app that connects to the local server. It is exported as `boss-css/devtools-app`.

## Eval client (dev-only)

If the devtools plugin and dev server are running, you can request a client-side eval:

```json
{ "type": "eval-client", "id": 1, "code": "return { href: location.href }" }
```

The server responds with:

```json
{ "type": "eval-client-result", "id": 1, "ok": true, "result": { "href": "..." } }
```

The code runs in the devtools client window, so keep this dev-only and local.
