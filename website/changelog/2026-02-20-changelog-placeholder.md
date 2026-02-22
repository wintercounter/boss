---
slug: coming-soon
title: Changelog Coming Soon
description: Placeholder entry while release notes are being prepared.
tags: [changelog]
---

This is a temporary placeholder for the changelog route.

<!-- truncate -->

Release notes will be published here starting with the initial public release.

Current in-progress updates:

- Added a mobile navigation menu for the website header.
- Restyled the mobile header layout/toggle and restored Docusaurus mobile sidebar navigation behavior.
- Ensured the floating back-to-top control appears after scrolling down on docs pages.
- Fixed desktop header alignment and mobile menu overlay stacking in docs.
- Made mobile sidebar full-width with solid dark styling, aligned menu rows to full content width, restored logo in sidebar header, clipped panel overflow artifacts, compacted mobile menu spacing, removed color switcher, and forced dark mode by default.
- Hardened navbar desktop/mobile visibility at Docusaurus breakpoints to prevent production CSS-order regressions that could hide navigation.
- Tightened mobile sidebar layout: removed top clipping, compacted menu typography/row spacing, normalized nested submenu alignment, and hardened sidebar header/logo styling.
- Swizzled `@theme/Logo` to render the live `MorphingLogo` component, so both default desktop and mobile sidebar headers use the exact same logo implementation as the custom site header.
