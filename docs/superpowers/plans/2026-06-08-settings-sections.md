# Settings sections (three singletons) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the single Site Settings screen into three Keystatic singletons — Site / Design / Navigation — without changing any downstream consumer (TASK-48).

**Architecture:** Three singletons store field subsets; `getSettings()` reads all three and merges them into one flat object passed to the unchanged `normalizeSettings`, so `Header`/`Footer`/`Base`/`design-overrides`/blocks are untouched. Scaffold + the TASK-42 draft-preview allowlists (astro-starter JS + push-pop Swift) update to the new data paths.

**Tech Stack:** Keystatic singletons, Astro, `node --test`, Swift `swift test` (push-pop), headless Chrome for admin verification.

Spec: `docs/superpowers/specs/2026-06-08-settings-sections-design.md`.

**Field → singleton mapping** (move the EXISTING field definitions verbatim):
- **Site** (`src/data/site`): `name`, `siteUrl`, `rssEnabled`, `template`
- **Design** (`src/data/design`): `theme`, `logo`, `logoAlign`, `design` (the whole `fields.object({...}, { label: "Customize Design" })`)
- **Navigation** (`src/data/navigation`): `headerNav`, `footerNav`, `signup`, `socialLinks`, `footerText`

---

### Task 1: Three singletons + data files + `getSettings` merge

**Files:**
- Modify: `keystatic.config.ts` (top import; the `singletons: { settings: … }` block)
- Create: `src/data/site.json`, `src/data/design.json`, `src/data/navigation.json`
- Delete: `src/data/settings.json`
- Modify: `src/lib/site.ts` (`getSettings`)
- Test: `scaffold/site-helpers.test.js` (add a merge case)

- [ ] **Step 1: Add a failing merge test**

Append to `scaffold/site-helpers.test.js`:

```js
test("normalizeSettings works on an object merged from three singletons", () => {
  const site = { name: "Hi-Res", siteUrl: "https://x", rssEnabled: false, template: "portfolio" };
  const design = { theme: "dune", logo: "/l.png", logoAlign: "center", design: { colorBg: "#111" } };
  const navigation = { headerNav: [{ label: "Work", url: "/work" }], footerText: "© Hi-Res" };
  const s = normalizeSettings({ ...site, ...design, ...navigation });
  assert.strictEqual(s.name, "Hi-Res");
  assert.strictEqual(s.template, "portfolio");
  assert.strictEqual(s.theme, "dune");
  assert.strictEqual(s.logo, "/l.png");
  assert.deepStrictEqual(s.design, { colorBg: "#111" });
  assert.deepStrictEqual(s.headerNav, [{ label: "Work", url: "/work" }]);
  assert.strictEqual(s.footerText, "© Hi-Res");
});
```

- [ ] **Step 2: Run it (should already pass — `normalizeSettings` is unchanged)**

Run: `node --test scaffold/site-helpers.test.js`
Expected: PASS (this locks in the merge contract before the refactor).

- [ ] **Step 3: Restructure the config singletons**

In `keystatic.config.ts`, change the top import:

```ts
import settings from "./src/data/settings.json";
```
to:
```ts
import site from "./src/data/site.json";
```
and update the two usages: `settings.template` → `site.template`, `settings.name` → `site.name` (lines near the top: `const template = ...` and `const brandName = ...`).

Then replace the entire `singletons: { settings: singleton({ … }) }` block with three singletons. Move the EXISTING field definitions verbatim into the matching singleton per the mapping above:

```ts
  singletons: {
    site: singleton({
      label: "Site",
      path: "src/data/site",
      format: { data: "json" },
      schema: {
        // MOVE verbatim from the old settings schema:
        // name, siteUrl, rssEnabled, template
      },
    }),
    design: singleton({
      label: "Design",
      path: "src/data/design",
      format: { data: "json" },
      schema: {
        // MOVE verbatim: theme, logo, logoAlign, design (the whole fields.object(...))
      },
    }),
    navigation: singleton({
      label: "Navigation",
      path: "src/data/navigation",
      format: { data: "json" },
      schema: {
        // MOVE verbatim: headerNav, footerNav, signup, socialLinks, footerText
      },
    }),
  },
```

