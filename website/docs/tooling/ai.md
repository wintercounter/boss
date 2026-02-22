---
title: AI Plugin
---

Boss CSS ships an AI plugin that generates `LLMS.md` and a skills bundle for AI assistants. It collects live metadata from plugins (tokens, pseudos, breakpoints, Bosswind, prepared components, boundaries, dev server info) and merges it with static guidance.

## Enable the plugin

`boss-css init` enables it by default. If you need to add it manually, include it in your server plugin list:

```js
import * as ai from 'boss-css/ai/server'

export default {
  plugins: [
    ai,
    // ...other plugins
  ],
}
```

Place it early in the list if other plugins emit AI metadata during `onBoot`.

## What it generates

- `.bo$$/LLMS.md` (default): a live reference for agents.
- `.bo$$/skills/` (default): Agent Skills directories (each contains `SKILL.md`).

Both are updated during build/watch/postcss/compile sessions.

## In-place updates

`.bo$$/LLMS.md` is updated by markers, so you can keep manual sections outside the blocks:

```md
<!-- boss:ai:summary:start -->
...generated content...
<!-- boss:ai:summary:end -->
```

If no markers exist, the plugin appends them.

## Configuration

```js
export default {
  ai: {
    llms: {
      enabled: true,
      path: '.bo$$/LLMS.md',
    },
    skills: {
      enabled: true,
      outputDir: '.bo$$/skills',
      includeBuiltins: true,
    },
  },
}
```

## Skills format

Boss-generated skills follow the Agent Skills spec: each skill lives in a folder with a `SKILL.md`.

You can add your own Boss-related skills by placing them directly under `.bo$$/skills/<name>/SKILL.md`.

```md
---
name: my-skill
description: What this skill does and when to use it
---
# Goal
Teach the agent something useful.
```

Built-in skills cover authoring, tokens, strategies, props, plugin authoring, and the dev server eval workflow.

## Install skills for your agent

Skill paths differ per agent. Use the `skills` CLI to install the generated skills into the correct location:

```bash
# install all generated skills into all agents (project scope)
npx skills add "./.bo$$/skills"

# if your configDir is src/.bo$$
npx skills add "./src/.bo$$/skills"

# install only for specific agents
npx skills add "./.bo$$/skills" -a codex -a claude-code

# install a single skill by path
npx skills add "./.bo$$/skills/boss-css-authoring"

# example when configDir is src/.bo$$
npx skills add "./src/.bo$$/skills/my-local-skill"
```

Quote paths containing `$$` to avoid shell expansion.

## Using with agents

Recommended inputs:

- `.bo$$/LLMS.md` (live usage + metadata)
- `.bo$$/skills/` (Agent Skills directories)
- `.bo$$/index.d.ts` (prop types)
- `.bo$$/config.js` (plugin order and configuration)

Prompt baseline:

```text
You are working on a Boss CSS project.
Read .bo$$/LLMS.md and scan the skills in .bo$$/skills.
Prefer tokens, breakpoints, and selectors exactly as listed in LLMS.md.
```

Agent setup examples:

- Codex CLI: `npx skills add "./.bo$$/skills" -a codex`
- Claude Code: `npx skills add "./.bo$$/skills" -a claude-code`
- Other agents: `npx skills add "./.bo$$/skills" -a <agent-id>`

Keep `.bo$$/LLMS.md` in your agent’s workspace instructions (for example `AGENTS.md` or `CLAUDE.md`).

## Live data from the dev server (optional)

If the devtools plugin and dev server are running, agents can request client-side data via `eval-client`.

```json
{ "type": "eval-client", "id": 1, "code": "return { href: location.href }" }
```

The dev server returns:

```json
{ "type": "eval-client-result", "id": 1, "ok": true, "result": { "href": "..." } }
```

This is dev-only and intended for local workflows.

## Adding dynamic sections

Any plugin can emit AI metadata using `onMetaData` and `kind: 'ai'`. See [AI Metadata](/docs/api/ai-metadata) for the payload shape.
