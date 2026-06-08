# Header logo, custom footer, and navigation rework

Design for **TASK-38** (Site Settings: header logo + custom footer) and
**TASK-15** (Layout & navigation: content width, sticky footer, custom nav
menus), taken together because they reshape the same surfaces — header,
footer, navigation, and the site-settings schema.

## Goal

Give the starter the chrome needed to import editorial landing-page sites such
as hi-resthemag.com: a logo wordmark, manual header/footer menus, a footer with
newsletter signup + social links + a credit line, a sticky footer, and a wider
default content width. Everything degrades gracefully when unset and is driven
by the existing theme/design tokens.

## Decisions (resolved during brainstorming)

- **Navigation model:** two fully manual menus (`headerNav`, `footerNav`) in
  Site Settings, ordered by drag in the CMS. The automatic pages-based nav and
  the existing `extraLinks` field are removed.
- **`navShow`:** repurposed to drive the docs-template sidebar only.
- **Signup:** a configurable form `action` URL (no injected third-party HTML).
- **Logo:** replaces the site-name text when set (name becomes the accessible
  label); left/center/right alignment.

## Components

### 1. Settings schema — `keystatic.config.ts`

Add to the `settings` singleton:

- `logo` — `fields.image` (uploads dir), optional.
- `logoAlign` — select: `""` (left, default) / `center` / `right`.
- `headerNav` — `fields.array({ label, url })`, itemLabel = label.
- `footerNav` — `fields.array({ label, url })`, itemLabel = label.
- `signup` — object:
  - `heading` — text, optional (e.g. "For events and updates").
  - `actionUrl` — text; the form POST endpoint (Mailchimp/Buttondown/etc.).
  - `buttonLabel` — text, default "Sign up".
  - `placeholder` — text, default "Email address".
- `socialLinks` — `fields.array({ label, url })`, itemLabel = label.

Repurpose:

- `footerText` — retained, now rendered as Markdown so the credit line can
  contain a link (e.g. `©2026 HI-RES — a project of [Raygun](https://…)`).
  Existing plain-text values render unchanged.

Remove:

- `extraLinks` — superseded by `headerNav`/`footerNav`. Leftover data keys in
  `settings.json` are simply ignored by the reader.

Unchanged on the `pages` collection: `navShow`, `navOrder` — now consumed only
by the docs sidebar.

### 2. Settings loader — `src/lib/site.ts`

- `getSettings()` exposes the new fields with safe defaults: `logo` (null),
  `logoAlign` (""), `headerNav` ([]), `footerNav` ([]), `signup` (object with
  empty `actionUrl` and the default button/placeholder strings), `socialLinks`
  ([]), `footerText` ("").
- Drop `extraLinks` from the returned shape.
- Remove `getNavPages()` (no longer used by header/footer). The docs sidebar
  reads collections directly (see §4).

### 3. Header — `src/components/Header.astro`

- Brand: if `site.logo`, render `<img src alt={site.name}>`; otherwise the
  site-name text link. The link always wraps to `/`.
- `logoAlign` applies a class to `.site-header` controlling brand position
  (`brand-center` / `brand-right`; left is the default flex layout).
- Nav: render `site.headerNav` links; an empty menu renders no `<nav>` (the
  Hi-Res nav-less header is an empty `headerNav` + centered logo).
- Drop the auto-nav `nav` prop. Keep `currentPath` so menu links can set
  `aria-current` when their URL matches the current path.

### 4. Docs sidebar — `src/components/DocsSidebar.astro`

Sidebar contents, in order:

1. Pages where `navShow !== false`, sorted by `navOrder`, linked to `/<slug>/`.
2. The `docs` collection entries, sorted by `order`, linked to `/docs/<slug>/`.

`navShow`/`navOrder` have no effect anywhere else.

### 5. Footer — `src/components/Footer.astro`

Renders, each section only when its data exists (AC5):

1. `footerNav` links row.
2. Signup: optional `signup.heading`, then
   `<form method="post" action={signup.actionUrl}>` with an `email` input
   (`placeholder`) and a submit button (`buttonLabel`). Rendered only when
   `actionUrl` is set. No JavaScript.
3. `socialLinks` row.
4. Credit line: `footerText` rendered as Markdown.

### 6. Layout — `public/assets/css/core.css` + theme files

- **Content width (AC1):** set `--content-width: 80rem` in all four theme files
  (`paper`, `signal`, `carbon`, `dune`).
- **Sticky footer (AC2):** `body { min-height: 100vh; display: flex;
  flex-direction: column; }` and `main { flex: 1 0 auto; }` so the footer sits
  at the viewport bottom on short pages.
- **Brand alignment:** `.site-header.brand-center` / `.brand-right` adjust
  `justify-content`; logo `<img>` gets a sensible max-height.
- **Footer styling:** signup form (inline email + button), social-links row,
  and credit line — all using `--color-*`, `--space-unit`, `--radius` tokens.

## Data flow

`settings.json` → `getSettings()` → `Base.astro` passes `site` to `Header` and
`Footer`. `DocsSidebar` reads the `pages` and `docs` collections via the
draft-aware `reader`. No new runtime dependencies.

## Error handling / graceful degradation

- No logo → site-name text. Empty menus → no nav markup. No `signup.actionUrl`
  → no form. No social links → no social row. Empty `footerText` → no credit
  line. All independently optional.
- The signup form posts directly to the provider; failures are handled by the
  provider's own response page (no client JS to fail).

## Testing

- Extend the existing `node --test` scaffold suite where pure logic exists
  (e.g. the docs-sidebar ordering merge, if extracted to a testable helper).
- Build verification: a demo page + settings exercising logo (centered),
  empty header menu, footer signup + social + Markdown credit; assert rendered
  markup (brand `<img>`, `<form action>`, social row, credit link) and that the
  full suite stays green.
- Confirm existing pages/posts render unchanged and the footer sticks on a
  short page.

## Out of scope / follow-ups

- **Wide prose at 80rem:** addressed by **TASK-45** (Text block width as a
  percentage of the baseline content width), not here.
- A dedicated dark/inverted footer background (Hi-Res's dark footer) can be
  achieved today via theme tokens; a footer-specific background option is a
  possible later addition.
