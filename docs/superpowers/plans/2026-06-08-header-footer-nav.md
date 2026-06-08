# Header logo, custom footer, and navigation rework — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a header logo, two manual nav menus, a richer footer (signup + social + Markdown credit), a sticky footer, and an 80rem default content width to the Astro starter (TASK-38 + TASK-15).

**Architecture:** Pure, testable helpers live in root `lib/site-helpers.js` (mirroring `lib/design-overrides.js`) and are imported by `src/lib/site.ts`; the `.astro` components stay thin and render the normalized settings. Theme/layout changes are CSS-only and token-driven.

**Tech Stack:** Astro, Keystatic (local reader), Markdoc (`renderMarkdown`), `node --test` (scaffold suite).

Spec: `docs/superpowers/specs/2026-06-08-header-footer-nav-design.md`.

---

### Task 1: Pure helpers — `normalizeSettings` + `docsSidebarItems` (TDD)

**Files:**
- Create: `lib/site-helpers.js`
- Test: `scaffold/site-helpers.test.js`

- [ ] **Step 1: Write the failing tests**

Create `scaffold/site-helpers.test.js`:

```js
import test from "node:test";
import assert from "node:assert";
import { normalizeSettings, docsSidebarItems } from "../lib/site-helpers.js";

test("normalizeSettings fills defaults from null/empty", () => {
  const s = normalizeSettings(null);
  assert.strictEqual(s.name, "New Site");
  assert.strictEqual(s.theme, "paper");
  assert.strictEqual(s.logo, null);
  assert.strictEqual(s.logoAlign, "");
  assert.deepStrictEqual(s.headerNav, []);
  assert.deepStrictEqual(s.footerNav, []);
  assert.deepStrictEqual(s.socialLinks, []);
  assert.strictEqual(s.footerText, "");
  assert.strictEqual(s.signup.buttonLabel, "Sign up");
  assert.strictEqual(s.signup.placeholder, "Email address");
  assert.strictEqual(s.signup.actionUrl, "");
});

test("normalizeSettings passes through provided values and trims actionUrl", () => {
  const s = normalizeSettings({
    name: "Hi-Res",
    logo: "/src/assets/uploads/logo.png",
    logoAlign: "center",
    headerNav: [{ label: "Work", url: "/work" }],
    footerNav: [{ label: "IG", url: "https://ig" }],
    signup: { heading: "For updates", actionUrl: "  https://list  ", buttonLabel: "Join" },
    socialLinks: [{ label: "Instagram", url: "https://ig" }],
    footerText: "© Hi-Res",
  });
  assert.strictEqual(s.name, "Hi-Res");
  assert.strictEqual(s.logo, "/src/assets/uploads/logo.png");
  assert.strictEqual(s.logoAlign, "center");
  assert.deepStrictEqual(s.headerNav, [{ label: "Work", url: "/work" }]);
  assert.strictEqual(s.signup.actionUrl, "https://list");
  assert.strictEqual(s.signup.buttonLabel, "Join");
  assert.strictEqual(s.signup.placeholder, "Email address"); // default kept
  assert.strictEqual(s.footerText, "© Hi-Res");
});

test("docsSidebarItems lists navShow pages (by navOrder) then docs (by order)", () => {
  const pages = [
    { slug: "about", entry: { title: "About", navShow: true, navOrder: 20 } },
    { slug: "home", entry: { title: "Home", navShow: true, navOrder: 10 } },
    { slug: "secret", entry: { title: "Secret", navShow: false, navOrder: 5 } },
  ];
  const docs = [
    { slug: "install", entry: { title: "Install", order: 2 } },
    { slug: "intro", entry: { title: "Intro", order: 1 } },
  ];
  assert.deepStrictEqual(docsSidebarItems(pages, docs), [
    { url: "/", title: "Home" },
    { url: "/about/", title: "About" },
    { url: "/docs/intro/", title: "Intro" },
    { url: "/docs/install/", title: "Install" },
  ]);
});

test("docsSidebarItems tolerates empty inputs", () => {
  assert.deepStrictEqual(docsSidebarItems([], []), []);
  assert.deepStrictEqual(docsSidebarItems(undefined, undefined), []);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test scaffold/site-helpers.test.js`
