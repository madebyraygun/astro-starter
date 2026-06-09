# Footer background — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an optional footer background (None / Surface / Accent / Inverted-dark) so editorial footers like Hi-Res's dark band can span full width (TASK-51).

**Architecture:** A `footerBackground` select in the Navigation singleton flows through `normalizeSettings` to `Footer.astro`, which adds a `footer-bg-*` class and wraps its sections in a `.footer-inner` container. `core.css` makes the wrapper `display: contents` by default (footer unchanged) and, when a background is set, turns the footer into a full-bleed band with the inner container centered at content width.

**Tech Stack:** Keystatic, Astro, `node --test`, headless Chrome.

Spec: `docs/superpowers/specs/2026-06-08-footer-background-design.md`.

---

### Task 1: `footerBackground` setting (config + loader + data)

**Files:**
- Modify: `keystatic.config.ts` (Navigation singleton, after the `footerText` field at ~line 412)
- Modify: `lib/site-helpers.js` (`normalizeSettings`, after `footerText` at line 22)
- Modify: `src/data/navigation.json`
- Test: `scaffold/site-helpers.test.js`

- [ ] **Step 1: Write the failing test**

Append to `scaffold/site-helpers.test.js`:

```js
test("normalizeSettings exposes footerBackground (default empty, passthrough)", () => {
  assert.strictEqual(normalizeSettings(null).footerBackground, "");
  assert.strictEqual(normalizeSettings({ footerBackground: "inverted" }).footerBackground, "inverted");
});
```

- [ ] **Step 2: Run it — expect fail**

Run: `node --test scaffold/site-helpers.test.js`
Expected: FAIL (`footerBackground` is `undefined`).

- [ ] **Step 3: Add the field, loader key, and data default**

In `lib/site-helpers.js`, after the line `footerText: s?.footerText || "",` (line 22) add:

```js
    footerBackground: s?.footerBackground || "",
```

In `keystatic.config.ts`, in the Navigation singleton, immediately AFTER the `footerText: fields.text({ … }),` block (the one labeled "Footer credit line", ending `}),` near line 412) add:

```ts
        footerBackground: fields.select({
          label: "Footer background",
          options: [
            { label: "None", value: "" },
            { label: "Surface", value: "surface" },
            { label: "Accent", value: "accent" },
            { label: "Inverted (dark)", value: "inverted" },
          ],
          defaultValue: "",
        }),
```

In `src/data/navigation.json`, add `"footerBackground": ""` (e.g. after `"footerText": ""`):

```json
{
  "headerNav": [],
  "footerNav": [],
  "signup": {
    "heading": "",
    "actionUrl": "",
    "buttonLabel": "Sign up",
    "placeholder": "Email address"
  },
  "socialLinks": [],
  "footerText": "",
  "footerBackground": ""
}
```

- [ ] **Step 4: Run tests + build**

Run: `node --test scaffold/site-helpers.test.js` (expect pass), `npm test` (full green), `npm run build` (success).

- [ ] **Step 5: Commit**

```bash
git add keystatic.config.ts lib/site-helpers.js src/data/navigation.json scaffold/site-helpers.test.js
git commit -m "feat(settings): footerBackground option in Navigation"
```

---

### Task 2: Footer rendering — wrapper + full-bleed band CSS

**Files:**
- Modify: `src/components/Footer.astro`
- Modify: `public/assets/css/core.css`

- [ ] **Step 1: Wrap the footer sections + add the class (`Footer.astro`)**

Replace the whole `src/components/Footer.astro` with:

```astro
---
import { renderMarkdown } from "../lib/markdown";
const { site } = Astro.props;
const { footerNav, signup, socialLinks, footerText, footerBackground } = site;
---
<footer class:list={["site-footer", footerBackground && `footer-bg-${footerBackground}`]}>
  <div class="footer-inner">
    {footerNav.length > 0 && (
      <nav class="footer-nav">
        {footerNav.map((link: any) => <a href={link.url}>{link.label}</a>)}
      </nav>
    )}
    {signup.actionUrl && (
      <div class="footer-signup">
        {signup.heading && <p class="footer-signup-heading">{signup.heading}</p>}
        <form method="post" action={signup.actionUrl}>
          <input type="email" name="email" required placeholder={signup.placeholder} aria-label={signup.placeholder} />
          <button type="submit">{signup.buttonLabel}</button>
        </form>
      </div>
    )}
    {socialLinks.length > 0 && (
      <nav class="footer-social">
        {socialLinks.map((link: any) => <a href={link.url}>{link.label}</a>)}
      </nav>
    )}
    {footerText && <div class="footer-credit" set:html={renderMarkdown(footerText)} />}
  </div>
</footer>
```

- [ ] **Step 2: Add the band CSS (`core.css`)**

