# Devserver Popup Refactor Plan

## Goals
- Redesign the devserver popup to support a wide range of CSS properties with a clear, fast UI.
- Match the feel of Photoshop layer styles + macOS Settings panels while keeping Boss conventions.
- Live preview on change; only persist to source on explicit Save.
- Use Base UI building blocks and Boss classnames; icons from @phosphor-icons/react.

## Non-goals
- Editing generated outputs (.bo$$/, dist/).
- Replacing the dev server protocol unless required for new UI state.

## High-level UX
- Left rail: grouped categories with status indicators (edited/dirty/error).
- Main pane: grouped property panels, collapsible, with section-level reset and search.
- Top right: settings button (cog icon).
- Bottom bar: Save, Reset, Undo, Redo, and status (dirty, last saved).

## Proposed CSS Groups (v1)
- Layout: display, positioning, sizing, box model, overflow, box-sizing, flex, grid, alignment.
- Typography: font, text, letter/word spacing, line-height, alignment.
- Background: color, image, gradient, position, size, repeat, blend.
- Border: border, radius, outline.
- Shadow/Effects: box-shadow, filter, backdrop-filter, opacity, mix-blend-mode.
- Transform: 2D/3D transform, transform-origin, perspective.
- Animation: transition + animation.
- List/Table: list-style, table-layout, border-collapse.
- SVG/Other: fill, stroke, vector-effect (as applicable).

## Iteration Plan
1) Inventory & architecture
   - Map current devtools popup structure, state model, and socket messages.
   - Identify existing UI components that can be reused or wrapped.
   - Capture inspiration notes from the CSS editor reference.
2) Data model & grouping
   - Define a property registry (group, label, input type, defaults, unit rules).
   - Map Boss dictionary + csstype metadata into the registry where possible.
   - Define change tracking (dirty, default, overridden) at prop + group level.
3) UI framework
- Create shadcn-like components on top of Base UI (panel, row, slider, input, select, toggle, color picker, token picker).
- Integrate third-party controls for complex inputs (e.g., Photoshop-like gradient editor), using latest versions.
   - Build the layout shell (left nav + main content + bottom actions).
4) Runtime behavior
- On open: snapshot current element props + inline styles + file info.
- On edit: apply inline style for live preview; update local state.
- On save: send final style object + prop edits to devserver; sync file.
- Tokens: resolve token metadata via a devtools-exposed host Boss instance (not globalThis.$$).
   - On reset/undo/redo: rollback local state + inline styles.
5) Polish + docs
   - Keyboard affordances, search, quick reset, tooltips.
   - Update docs to reflect the new UI flow and devserver behavior.
   - Add/adjust tests if needed.