Do not retype the field bodies — cut them from the old `settings` schema and paste into the right singleton, preserving exact field code (themeField(), colorField(...), the design object, etc.).

- [ ] **Step 4: Create the three data files, delete the old one**

Create `src/data/site.json`:
```json
{
  "name": "New Site",
  "siteUrl": "",
  "rssEnabled": true,
  "template": "blog"
}
```

Create `src/data/design.json`:
```json
{
  "theme": "paper",
  "logo": null,
  "logoAlign": "",
  "design": {}
}
```

Create `src/data/navigation.json`:
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
  "footerText": ""
}
```

Then: `git rm src/data/settings.json`.

- [ ] **Step 5: Update `getSettings` in `src/lib/site.ts`**

Replace the current `getSettings`:

```ts
export async function getSettings() {
  return normalizeSettings(await reader.singletons.settings.read());
}
```

with:

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

(The draft-aware reader wraps all singletons generically, so no other `site.ts` change is needed.)

- [ ] **Step 6: Build + test**

Run: `npm run build` (expect success) and `npm test` (expect green, including the new merge test).
If the build complains about a missing `settings` singleton anywhere, grep `grep -rn "singletons.settings" src/ lib/ integrations/` and fix — there should be no remaining references.

- [ ] **Step 7: Commit**

```bash
git add keystatic.config.ts src/lib/site.ts src/data/site.json src/data/design.json src/data/navigation.json scaffold/site-helpers.test.js
git rm src/data/settings.json
git commit -m "feat(settings): split into Site / Design / Navigation singletons"
```

---

### Task 2: Scaffold writes to the new files

**Files:**
- Modify: `scaffold/scaffold.js`

- [ ] **Step 1: Point scaffold at site.json + design.json**

`scaffold/scaffold.js` currently reads `src/data/settings.json`, sets `template`/`theme`/`name`, and writes it back. Replace that logic (the `settingsPath` read at ~line 36-39 and the write block at ~line 57-60) so it updates two files: `template` + optional `name` in `site.json`, and `theme` in `design.json`.

Replace the read (around `const settingsPath = ...; ... settings = JSON.parse(...)`) with:

```js
const sitePath = path.join(root, "src", "data", "site.json");
const designPath = path.join(root, "src", "data", "design.json");
let siteData;
let designData;
try {
  siteData = JSON.parse(fs.readFileSync(sitePath, "utf8"));
  designData = JSON.parse(fs.readFileSync(designPath, "utf8"));
} catch (e) {
  fail(`could not read site files: ${e.message}`);
}
```

Replace the write block (the `settings.template = template; settings.theme = theme; ...; fs.writeFileSync(settingsPath, ...)`) with:

```js
  siteData.template = template;
  if (args.name) siteData.name = args.name;
  designData.theme = theme;
  fs.writeFileSync(sitePath, JSON.stringify(siteData, null, 2) + "\n");
  fs.writeFileSync(designPath, JSON.stringify(designData, null, 2) + "\n");