Expected: FAIL — `Cannot find module '../lib/site-helpers.js'`.

- [ ] **Step 3: Implement the helpers**

Create `lib/site-helpers.js`:

```js
// Pure helpers shared by src/lib/site.ts (kept framework-free so node --test
// can exercise them, mirroring lib/design-overrides.js).

export function normalizeSettings(s) {
  return {
    name: s?.name || "New Site",
    template: s?.template || "blog",
    theme: s?.theme || "paper",
    siteUrl: s?.siteUrl?.trim() || "",
    rssEnabled: s?.rssEnabled ?? true,
    logo: s?.logo || null,
    logoAlign: s?.logoAlign || "",
    headerNav: s?.headerNav ?? [],
    footerNav: s?.footerNav ?? [],
    signup: {
      heading: s?.signup?.heading || "",
      actionUrl: s?.signup?.actionUrl?.trim() || "",
      buttonLabel: s?.signup?.buttonLabel || "Sign up",
      placeholder: s?.signup?.placeholder || "Email address",
    },
    socialLinks: s?.socialLinks ?? [],
    footerText: s?.footerText || "",
    design: s?.design ?? {},
  };
}

const pageUrl = (slug) => (slug === "home" ? "/" : `/${slug}/`);

export function docsSidebarItems(pages, docs) {
  const pageItems = (pages ?? [])
    .filter((p) => p.entry.navShow !== false)
    .sort((a, b) => (a.entry.navOrder ?? 99) - (b.entry.navOrder ?? 99))
    .map((p) => ({ url: pageUrl(p.slug), title: p.entry.title }));
  const docItems = (docs ?? [])
    .slice()
    .sort((a, b) => (a.entry.order ?? 99) - (b.entry.order ?? 99))
    .map((d) => ({ url: `/docs/${d.slug}/`, title: d.entry.title }));
  return [...pageItems, ...docItems];
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test scaffold/site-helpers.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/site-helpers.js scaffold/site-helpers.test.js
git commit -m "feat(site): testable settings + docs-sidebar helpers"
```

---

### Task 2: Settings schema — `keystatic.config.ts`

**Files:**
- Modify: `keystatic.config.ts` (the `settings` singleton `schema`, after `footerText`; and remove `extraLinks`)

- [ ] **Step 1: Add the new fields and remove `extraLinks`**

In the `settings` singleton schema, delete the `extraLinks` array field. Keep `footerText`. Add these fields (place `logo`/`logoAlign` near the top of the schema, the nav/footer fields after `footerText`, before the `design` object):

```ts
        logo: fields.image({ label: "Logo", ...uploads }),
        logoAlign: fields.select({
          label: "Logo alignment",
          options: [
            { label: "Left", value: "" },
            { label: "Center", value: "center" },
            { label: "Right", value: "right" },
          ],
          defaultValue: "",
        }),
        headerNav: fields.array(
          fields.object({
            label: fields.text({ label: "Label" }),
            url: fields.text({ label: "URL" }),
          }),
          { label: "Header menu", itemLabel: (props) => props.fields.label.value }
        ),
        footerNav: fields.array(
          fields.object({
            label: fields.text({ label: "Label" }),
            url: fields.text({ label: "URL" }),
          }),
          { label: "Footer menu", itemLabel: (props) => props.fields.label.value }
        ),
        signup: fields.object(
          {
            heading: fields.text({ label: "Signup heading" }),
            actionUrl: fields.text({
              label: "Signup form action URL",
              description: "POST endpoint from your email provider (Mailchimp, Buttondown, etc.). Leave empty to hide the form.",
            }),
            buttonLabel: fields.text({ label: "Button label", defaultValue: "Sign up" }),
            placeholder: fields.text({ label: "Email placeholder", defaultValue: "Email address" }),
          },
          { label: "Email signup" }
        ),
        socialLinks: fields.array(
          fields.object({
            label: fields.text({ label: "Label" }),
            url: fields.text({ label: "URL" }),
          }),
          { label: "Social links", itemLabel: (props) => props.fields.label.value }
        ),
        footerText: fields.text({
          label: "Footer credit line",
          description: "Supports Markdown, e.g. ©2026 Hi-Res — a project of [Raygun](https://…).",
          multiline: true,
        }),
```