## Progress Notes
- Added a Base UI-backed ButtonGroup with separators and applied it to the top tabs for the devtools popup.
- Switched devtools-app to the standalone `boss-css/variants` helper for className merging.
- Removed active tab inset shadows to avoid double-border artifacts in the ButtonGroup.
- Moved the panel selector into the header and upsized it to match the wireframe layout.
- Unified the panel footer into a shared shell bar with tab-specific actions.
- Restyled the CSS sidebar list to an iOS Settings-like list (icons on the left, active background highlight only).
- Collapsed the CSS sidebar by default (icon-only rail); hover expands over content with a pin toggle to lock it open.
- Pinned CSS sidebar now reserves content space and persists its state in local storage.
- Switched devtools primary accent to token `primary` (#ed4b9b) defined in `src/packages/devtools-app/src/.bo$$/config.js`.
- Replaced key CSS editor selects with button groups (text and icon-only) and added Base UI tooltips for icon controls.
- Converted most sections to a compact multi-column layout with full-width rows for complex controls.
- Added Photoshop-style label scrubbing for numeric and slider values.
- Added unit selector groups for numeric inputs with default unit sourced from the host config.
- Added overflow and background shorthand/longhand toggles, including axis overflow controls.
- Added a dedicated SVG group (fill/stroke/etc.) and renamed Advanced to Misc.
- Removed section title/description chrome to keep the editor dense.
- Added an Interaction group for cursor/pointer behavior.
- Expanded Typography with newer CSS properties (text-box-trim/edge, text-wrap, text-spacing-trim, line-clamp).
- Switched unit inputs to a single input+dropdown group with a shared border.
- Reworked unit input groups to use a flex layout with a divider on the unit trigger to eliminate double-border artifacts.
- Added an experimental compact number input row (label + value + unit) and trialed it on the Height field, with value-sized input capped at 4ch, bold number, unit sizing aligned to the value, tightened unit padding, no unit divider, label scrubbing enabled (integer steps, defaults to 0), an `arb` unit for non-numeric values, and no auto-unit insertion while typing partial numbers.
- Wired the compact input to a Base UI combobox for suggestions (tokens first, csstype-derived keywords next, csstype-derived common keywords last) that only opens on matching typing, plus a token icon trigger beside the unit selector.
- Rolled the compact number row across all numeric CSS editor property rows (including SVG extras) so number inputs share the combobox-backed control.
- Added a compact dropdown row (label inside, value hidden until selection) and swapped all select-style rows to use it.
- Replaced the section grid minmax layout with a wrap-first flex layout and updated SectionSpan to take full width.
- Converted option-group rows (including icon sets) to compact dropdowns and updated icon option labels for readable values.
- Reworked spacing controls to default to a shorthand compact number input with a split/merge icon toggle (showing full CSS prop names when expanded), grouped margin/padding/inset into a single row when collapsed without flex-grow, applied full-width layout when expanded, and removed gaps between the expanded inputs.
- Moved the spacing split/merge icon button to the leading edge of the row.
- Added a subtle divider between section groups across the CSS editor.
- Replaced the overflow mode button group with a leading split/merge icon toggle.
- Generalized the compact input row to support text values and replaced text inputs across the editor (starting with aspect-ratio and other string fields).
- Moved Flex/Grid sections directly after Display and hid them unless the matching display mode is active.
- Switched combobox usage to the named `Combobox` namespace export to match the Base UI subpath packaging.
- Keep the combobox selection in sync with the current input value to avoid clearing selected keywords on close.
- Move the devtools panel via Popover position offsets (align/side offsets) and disable anchor tracking so the panel stays put after layout changes.
- Prevent outside-press close while dragging, resizing, or scrubbing to avoid accidental dismissals, with a short post-interaction cooldown.
- Made option button groups non-shrinking with nowrap labels, and allowed them to wrap cleanly for long labels.
- Updated row layouts to wrap controls without overlap and added auto-wrap heuristics for option groups (plus SVG vector-effect wrapping).
- Extracted CssEditor internal row components into `src/packages/devtools-app/src/ui/css/editor-components.tsx` to reduce monolith size.
- Skipped classname template literals with expressions in the parser and added a regression test to prevent invalid CSS output.
- Removed template-literal class strings from ButtonGroup sizing to keep classnames static.
- Added a classname parser warning when template literals with expressions are detected, guiding users to cx().
- Swapped the remaining slider-style numeric inputs (opacity + transform) to CompactInputRow to keep numeric controls consistent.
- Added optional min/max/step support to CompactInputRow and applied 0–1 bounds with 0.01 scrubbing for opacity.
- Regrouped transform controls into translate/rotate/scale/skew/perspective sections and added a matrix input.
- Split Transition and Animation into separate sidebar groups, with shorthand/longhand toggles and longhand fields for each.
- Added ms/s units to compact number unit selectors for timing inputs.
- Added easing keyword suggestions for timing functions and clamped durations/delays to non-negative values.
- Stabilized compact input/dropdown alignment to prevent hover-induced text centering.
- Left-aligned combobox suggestions so hover highlights no longer center the label text.
- Added CompactInputRow renderBefore/renderAfter slots and wired timing-function inputs to open a Bezier spline editor panel.
- Moved timing curve buttons inside compact inputs and fixed Bezier editor sizing/dragging/color overrides.
- Aligned compact input inner content to keep inline icon buttons vertically centered.
- Added fallback token colors for the Bezier editor SVG strokes/fills.
- Tuned the Bezier editor to a square canvas with extended Y range and clarified anchor/control point styling.
- Moved color/gradient rows onto CompactInputRow and wired a minimal gradient picker inside the input.
- Restricted solid color pickers to solid mode and re-enabled solid-only controls while keeping gradient pickers compact.
- Anchored the color picker popover to the compact input container for bottom-left placement.
- Guarded the gradient picker against non-gradient values so dragging stops no longer yields NaN% errors.
- Normalized gradient stops passed to the picker so missing stop positions no longer crash the parser.
- Added gradient safety guards (tokens/invalid stops) to fall back to a default gradient instead of crashing.
- Validated gradient names/NaN values and sanitized picker updates to avoid corrupting stored gradients.
- Always re-serialized gradient stops (and filled missing positions) to keep picker values parseable during edits.
- Keep a last-known-good gradient for the picker, falling back when invalid strings appear mid-drag.
- Relaxed gradient sanitization to accept picker output when valid, while still rejecting NaN values.

## Open Questions
- Which devtools API name should expose the host Boss instance (e.g., `globalThis.host$$`)?
- Should gradient editing be a single shared panel or property-specific editors?
