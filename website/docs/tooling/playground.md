---
title: Playground
---

Boss ships a WebContainer-powered playground so you can try the runtime without leaving the docs. It boots a Vite + React project in the browser, wires Boss init automatically, and keeps the UI close to a VSCode layout (activity bar, explorer, editor, terminal, preview).
The homepage "Launch Playground" call-to-action uses a high-contrast style so it stays readable across themes.

## Highlights

- Multiple panels: explorer, editor, terminal, and preview can be toggled independently.
- Mobile panel tabs: on small screens, switch between explorer, editor, terminal, and preview using icon tabs.
- Resizable panes: drag the dividers to resize the sidebar, terminal height, and preview.
- File management: add files or folders from the explorer.
- Folder controls: collapse or expand folders, delete entries, and drag files/folders to move them.
- Templates: pick from Boss CSS starter templates.
- Shareable state: the current workspace can be encoded into the URL so you can reload or share.

## Templates

- `boss-basic`: Inline-first runtime starter (tokens, pseudos, at rules).
- `boss-ai`: Basic runtime starter with the AI plugin enabled.
- `boss-classname-first`: Classname-first strategy with dynamic values as functions.
- `boss-classname-only`: Classname-only strategy (no runtime, className parsing only, imports `styles.css`).
- `boss-runtime-only`: Runtime-only strategy (client-side CSS injection).
- `boss-boundaries`: CSS boundaries with lazy-loaded sections + Suspense.
- `boss-bosswind`: Bosswind utilities + Tailwind-style tokens.
- `boss-bosswind-classname-only`: Bosswind utilities using classname-only parsing.
- `boss-html-only`: Plain HTML + Express server (no Vite, runs Express + a polling Boss build loop and reloads CSS/HTML on change).
- `boss-utils`: Composition helpers (cx, cv, scv, sv) with className + style object patterns.

Bosswind templates use the built-in Bosswind token set (playground token overrides are skipped).

Use the `template` fragment param to link directly to a template without embedding the full playground state:

```
/playground#template=boss-bosswind
```

## Tips

- Use Cmd/Ctrl + S to save the active file and trigger a rebuild (files are only written on save).
- Shared URLs exclude generated `.bo$$/` outputs (except `.bo$$/config.js` or `src/.bo$$/config.js`) and never embed `pnpm-lock.yaml`. If `package.json` diverges from the template, the lockfile is omitted so installs re-resolve.
- If the preview is blocked, you may need proper COOP/COEP headers in production. Entering `/playground` uses a hard page load so those headers are present on the document response, even when the link originates from docs/sidebar content.
- On mobile widths (`<=900px`), the playground shows one panel at a time with icon-only tabs; desktop split-pane behavior is unchanged.
- On the docs page (`/playground`), mobile keeps the navbar offset so panel tabs stay below the site header.