Note: if a `footerText` field already exists, replace it in place with the version above (do not duplicate it).

- [ ] **Step 2: Transpile-check the config**

Run:
```bash
node --input-type=module -e "import {build} from 'esbuild'; build({entryPoints:['keystatic.config.ts'],bundle:true,write:false,format:'esm',logLevel:'warning',external:['@keystatic/core'],loader:{'.json':'json'}}).then(()=>console.log('OK')).catch(()=>process.exit(1))"
```
Expected: `OK`.

- [ ] **Step 3: Commit**

```bash
git add keystatic.config.ts
git commit -m "feat(settings): logo, header/footer menus, signup, social, markdown credit"
```

---

### Task 3: Settings loader — `src/lib/site.ts`

**Files:**
- Modify: `src/lib/site.ts` (`getSettings`, remove `getNavPages`, add docs-sidebar export)

- [ ] **Step 1: Rewire `getSettings`, drop `getNavPages`, export a docs-sidebar reader**

Replace the `getSettings` and `getNavPages` functions at the bottom of `src/lib/site.ts` with:

```ts
import { normalizeSettings, docsSidebarItems } from "../../lib/site-helpers.js";

export async function getSettings() {
  return normalizeSettings(await reader.singletons.settings.read());
}

export async function getDocsSidebar() {
  const pages = await reader.collections.pages.all();
  const docs = (await (reader.collections as any).docs?.all()) ?? [];
  return docsSidebarItems(pages, docs);
}
```

Keep the existing `reader` setup above unchanged. Ensure the `import` line sits with the other imports at the top of the file (move it up if your editor placed it mid-file).

- [ ] **Step 2: Sanity-check the edit (do not build yet)**

Run: `grep -n "getNavPages\|normalizeSettings\|getDocsSidebar" src/lib/site.ts`
Expected: `getNavPages` no longer appears; `normalizeSettings` and `getDocsSidebar` do.
(The full `npm run build` is intentionally deferred to Task 6 — `Base.astro` still imports `getNavPages` until then, so the integrated build is the first green build.)

- [ ] **Step 3: Commit**

```bash
git add src/lib/site.ts
git commit -m "feat(site): normalize settings + docs-sidebar loader; drop auto page nav"
```

---

### Task 4: Header — `src/components/Header.astro`

**Files:**
- Modify: `src/components/Header.astro`

- [ ] **Step 1: Rewrite the header**

Replace the whole file with:

```astro
---
import Picture from "./Picture.astro";
const { site, currentPath } = Astro.props;
const align = site.logoAlign ? `brand-${site.logoAlign}` : "";
---
<header class:list={["site-header", align]}>
  <a class="site-brand" href="/" aria-label={site.name}>
    {site.logo
      ? <Picture src={site.logo} alt={site.name} widths={[120, 240, 480]} sizes="200px" />
      : <span class="site-name">{site.name}</span>}
  </a>
  {site.headerNav.length > 0 && (
    <nav>
      {site.headerNav.map((link: any) => (
        <a href={link.url} aria-current={link.url === currentPath ? "page" : undefined}>{link.label}</a>
      ))}
    </nav>
  )}
</header>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/Header.astro
git commit -m "feat(header): logo brand with alignment + manual header menu"
```

---

### Task 5: Footer — `src/components/Footer.astro`

**Files:**
- Modify: `src/components/Footer.astro`

- [ ] **Step 1: Rewrite the footer**

Replace the whole file with:

```astro
---
import { renderMarkdown } from "../lib/markdown";
const { site } = Astro.props;
const { footerNav, signup, socialLinks, footerText } = site;
---
<footer class="site-footer">
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
</footer>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/Footer.astro
git commit -m "feat(footer): manual menu, signup form, social links, markdown credit"
```

