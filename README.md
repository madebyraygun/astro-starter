# astro-starter

The Astro + Keystatic engine that [Push Pop](https://github.com/madebyraygun/push-pop)
clones when creating a new site. One shared engine, three templates:

- **Blog** — posts, archive, about
- **Portfolio** — projects with covers and galleries
- **Docs** — sidebar-ordered documentation pages

## How a site is created

Push Pop runs, in order:

```sh
git clone <this repo> <site>
node scaffold/scaffold.js --template=<blog|portfolio|docs> --theme=<paper|signal|carbon|dune> [--name='Site Name']
npm install
```

`scaffold.js` overlays the template's seed content onto `src/`, records the template
and theme in `src/data/settings.json`, and deletes `scaffold/`.

## Architecture

- `src/components/blocks/` — the page-builder blocks (heading, text, image, gallery,
  faq, cta). A page is a `blocks` list edited in Keystatic; the page layout renders it.
  Adding a block type = one component here + one schema entry in `keystatic.config.ts`.
- `public/assets/css/core.css` — all structure and layout, consuming tokens only.
- `public/assets/css/themes/` — one design-token file per theme. Owners switch themes
  in the Keystatic Site Settings singleton. Every theme must define the full token set
  (`node scaffold/check-themes.js` enforces this).
- Site Settings → Customize Design overrides any token per-site (colors, fonts, radius,
  spacing, content width); set values render as a `:root` style block after the theme
  stylesheet, unset values fall back to the theme. Fonts come from the curated catalog
  in `src/data/fontCatalog.json`; missing woff2 files download from the Fontsource CDN
  at build time into `public/assets/fonts/` (committed on publish, so published sites
  stay fully self-hosted). `node scaffold/check-fonts.js` keeps the catalog and the
  Keystatic dropdowns in sync.
- `src/data/settings.json` — site name, active theme, extra nav links, footer text.
  Exposed in Keystatic as Site Settings.
- Navigation builds automatically from pages with `navShow`/`navOrder` front-matter;
  Site Settings adds extra links and footer text.

## The admin

During development the Keystatic admin UI is available at `/keystatic` on any browser
over plain HTTP. Production builds are pure static — the `SKIP_KEYSTATIC` build flag
excludes the admin and ships no CMS runtime or React.

## Develop

```sh
npm install
npm test                        # scaffold.js tests (node:test, no deps required)
node scaffold/check-themes.js   # theme token completeness
node scaffold/check-fonts.js    # font catalog / CMS dropdown sync
```

To try a template locally, copy the repo to a scratch directory, run `scaffold.js`,
then `npm install && npm run dev`. The Keystatic admin will be live at
`http://localhost:8088/keystatic`.

CI builds all three templates on every push and asserts that `dist/keystatic` is absent
and no React runtime is present in the output.
