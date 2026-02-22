# Runtime-only + Hybrid Plan

## Goals

-   Add a runtime-only mode that generates CSS on the client only (no PostCSS, no server CSS output).
-   Add a hybrid mode that keeps existing server CSS output and also enables runtime for extra `$$` usage at runtime.
-   Support `runtime.strategy: inline-first | classname-first | classic`.
-   Support SSR markup with the same className/style construction as client runtime; CSS is still client-only in
    runtime-only mode.
-   Runtime-only scope is `$$` props only (no className parsing for now).

## Config shape

-   `runtime.only: boolean`
-   `runtime.strategy: 'inline-first' | 'classname-first' | 'classic'`

Notes:

-   When `runtime.only` is false, runtime is still enabled (hybrid) and uses `runtime.strategy`.
-   When `runtime.only` is true, server CSS generation is skipped; runtime still emits className/style during SSR, but
    CSS insertion is client-only.

## Strategy behaviors (runtime)

-   inline-first:
    -   Top-level CSS props become inline styles.
    -   Nested contexts (pseudo/at/child) emit class rules + variables if needed.
-   classname-first:
    -   All values treated as runtime-known; classnames include values.
    -   No function-only requirement for dynamic values.
-   classic:
    -   One class per element: `.hash { ...all base styles... }`.
    -   Pseudo/at/child use the same base class in selectors.

## Tokens (runtime)

-   In runtime-only, tokens resolve to literal values at runtime (no CSS variables required).
-   In hybrid, keep current token behavior for server CSS output; runtime may still resolve tokens for any runtime-only
    rules.

## Runtime-only entry points

-   Add runtime-only modules for clean separation:
    -   `src/strategy/inline-first/runtime-only.ts`
    -   `src/strategy/classname-first/runtime-only.ts`
    -   `src/strategy/classic/runtime-only.ts`
    -   `src/use/token/runtime-only.ts`
-   Keep existing browser/server modules intact, but you can extract parts into a shared utils.ts file for example if
    needed.

## Runtime CSS injection (client)

-   Use a single `style` tag + `CSSStyleSheet.insertRule` where possible.
-   Maintain a `Set` of inserted rule keys to dedupe (classname or rule string is sufficient).
-   Rule key can be the full selector + declarations + query string (no hashing needed unless size becomes an issue).

## SSR behavior

-   Runtime runs during SSR to construct className/style output the same way as client.
-   No CSS is emitted on server in runtime-only mode.
-   Hybrid mode preserves server CSS output as-is.

## Classname parsing

-   Not supported in runtime-only for now.
-   If needed later, prefer compile-time conversion from className strings to props.

## Integration plan (high level)

1. Add runtime-only CSS writer (client) with `insertRule` + dedupe `Set`.
2. Add runtime-only CSS writer (server SSR) that only builds className/style output and ignores CSS output.
3. Add runtime-only strategy implementations (inline-first, classname-first, classic) using existing prop plugins.
4. Add runtime-only token resolver (literal values only).
5. Wire `runtime.only` and `runtime.strategy` into runtime file generation and plugin loading.
6. Hybrid mode: keep current server CSS output and add runtime-only plugins to runtime bundle.

## Risks / watch-outs

-   Runtime-only may show unstyled content until client inserts CSS.
-   Classic strategy needs a stable className key; prefer Boss style (readable or short hash).
-   Ensure runtime-only does not conflict with existing browser runtime when hybrid is enabled.

## Hybrid duplicates
- In hybrid mode, runtime only dedupes rules it inserts itself.
- No server stylesheet scanning or hydration manifest; duplicates from server CSS are allowed.
- Duplicate rules are considered acceptable overhead.
