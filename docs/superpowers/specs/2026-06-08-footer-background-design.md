# Footer background / inverted section option

Design for **TASK-51**: give the site footer an optional background so editorial
footers (like hi-resthemag.com's dark band) can stand apart from the page.

## Setting

Add `footerBackground` to the **Navigation** singleton — a select:

- `""` **None** (default — today's look: content-width, top border, muted text)
- `surface` — `var(--color-surface)` band
- `accent` — `var(--color-accent)` band, contrast text
- `inverted` — **dark band**: `var(--color-text)` background, `var(--color-bg)` text

`inverted` is the Hi-Res case: for a theme with dark text on a light/lavender
background, swapping text↔bg yields a dark footer with light text, with no
theme-specific colors needed.

`normalizeSettings` exposes `footerBackground` (default `""`); `navigation.json`
seeds `"footerBackground": ""`.

## Full-bleed band + structure

A band must span the full viewport width with its content centered at
`--content-width`. `Footer.astro` wraps its sections in a `.footer-inner`
container and adds `footer-bg-<value>` to the `<footer>`:

```astro
<footer class:list={["site-footer", site.footerBackground && `footer-bg-${site.footerBackground}`]}>
  <div class="footer-inner">
    … existing footer sections …
  </div>
</footer>
```

**Default unchanged:** `.footer-inner { display: contents }` makes the wrapper
layout-transparent, so with no background the footer renders exactly as today
(the existing `.site-footer` flex/content-width/border rules apply to the
sections directly).

**With a background:** `.site-footer[footer-bg-*]` becomes a full-bleed block
band (`width: 100vw; margin-left: calc(50% - 50vw); max-width: none`; no
top-border; vertical padding), and `.footer-bg-* .footer-inner` becomes the
centered flex content container (`max-width: var(--content-width); margin: 0 auto`).

## Contrast handling (`core.css`)

- `surface`: background only (text stays default on a light surface).
- `accent`: `color: var(--color-accent-contrast)`; footer nav/social links and
  the credit (incl. its links) use `--color-accent-contrast`.
- `inverted`: `color: var(--color-bg)`; footer nav/social links and the credit
  (incl. links) use `--color-bg`. The credit's muted color is overridden so it
  stays legible on the dark band.

The signup input/button keep their existing self-contained styling (a light
input + accent button read fine on a dark band, matching Hi-Res).

## Data flow

`navigation.json` `footerBackground` → `getSettings`/`normalizeSettings` →
`Footer.astro` class → `core.css` band + contrast rules.

## Error handling / edges

- Unset (`""`) → no class → footer renders exactly as today (no band, no
  full-bleed). Existing sites unaffected.
- The `100vw` band uses the standard breakout (minor scrollbar-gutter caveat,
  same as the hero block).
- An empty footer (no nav/signup/social/credit) with a background set still
  renders the band; acceptable.

## Testing

- **Unit (`scaffold/site-helpers.test.js`):** `normalizeSettings` returns
  `footerBackground: ""` by default and passes a set value through.
- **Visual (headless Chrome, the Hi-Res site):** set `footerBackground: inverted`
  → footer renders as a full-width dark band with light text spanning edge to
  edge; signup + social + credit legible; switching to `""` restores today's
  footer. Clean `astro build`.

## Out of scope (noted on the task as optional)

- Credits-block item emphasis/italics; footer content centered alignment; hero
  text-overlay variant. Not built here.
