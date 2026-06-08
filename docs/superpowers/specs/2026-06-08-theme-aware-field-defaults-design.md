# Theme-aware color swatch + font picker defaults

Design for **TASK-46**: in Site Settings, when a color token or font is left
unset (theme default), the custom Keystatic fields should preview the **active
theme's** value — the color swatch should show the theme's color (not black) and
the font field should show the theme's actual font name rendered in that
typeface (not the literal "Theme default").

## Constraint

A Keystatic `BasicFormField` `Input` is isolated: it receives only its own
`{ value, onChange, autoFocus, forceValidation }`. Keystatic exposes no general
form-state context to fields (only a slug-specific `SlugFieldContext`) and no
global admin script/CSS hook (`ui` config is brand + navigation only). So a
color/font field cannot read the selected `theme` sibling through any API.

**Resolution (approach A):** replace the `theme` select with a custom field
that publishes the selected theme to a module-level store; the color/font fields
subscribe. Theme *values* are read at runtime by fetching
`/assets/css/themes/<slug>.css` and parsing the CSS custom properties — no
generated file, no duplication, zero drift.

## Components

All in `src/keystatic/fields.tsx` unless noted.

### 1. `parseThemeCss(cssText)` — `lib/theme-tokens.js` (pure, testable)

Extracts CSS custom properties from a theme stylesheet string:

```js
export function parseThemeCss(cssText) {
  const out = {};
  const re = /(--[a-z-]+)\s*:\s*([^;]+);/gi;
  let m;
  while ((m = re.exec(cssText))) out[m[1]] = m[2].trim();
  return out; // { "--color-bg": "#faf6ef", "--font-display": "\"Lora\", Georgia, serif", ... }
}

// First family name from a CSS font stack: "\"Lora\", Georgia, serif" -> "Lora"
export function firstFamily(stack) {
  if (!stack) return "";
  const first = stack.split(",")[0].trim();
  return first.replace(/^["']|["']$/g, "");
}
```

Lives in root `lib/` (framework-free) so the scaffold `node --test` suite can
cover it, mirroring `lib/design-overrides.js` and `lib/site-helpers.js`.

### 2. Theme store (module-level)

Holds the current theme slug and notifies subscribers; lazily fetches + caches
each theme's parsed tokens.

- `getTheme(): string` / `setTheme(slug): void` (notifies subscribers).
- `subscribe(cb): () => void`.
- `useThemeTokens(): Record<string,string> | null` — a React hook returning the
  parsed tokens for the current theme; fetches `/assets/css/themes/<slug>.css`
  once per slug (cached), re-renders on theme change. Returns `null` until the
  first fetch resolves.

Works across separately-instantiated fields because all field `Input`s render in
the same admin React bundle/document.

### 3. `themeField()` — replaces the `theme` select

Spreads `fields.select({ options: THEMES, defaultValue: "paper" })` (keeps
plumbing) and overrides `Input` with a custom listbox (same pattern as the font
picker, without per-option font styling). On mount and on change it calls
`setTheme(value)`. Default value seeds the store on first render.

### 4. `colorField(label, cssVar)` — extended

`cssVar` is the theme token this color overrides (e.g. `"--color-bg"`). The
`Input` subscribes via `useThemeTokens()`. When the field's own `value` is
empty, the swatch shows `tokens[cssVar]` (the theme's color) instead of
`#000000`; the hex text input still renders empty with its placeholder, and the
Clear button still only appears when a value is set. When tokens are unavailable
(not yet loaded / fetch failed), fall back to the current neutral swatch.

### 5. `fontField(label, role)` — extended

`role` is `"display"` or `"body"`, selecting `--font-display` / `--font-body`.
When the field's own `value` is empty, the trigger (and the "Theme default"
option) shows the theme's actual family — `firstFamily(tokens["--font-" + role])`
— rendered in that typeface, with a "(theme default)" hint, instead of the bare
"Theme default" text. The catalog webfonts are already lazily loaded in the
admin (existing `ensureAdminFonts`); the theme family is among them.

## Wiring — `keystatic.config.ts`

- `theme: themeField()`.
- Replace each color: `colorField("Background color", "--color-bg")`,
  `…Surface "--color-surface"`, `…Text "--color-text"`,
  `…Muted "--color-muted"`, `…Accent "--color-accent"`,
  `…"Text on accent color" "--color-accent-contrast"`.
- `fontDisplay: fontField("Display font", "display")`,
  `fontBody: fontField("Body font", "body")`.

The stored values and the reader are unchanged — empty still means "theme
default" at render time; `design-overrides.js` is untouched.

## Data flow

`themeField` → `setTheme` → store notifies → `colorField`/`fontField` re-render
via `useThemeTokens()` → fetch+parse `/assets/css/themes/<slug>.css` (cached) →
show the theme default whenever the field's own value is empty.

## Error handling / edges

- Tokens load asynchronously; before they resolve (or if the fetch fails, e.g.
  offline), fields keep their current neutral behavior (black swatch / "Theme
  default" text). No errors surfaced to the editor.
- Switching theme updates all unset swatches/fonts live (store notify).
- A field with an explicit value ignores the theme default entirely; Clear
  returns it to the theme-default preview.
- `--color-accent-contrast` is parsed like any other token.

## Testing

- **Unit (`scaffold/theme-tokens.test.js`):** `parseThemeCss` extracts color and
  font vars and ignores unrelated lines; missing var → `undefined`;
  `firstFamily` strips quotes and trailing stack, handles empty.
- **Visual (headless Chrome on `/admin`, dune test site):** unset swatches show
  dune colors (not black); Display/Body font show dune's fonts in-face; switching
  the theme updates unset swatches/fonts live; setting an explicit hex/font still
  overrides; Clear returns to the theme preview. Confirm no console errors and a
  clean `astro build`.

## Out of scope

- Settings grouping / sections (TASK-48). The custom theme + design fields make a
  natural future "Display" section but grouping is not built here.
- Per-theme palette previews inside the theme dropdown (possible later nicety).
