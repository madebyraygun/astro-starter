# Reorganize Site Settings into functional sections

Design for **TASK-48**: split the single Site Settings screen into three
functional admin screens — **Site** (identity), **Design** (display), and
**Navigation** — using three Keystatic singletons.

## Singletons & field distribution

Replace the one `settings` singleton with three:

| Singleton (sidebar label) | Path | Fields |
|---|---|---|
| **Site** | `src/data/site` | `name`, `siteUrl`, `rssEnabled`, `template` |
| **Design** | `src/data/design` | `theme`, `logo`, `logoAlign`, `design` (the existing nested object: colors, fonts, radius/spacing/width, heading tokens, `headings`) |
| **Navigation** | `src/data/navigation` | `headerNav`, `footerNav`, `signup`, `socialLinks`, `footerText` |

**Why theme is in Design:** the TASK-46 theme-default previews work because the
`themeField` publishes the selected theme to a module store that the color/font
fields subscribe to **on the same page load**. Theme, colors, and fonts must
stay on one screen (Design) or the previews break.

The `design` field keeps its current nested-object shape (so
`design-overrides.js`, which reads `design.colorBg` etc., is untouched); in
`design.json` it appears as a nested `"design": { … }` key.

## Loader merge (the blast-radius container)

`src/lib/site.ts` `getSettings()` reads all three singletons and merges them into
one flat object, then passes it to the existing `normalizeSettings`:

```ts
export async function getSettings() {
  const [site, design, navigation] = await Promise.all([
    reader.singletons.site.read(),
    reader.singletons.design.read(),
    reader.singletons.navigation.read(),
  ]);
  return normalizeSettings({ ...site, ...design, ...navigation });
}
```

`normalizeSettings` already reads `s.name`, `s.theme`, `s.logo`, `s.design`,
`s.headerNav`, `s.signup`, etc. from a flat object — so it is **unchanged**, and
every consumer (`Header`, `Footer`, `Base.astro`, `design-overrides.js`, blocks)
is **unchanged**. The draft-aware reader in `site.ts` wraps all singletons
generically, so the three new singletons are draft-aware automatically.

## Data files

Split `src/data/settings.json` into three (and delete it):

- `src/data/site.json`: `{ "name": "New Site", "siteUrl": "", "rssEnabled": true, "template": "blog" }`
- `src/data/design.json`: `{ "theme": "paper", "logo": null, "logoAlign": "", "design": {} }`
- `src/data/navigation.json`: `{ "headerNav": [], "footerNav": [], "signup": { "heading": "", "actionUrl": "", "buttonLabel": "Sign up", "placeholder": "Email address" }, "socialLinks": [], "footerText": "" }`

`keystatic.config.ts`'s top-level `import settings from "./src/data/settings.json"`
(used for `template` and `brandName`) switches to `./src/data/site.json`.

## Scaffold

`scaffold/scaffold.js` currently writes `template`/`theme`/`name` into
`src/data/settings.json`. It now writes `template` + `name` into `site.json` and
`theme` into `design.json` (reading/writing both files; same validation-first
approach).

## Live-preview coupling (TASK-42)

Design tokens move from `settings.json` to `design.json`, so the draft bridge's
allowlists must include the new singleton files instead of `settings.json`:

- `integrations/draft-overlay.js` `safeDraftPath`: allow `src/data/site.json`,
  `src/data/design.json`, `src/data/navigation.json` (replacing the single
  `settings.json` entry). Keep the traversal guard.
- `integrations/content-reload.js`: replace the `endsWith("/src/data/settings.json")`
  reload trigger with the three new files (the `src/data` directory watch already
  exists).
- **push-pop** `Sources/PushPopCore/DraftRelay.swift`: the path filter forwards
  `src/content/` + the three `src/data/*.json` singleton files (replacing the
  single `src/data/settings.json`).

## Data flow

`site.json` / `design.json` / `navigation.json` → `getSettings()` merge →
`normalizeSettings` → unchanged consumers. Live token preview: admin draft →
relay (allows `design.json`) → overlay → draft-aware reader → `getSettings` →
`Base.astro` `:root` injection.

## Error handling / edges

- Missing/empty singleton reads → `normalizeSettings` fills defaults (already
  handles `null`/missing keys).
- The three singletons are independent screens; saving one does not touch the
  others.
- **Breaking change:** existing sites' single `settings.json` no longer matches;
  they need re-scaffolding or manual migration (consistent with the `extraLinks`
  removal). The starter and the test site are rebuilt from scaffold.

## Testing

- **Unit:** `normalizeSettings` already covers the merged flat shape (existing
  `scaffold/site-helpers.test.js`); add a case asserting it normalizes an object
  spread from three partial singletons. Update `scaffold/draft-overlay.test.js`
  to assert the three new data paths are allowed and a non-singleton `src/data`
  file is rejected. Update push-pop `DraftRelayTests` for the new allowlist.
- **Build:** `astro build` clean; `npm test` green; `swift test` green.
- **Visual (headless Chrome on `/admin`):** sidebar shows three singletons
  (Site, Design, Navigation); each screen holds its fields; editing/saving each
  works; the Design screen's theme/color/font previews still work; a design-token
  edit still live-previews (relay path widened).

## Out of scope

- Renaming or restructuring the `design` nested object (kept as-is to avoid
  touching `design-overrides.js`).
- Field-level reordering within a screen beyond the natural grouping.