---

### Task 6: Base layout wiring — `src/components/DocsSidebar.astro` + `src/layouts/Base.astro`

**Files:**
- Modify: `src/components/DocsSidebar.astro`
- Modify: `src/layouts/Base.astro:4,11,38,40`

- [ ] **Step 1: Update the docs sidebar to use the helper**

Replace the whole `src/components/DocsSidebar.astro` with:

```astro
---
import { getDocsSidebar } from "../lib/site";
const { currentPath } = Astro.props;
const items = await getDocsSidebar();
---
<aside class="docs-sidebar">
  <ul>
    {items.map((item: any) => (
      <li><a href={item.url} aria-current={item.url === currentPath ? "page" : undefined}>{item.title}</a></li>
    ))}
  </ul>
</aside>
```

- [ ] **Step 2: Drop `getNavPages` from `Base.astro`**

In `src/layouts/Base.astro`:
- Line 4: change `import { getSettings, getNavPages } from "../lib/site";` to `import { getSettings } from "../lib/site";`
- Line 11: delete `const nav = await getNavPages();`
- Line 38: change `<Header site={site} nav={nav} currentPath={Astro.url.pathname} />` to `<Header site={site} currentPath={Astro.url.pathname} />`
- Line 40: change `<Footer site={site} nav={nav} />` to `<Footer site={site} />`

- [ ] **Step 3: Build to verify wiring**

Run: `npm run build`
Expected: build completes with no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/DocsSidebar.astro src/layouts/Base.astro
git commit -m "feat(nav): docs sidebar from navShow pages + docs; drop auto nav wiring"
```

---

### Task 7: Layout CSS + themes — `core.css` + theme files

**Files:**
- Modify: `public/assets/css/themes/paper.css:12`, `signal.css:12`, `carbon.css:12`, `dune.css:12`
- Modify: `public/assets/css/core.css` (body @ line 2, main @ line 12, header/footer block @ lines 15-25)

- [ ] **Step 1: Set 80rem content width in all four themes**

In each of `paper.css`, `signal.css`, `carbon.css`, `dune.css`, change line 12 to:

```css
  --content-width: 80rem;