Find the footer rule `.site-footer { border-top: 1px solid var(--color-surface); margin-top: calc(var(--space-unit) * 2); font-size: 0.9rem; color: var(--color-muted); }` (~line 56). IMMEDIATELY AFTER it, add:

```css
/* Footer background bands (TASK-51). Default: .footer-inner is layout-transparent
   so the footer renders exactly as the rules above. With a band, the footer goes
   full-bleed and .footer-inner becomes the centered content container. */
.footer-inner { display: contents; }
.site-footer.footer-bg-surface,
.site-footer.footer-bg-accent,
.site-footer.footer-bg-inverted {
  display: block;
  width: 100vw;
  max-width: none;
  margin: calc(var(--space-unit) * 2) 0 0 calc(50% - 50vw);
  border-top: 0;
  padding: calc(var(--space-unit) * 2) var(--space-unit);
}
.site-footer.footer-bg-surface .footer-inner,
.site-footer.footer-bg-accent .footer-inner,
.site-footer.footer-bg-inverted .footer-inner {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-unit);
  align-items: baseline;
  justify-content: space-between;
  max-width: var(--content-width);
  margin: 0 auto;
}
.site-footer.footer-bg-surface { background: var(--color-surface); }
.site-footer.footer-bg-accent { background: var(--color-accent); color: var(--color-accent-contrast); }
.site-footer.footer-bg-inverted { background: var(--color-text); color: var(--color-bg); }
.site-footer.footer-bg-accent .footer-nav a,
.site-footer.footer-bg-accent .footer-social a,
.site-footer.footer-bg-accent .footer-credit,
.site-footer.footer-bg-accent .footer-credit a {
  color: var(--color-accent-contrast);
}
.site-footer.footer-bg-inverted .footer-nav a,
.site-footer.footer-bg-inverted .footer-social a,
.site-footer.footer-bg-inverted .footer-credit,
.site-footer.footer-bg-inverted .footer-credit a {
  color: var(--color-bg);
}
```

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: success.

- [ ] **Step 4: Commit**

```bash
git add src/components/Footer.astro public/assets/css/core.css
git commit -m "feat(footer): full-bleed background bands (surface/accent/inverted)"
```

---

### Task 3: End-to-end verification

**Files:** none (verification only).

- [ ] **Step 1: Point the Hi-Res site at this branch's starter and enable the dark footer**

The validation site is `/Users/dalton/Sites/hires`. Copy this branch's changed files into it so it carries the feature, then set the footer to inverted:

```bash
cd /Users/dalton/Dev/astro-starter
cp src/components/Footer.astro /Users/dalton/Sites/hires/src/components/Footer.astro
cp public/assets/css/core.css /Users/dalton/Sites/hires/public/assets/css/core.css
cp keystatic.config.ts /Users/dalton/Sites/hires/keystatic.config.ts
cp lib/site-helpers.js /Users/dalton/Sites/hires/lib/site-helpers.js
node -e "const fs=require('fs');const p='/Users/dalton/Sites/hires/src/data/navigation.json';const n=JSON.parse(fs.readFileSync(p));n.footerBackground='inverted';fs.writeFileSync(p,JSON.stringify(n,null,2)+'\n')"
cd /Users/dalton/Sites/hires && PORT=8091 npm run dev > /tmp/hires-dev.log 2>&1 &
```
Wait until `curl -s -o /dev/null -w "%{http_code}" http://localhost:8091/` = 200.

- [ ] **Step 2: Screenshot + verify in headless Chrome**

Open `http://localhost:8091/`. Confirm: the footer is now a **full-width dark band** (background = the theme text color) spanning edge to edge, with the signup heading, Instagram link, and Raygun credit in light text and legible. The rest of the page is unchanged. `list_console_messages` → no errors. Take a full-page screenshot for the record.

- [ ] **Step 3: Stop dev, revert the Hi-Res copies, final checks**

```bash
lsof -ti tcp:8091 | xargs kill 2>/dev/null
cd /Users/dalton/Sites/hires && git checkout . 2>/dev/null
cd /Users/dalton/Dev/astro-starter && npm run build && npm test && git status --short
```
Expected: clean build, suite green, astro-starter tree clean.

- [ ] **Step 4: Close the task** (from `/Users/dalton/Dev/push-pop`, add notes/final-summary first)

```bash
backlog task edit 51 --check-ac 1 --check-ac 2 --check-ac 3 -s Done
```

---

## Notes for the implementer

- **Working dirs:** code at `/Users/dalton/Dev/astro-starter`; backlog CLI from `/Users/dalton/Dev/push-pop`.
- **No co-author byline** on commits.
- Default (`footerBackground: ""`) MUST render the footer exactly as before — the `.footer-inner { display: contents }` rule guarantees this; verify the no-band footer is unchanged.
- The `100vw` breakout matches the hero block's existing pattern (same minor scrollbar caveat).
