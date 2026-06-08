# Per-heading-size overrides for heading typography

Design for **TASK-47**: the heading **scale / letter-spacing / text-case** tokens
(from TASK-39) stay as site-wide defaults, but each heading "size" can override
them individually, edited through a collapsible disclosure per size in Site
Settings.

## Sizes (9 override groups)

Two scopes that don't collide:

- **Variants** — block-heading styles: `display`, `heading`, `eyebrow`. Govern
  `.block-heading.is-display`, `.block-heading` (default "Heading"), and
  `.block-heading.is-eyebrow`.
- **Levels** — prose/Markdown headings: `h1`–`h6`. Govern bare `<h1>`…`<h6>`
  (posts/docs).

Block headings render as `<hN class="block-heading …">`; the `.block-heading*`
rules win over bare-tag rules by specificity, so variants own block headings and
levels own prose headings — no conflict.

## Cascade

Each group has three optional properties: `scale` (unitless multiplier),
`tracking` (em), `transform` (`none` | `uppercase`). Resolution per property:

**per-size override → global default (`--heading-scale` / `--heading-tracking` /
`--heading-transform`) → theme/base.**

Expressed as nested CSS `var()` fallbacks. Examples:

```css
.block-heading.is-display {
  font-size: calc(2.6rem * var(--h-display-scale, var(--heading-scale, 1)));
  letter-spacing: var(--h-display-tracking, var(--heading-tracking, normal));
  text-transform: var(--h-display-transform, var(--heading-transform, none));
}
h1 {
  font-size: calc(var(--h1-base, 2.4rem) * var(--h1-scale, var(--heading-scale, 1)));
  letter-spacing: var(--h1-tracking, var(--heading-tracking, normal));
  text-transform: var(--h1-transform, var(--heading-transform, none));
}
```

This **extends heading tokens to prose headings**, which TASK-39 deliberately
scoped out. Intended now. A base type ramp is introduced for `h1`–`h6`
(`h1` 2.4rem, `h2` 1.8rem, `h3` 1.4rem, `h4` 1.2rem, `h5` 1rem, `h6` 0.875rem),
each scaled by its cascade. The existing `.block-heading` base sizes
(1.6 / 2.6 / 0.8rem) are unchanged.

## Data model

A new `design.headings` value: an object keyed by the 9 size ids, each an object
of the three optional string properties (empty string = unset → inherit):

```json
"headings": {
  "display": { "scale": "1.5", "tracking": "", "transform": "uppercase" },
  "heading": { "scale": "", "tracking": "", "transform": "" },
  "eyebrow": { "scale": "", "tracking": "0.18", "transform": "" },
  "h1": { "scale": "", "tracking": "", "transform": "" },
  "h2": { … }, "h3": { … }, "h4": { … }, "h5": { … }, "h6": { … }
}
```

Stored values stay strings (matching the existing color/number-as-string token
style); empty means "inherit". **Storage note:** the custom field will serialize
this as a structured object under `design.headings`. The plan's first
implementation step verifies Keystatic accepts an object stored-value for a form
field in the JSON singleton; if not, the field falls back to storing a single
JSON-string blob that the emitter `JSON.parse`s. Either way the public API
(`design.headings` → emitter → CSS vars) is identical.

## Components

### 1. `headingsField` — custom collapsible Keystatic field (`src/keystatic/fields.tsx`)

- Renders one `<details><summary>` per size (grouped: Variants then Levels), each
  body holding three inputs — scale (number), tracking (number, em), case
  (select: theme default / none / uppercase).
- Manages the structured object in the field value; each input edit calls
  `onChange` with the updated object. Unset inputs store `""`.
- A `defaultValue` of all-empty groups. Reader returns the object as-is.
- Built as a `BasicFormField` (object value); follows the TASK-46 custom-field
  precedent. Reuses `FieldShell`/styling conventions already in the file.

### 2. Emitter — `lib/heading-overrides.js` (pure, testable)

`headingOverridesCss(headings)` returns a string of CSS custom-property
declarations for only the **set** per-size properties, mapping each to its var:

- variant `display`/`heading`/`eyebrow` → `--h-<id>-scale|tracking|transform`
- level `h1`…`h6` → `--h<n>-scale|tracking|transform`

Units: scale unitless, tracking suffixed `em`, transform raw keyword. Reuses the
safety checks from `design-overrides.js` (skip empty, reject CSS-breaking
values). `design-overrides.js`’s `designOverridesCss` calls this and appends the
result inside the same `:root { … }` block.

### 3. `core.css`

Update the `.block-heading` variant rules and add `h1`–`h6` rules to use the
per-size → global `var()` fallbacks shown above, plus the `--hN-base` ramp.

### 4. Config wiring — `keystatic.config.ts`

Add `headings: headingsField()` to the `design` object, after the existing
`headingScale` / `headingTracking` / `headingTransform` global fields (which
remain as the defaults).

## Data flow

`design.headings` (settings) → `headingOverridesCss` (via `designOverridesCss`)
→ injected `:root` override `<style>` in `Base.astro` → CSS `var()` fallbacks in
`core.css` resolve per-size → global → base.

## Error handling / edges

- Any unset property emits no var → the CSS `var()` fallback uses the global
  default, then the base/theme. Fully empty `design.headings` emits nothing.
- The emitter skips values containing CSS-breaking characters (same guard as
  `design-overrides.js`).
- Block headings remain governed by variants; prose by levels (specificity).
- Existing sites with no `design.headings` are unaffected (all fallbacks active).

## Testing

- **Unit (`scaffold/heading-overrides.test.js`):** `headingOverridesCss` emits
  correct vars for set variant + level properties; omits unset; applies units
  (scale none, tracking `em`); skips unsafe values; empty object → `""`. Plus a
  case asserting `designOverridesCss` includes the heading-override vars in its
  `:root` block.
- **Visual (headless Chrome on `/admin`, test site):** disclosures expand/
  collapse; setting `display.scale` enlarges only Display block headings; setting
  `h2.tracking` tracks only prose h2 (not block headings); unset inherits the
  global default, then theme; clean `astro build`; no console errors.

## Out of scope

- Per-size font-family or color (only scale/tracking/case).
- Reorganizing the settings screen (TASK-48).
