# Website

This website is built using [Docusaurus](https://docusaurus.io/), a modern static website generator.

## Design tokens

The site theme uses a Dracula-inspired palette defined in `src/css/custom.css`. Update the CSS variables there to
adjust brand colors, glass effects, and dark/light mode behavior. The background gradients are fixed to the viewport
for a stable scroll experience, and section overlays are kept translucent to let the global backdrop show through.
Layout defaults keep `html`/`body` height auto with a 100% min-height for reliable scrolling.
Homepage sections use subtle divider gradients driven by `--boss-divider` to visually separate content blocks.
The homepage mirrors the v0 Next.js layout using Tailwind utility classes only (no CSS modules): gradient hero with
heart-shaped floating code showcases (hovercard-enabled and hidden on smaller screens), an expanded feature
constellation grid with mixed card sizes, and the strategy matrix section.
Homepage section order is `HeroSection -> HomepageFeatures -> StrategyMatrix` in `src/pages/index.js`.
The feature grid ordering alternates `big small small` then `small small big`; keep the array order aligned and avoid manual grid placement classes. Big cards use `size: 'xl'` or `size: 'large'` (col-span-2). Icons are unique per card.
Hero floating snippets are stored with literal line breaks in `src/pages/index.js` to keep the examples easy to edit.
The homepage uses a lightweight scroll listener to auto-jump from the hero to the feature grid on first scroll and re-arm when the user returns to the top.
Prism highlighting is configured in `docusaurus.config.js` with PHP enabled via `additionalLanguages` and a `clientModules` import in `src/prism-languages.js`.
The hero title uses an SVG text mask with the `boss-text-bg-high.mp4` video to clip the video into the headline.
A fixed, subtle glow backdrop is applied site-wide using layered radial gradients in `src/css/custom.css`.
The navbar and footer are swizzled to match the v0 layout and include a version stamp pulled from `package.json`.
The favicon is generated from the project logo at `website/static/img/favicon.webp`.

## Search and analytics setup

The docs site can enable Algolia DocSearch and Google Analytics (GA4) through environment variables.

Create `website/.env` (or `/.env` at repo root, or set equivalent env vars in Netlify/Vercel):

```bash
# Algolia DocSearch (all 3 required together)
DOCUSAURUS_ALGOLIA_APP_ID=
DOCUSAURUS_ALGOLIA_API_KEY=
DOCUSAURUS_ALGOLIA_INDEX_NAME=

# Google Analytics 4 (either name works)
DOCUSAURUS_GTAG_TRACKING_ID=
# DOCUSAURUS_GTAG_ID=
```

Notes:
- Algolia is enabled only when all 3 Algolia variables are set.
- If only some Algolia variables are set, the build will fail with a clear error.
- Google Analytics is enabled when `DOCUSAURUS_GTAG_TRACKING_ID` (or `DOCUSAURUS_GTAG_ID`) is set.
- A small client shim (`src/gtag-shim.js`) keeps `window.gtag` defined to avoid route-change errors when analytics scripts are blocked.
- The docs search UI is rendered by swizzled components in `src/theme/Navbar/index.js`, `src/theme/Navbar/MobileSidebar/Header/index.js`, and `src/theme/SearchBar/index.js`.
- `src/theme/SearchTranslations/index.js` is provided as a local fallback so swizzled search builds cleanly in CI environments where the Algolia theme alias chain is unavailable.
- Search button/icon contrast is intentionally bound to `--foreground` in `src/theme/SearchBar/styles.css` so desktop placeholder text remains visible in dark mode production builds.

## Temporarily disabled routes

Blog and changelog routes are currently disabled on purpose:
- Blog is set to `blog: false` in `website/docusaurus.config.js`.
- Changelog plugin config is commented out in `website/docusaurus.config.js`.
- Blog/changelog navbar and footer links are commented out in `website/docusaurus.config.js`.
- Swizzled navbar/footer links are also commented out in:
  - `website/src/theme/Navbar/index.js`
  - `website/src/theme/Footer/index.js`

To re-enable later, uncomment those blocks and restore the links in the same file.

## Installation

```bash
yarn
```

## Local Development

```bash
yarn start
```

This command starts a local development server and opens up a browser window. Most changes are reflected live without having to restart the server.

## Build

```bash
yarn build
```

This command generates static content into the `build` directory and can be served using any static contents hosting service.

## Deployment

Using SSH:

```bash
USE_SSH=true yarn deploy
```

Not using SSH:

```bash
GIT_USER=<Your GitHub username> yarn deploy
```

If you are using GitHub pages for hosting, this command is a convenient way to build the website and push to the `gh-pages` branch.

### Netlify headers for playground

The playground requires cross-origin isolation in production. Netlify headers are configured in `website/netlify.toml`
for `/playground` and `/playground/*`:
- `Cross-Origin-Opener-Policy: same-origin`
- `Cross-Origin-Embedder-Policy: credentialless`
- `Cross-Origin-Resource-Policy: cross-origin`

Because COOP/COEP headers are applied on document responses, `/playground` entry uses hard navigation.
Custom UI links use plain anchors, and `src/playground-hard-navigation.js` enforces a document navigation for any
same-origin link targeting `/playground` (including links rendered from docs/sidebar content).