```

Keep the rest of `scaffold.js` (the template-layer copy, the already-scaffolded guard, the `fs.rmSync(__dirname …)`) unchanged.

- [ ] **Step 2: Verify scaffold still runs**

Run a dry check in a temp clone (do NOT scaffold the starter itself — it has a guard against re-scaffolding, and its `src/content/pages` may be empty so it could run). Instead verify syntactically:
```bash
node --check scaffold/scaffold.js && echo "scaffold.js parses OK"
```
Expected: `scaffold.js parses OK`.

- [ ] **Step 3: Commit**

```bash
git add scaffold/scaffold.js
git commit -m "feat(scaffold): write template/name to site.json, theme to design.json"
```

---

### Task 3: Live-preview allowlists (astro-starter)

**Files:**
- Modify: `integrations/draft-overlay.js` (`safeDraftPath`)
- Modify: `integrations/content-reload.js` (`shouldReload`)
- Test: `scaffold/draft-overlay.test.js`

- [ ] **Step 1: Update the draft-overlay test**

In `scaffold/draft-overlay.test.js`, replace the test that asserts `src/data/settings.json` is allowed and `src/data/other.json` rejected with:

```js
test("the singleton files are allowed (live preview)", () => {
  for (const p of ["src/data/site.json", "src/data/design.json", "src/data/navigation.json"]) {
    const r = safeDraftPath(p);
    assert.ok(r && r.endsWith(p.replace(/\//g, path.sep)), p);
  }
});

test("other data files are rejected", () => {
  assert.strictEqual(safeDraftPath("src/data/settings.json"), null);
  assert.strictEqual(safeDraftPath("src/data/other.json"), null);
  assert.strictEqual(safeDraftPath("package.json"), null);
});
```

(Keep the existing content-allowed and traversal-rejected tests.)

- [ ] **Step 2: Run — expect the new tests to fail**

Run: `node --test scaffold/draft-overlay.test.js`
Expected: FAIL (settings.json still allowed; the three new paths not yet).

- [ ] **Step 3: Update `safeDraftPath` in `integrations/draft-overlay.js`**

Replace the `SETTINGS_DRAFT_PATH` constant and the `safeDraftPath` allow check:

```js
// Drafts may only land inside the overlay's content mirror or be one of the
// settings singleton files (so design-token edits live-preview pre-save).
const SINGLETON_DRAFT_PATHS = new Set([
  "src/data/site.json",
  "src/data/design.json",
  "src/data/navigation.json",
]);
export function safeDraftPath(relative) {
  if (typeof relative !== "string") return null;
  const allowed = relative.startsWith("src/content/") || SINGLETON_DRAFT_PATHS.has(relative);
  if (!allowed) return null;
  const target = path.resolve(DRAFT_ROOT, relative);
  return target.startsWith(path.resolve(DRAFT_ROOT) + path.sep) ? target : null;
}
```

- [ ] **Step 4: Update `content-reload.js`**

In `integrations/content-reload.js`, replace the line
`file.endsWith("/src/data/settings.json") ||`
with:
`(file.includes("/src/data/") && file.endsWith(".json")) ||`

- [ ] **Step 5: Run tests + build**

Run: `node --test scaffold/draft-overlay.test.js` (expect pass), then `npm test` (full green) and `npm run build` (success).

- [ ] **Step 6: Commit**

```bash
git add integrations/draft-overlay.js integrations/content-reload.js scaffold/draft-overlay.test.js
git commit -m "feat(draft): relay/reload the three settings singletons"
```

---

### Task 4: Swift relay allowlist (push-pop)

**Files (in `/Users/dalton/Dev/push-pop`):**
- Modify: `Sources/PushPopCore/DraftRelay.swift`
- Test: `Tests/PushPopCoreTests/DraftRelayTests.swift`

- [ ] **Step 1: Update the Swift tests**

In `/Users/dalton/Dev/push-pop/Tests/PushPopCoreTests/DraftRelayTests.swift`, replace the `testForwardsSettingsSingleton` and `testUnrelatedDataFilesAreIgnored` cases with:

```swift
    func testForwardsSettingsSingletons() {
        for path in ["src/data/site.json", "src/data/design.json", "src/data/navigation.json"] {
            let file = DraftFile(path: path, contents: "e30K")
            let relay = DraftRelay()
            XCTAssertEqual(relay.update(key: "k", files: [file])?.files, [file], path)
        }
    }

    func testUnrelatedDataFilesAreIgnored() {
        let relay = DraftRelay()
        let other = DraftFile(path: "src/data/other.json", contents: "e30K")
        let settings = DraftFile(path: "src/data/settings.json", contents: "e30K")
        XCTAssertNil(relay.update(key: "k", files: [other, settings]))
    }
```

- [ ] **Step 2: Run — expect failure**

Run: `cd /Users/dalton/Dev/push-pop && swift test --filter DraftRelayTests`
Expected: FAIL (only `src/data/settings.json` is currently forwarded).

- [ ] **Step 3: Update the filter in `DraftRelay.swift`**

Replace the `relevant` filter line:

```swift
        let relevant = (files ?? []).filter {
            $0.path.hasPrefix("src/content/") || $0.path == "src/data/settings.json"
        }
```

with:

```swift
        let singletons: Set<String> = ["src/data/site.json", "src/data/design.json", "src/data/navigation.json"]
        let relevant = (files ?? []).filter {
            $0.path.hasPrefix("src/content/") || singletons.contains($0.path)
        }
```

Also update the doc comment on `DraftRelay` to say "the site/design/navigation singletons" instead of "the site settings singleton".

- [ ] **Step 4: Run tests**

Run: `cd /Users/dalton/Dev/push-pop && swift test --filter DraftRelayTests` (expect pass), then `swift test` (full suite green).

- [ ] **Step 5: Commit (in push-pop)**

```bash
cd /Users/dalton/Dev/push-pop
git add Sources/PushPopCore/DraftRelay.swift Tests/PushPopCoreTests/DraftRelayTests.swift
git commit -m "feat(draft): relay the site/design/navigation singletons"
```

---

### Task 5: End-to-end verification

**Files:** none (verification only).

- [ ] **Step 1: Start the dev server**

```bash
cd /Users/dalton/Dev/astro-starter && PORT=8090 npm run dev > /tmp/astro-dev-48.log 2>&1 &
```
Wait for `curl -s -o /dev/null -w "%{http_code}" http://localhost:8090/keystatic` = 200.

- [ ] **Step 2: Drive the admin in headless Chrome**

1. Open `http://localhost:8090/keystatic`. Confirm the sidebar SINGLETONS list now shows **Site**, **Design**, **Navigation** (not "Site Settings").
2. Open **Site** (`/keystatic/singleton/site`): has Site name / Site URL / RSS / Template.
3. Open **Design** (`/keystatic/singleton/design`): has Theme, Logo, Logo alignment, the color/font/token fields, per-heading overrides; the theme-default color swatches + font previews still work (TASK-46) — change Theme and confirm unset swatches update.
4. Open **Navigation** (`/keystatic/singleton/navigation`): Header menu / Footer menu / Email signup / Social links / Footer credit.
5. On **Design**, set Accent color `#123456`, Save; load a site page (`curl http://localhost:8090/posts/`) and confirm its `:root` has `--color-accent: #123456`; then `git checkout src/data/design.json` to revert.
6. `list_console_messages` → no errors.

- [ ] **Step 3: Stop dev, full checks, confirm clean**

```bash
lsof -ti tcp:8090 | xargs kill 2>/dev/null
cd /Users/dalton/Dev/astro-starter && npm run build && npm test
cd /Users/dalton/Dev/push-pop && swift test 2>&1 | tail -1
cd /Users/dalton/Dev/astro-starter && git status --short
```
Expected: clean build, astro suite green, swift suite green, no stray files.

- [ ] **Step 4: Close the task** (from `/Users/dalton/Dev/push-pop`, add notes/final-summary first)

```bash
backlog task edit 48 --check-ac 1 --check-ac 2 --check-ac 3 --check-ac 4 -s Done
```

---

## Notes for the implementer

- **Working dirs:** astro-starter code at `/Users/dalton/Dev/astro-starter`; push-pop (Swift) at `/Users/dalton/Dev/push-pop`; backlog CLI from `/Users/dalton/Dev/push-pop`.
- **No co-author byline** on commits.
- Downstream consumers (`Header`/`Footer`/`Base`/`design-overrides`/blocks/`normalizeSettings`) must NOT change — the merge in `getSettings` preserves the existing shape. If a task seems to require editing them, stop and re-read the spec.
- Breaking change: existing single-`settings.json` sites won't load; this is expected. The starter and the test site rebuild from scaffold.