```

- [ ] **Step 2: Sticky footer + brand alignment + footer styling in `core.css`**

Change the `body` rule (line 2) to add the three sticky-footer lines:

```css
body {
  margin: 0;
  background: var(--color-bg);
  color: var(--color-text);
  font-family: var(--font-body);
  line-height: 1.6;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
```

Change the `main` rule (line 12) to add `flex: 1 0 auto;`:

```css
main { max-width: var(--content-width); margin: 0 auto; padding: calc(var(--space-unit) * 2) var(--space-unit) calc(var(--space-unit) * 4); flex: 1 0 auto; }
```

Replace the `.site-name` rule and add brand/footer rules. After the existing `.site-name { ... }` line, insert:

```css
.site-brand { display: inline-flex; align-items: center; text-decoration: none; }
.site-brand :where(img) { max-height: 2.5rem; width: auto; border-radius: 0; }
.site-header.brand-center { justify-content: center; }
.site-header.brand-right { flex-direction: row-reverse; }

.site-footer .footer-nav, .site-footer .footer-social { display: flex; flex-wrap: wrap; gap: calc(var(--space-unit) * 0.75); }
.footer-signup { display: flex; flex-direction: column; gap: calc(var(--space-unit) * 0.5); }
.footer-signup-heading { margin: 0; }
.footer-signup form { display: flex; flex-wrap: wrap; gap: calc(var(--space-unit) * 0.5); }
.footer-signup input[type="email"] {
  flex: 1 1 12rem; min-width: 0;
  padding: calc(var(--space-unit) * 0.5);
  border: 1px solid var(--color-muted); border-radius: var(--radius);
  background: var(--color-bg); color: var(--color-text);
}
.footer-signup button {
  background: var(--color-accent); color: var(--color-accent-contrast);
  border: 0; border-radius: var(--radius); font-weight: 700; cursor: pointer;
  padding: calc(var(--space-unit) * 0.5) var(--space-unit);
}
.footer-credit { font-size: 0.9rem; color: var(--color-muted); }
.footer-credit :first-child { margin: 0; }
```

The `.site-footer` is already a flex container with `flex-wrap` and gap (lines 15-25), so the footer sections stack/space using the existing rules plus the above.

- [ ] **Step 3: Build to verify CSS loads**

Run: `npm run build`
Expected: build completes.

- [ ] **Step 4: Commit**

```bash
git add public/assets/css/core.css public/assets/css/themes/paper.css public/assets/css/themes/signal.css public/assets/css/themes/carbon.css public/assets/css/themes/dune.css
git commit -m "feat(layout): 80rem default width, sticky footer, brand + footer styling"
```

---

### Task 8: End-to-end verification + full suite

**Files:**
- Temporary: `src/data/settings.json` (edit then restore), a demo page (create then delete), a test logo image (create then delete)

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: all tests pass (existing suite + the 4 new helper tests from Task 1).

- [ ] **Step 2: Build a fixture and inspect rendered chrome**

```bash
node --input-type=module -e "import sharp from 'sharp'; await sharp({create:{width:600,height:200,channels:3,background:{r:30,g:30,b:30}}}).png().toFile('src/assets/uploads/logo.png'); console.log('logo written')"
cp src/data/settings.json /tmp/settings.backup.json
node --input-type=module -e "
import fs from 'node:fs';
const s = JSON.parse(fs.readFileSync('src/data/settings.json','utf8'));
s.logo='/src/assets/uploads/logo.png'; s.logoAlign='center';
s.headerNav=[]; s.footerNav=[{label:'Home',url:'/'}];
s.signup={heading:'For events and updates',actionUrl:'https://example.com/subscribe',buttonLabel:'Sign up',placeholder:'Email address'};
s.socialLinks=[{label:'Instagram',url:'https://instagram.com/hires'}];
s.footerText='©2026 HI-RES — a project of [Raygun](https://madebyraygun.com).';
fs.writeFileSync('src/data/settings.json', JSON.stringify(s,null,2));
console.log('settings patched');
"
npm run build
echo '--- header brand (logo via picture, centered, no nav) ---'
grep -oE '<header class="site-header brand-center"|<picture>|<nav>' dist/index.html | sort | uniq -c
echo '--- footer signup form ---'
grep -oE 'action="https://example.com/subscribe"|type="email"|>Sign up<' dist/index.html
echo '--- social + credit link ---'
grep -oE 'instagram.com/hires|madebyraygun.com' dist/index.html | sort -u
```
Expected: a `site-header brand-center` with a `<picture>` and **no** `<nav>` in the header; the footer `<form action="https://example.com/subscribe">` with an email input and "Sign up" button; the Instagram social link and the Raygun credit link.

- [ ] **Step 3: Restore settings and remove fixtures**

```bash
cp /tmp/settings.backup.json src/data/settings.json
rm -f src/assets/uploads/logo.png
rmdir src/assets/uploads 2>/dev/null || true
npm run build && git status --short
```
Expected: clean rebuild; `git status` shows no stray fixture files (only intended source changes, which are already committed).

- [ ] **Step 4: Mark tasks done in backlog**

```bash
backlog task edit 15 --check-ac 1 --check-ac 2 --check-ac 3 --check-ac 4 -s Done   # run from /Users/dalton/Dev/push-pop
backlog task edit 38 --check-ac 1 --check-ac 2 --check-ac 3 --check-ac 4 --check-ac 5 -s Done
```
(Add `--notes`/`--final-summary` per the backlog workflow before setting Done.)

---

## Notes for the implementer

- **Working dirs:** code lives in `/Users/dalton/Dev/astro-starter`; the backlog CLI must be run from `/Users/dalton/Dev/push-pop`.
- **No co-author byline** on commits (project convention).
- **`extraLinks` removal is breaking** for any site relying on it — links must be re-entered under `headerNav`/`footerNav`.
- Wide prose at 80rem is intentional here; per-block narrowing is **TASK-45**, out of scope for this plan.
