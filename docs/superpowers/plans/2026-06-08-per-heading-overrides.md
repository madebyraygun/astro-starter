# Per-heading-size overrides — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let each heading "size" (block variants Display/Heading/Eyebrow + prose levels h1–h6) override the global scale/tracking/case tokens, edited via a collapsible field in Site Settings (TASK-47).

**Architecture:** A custom Keystatic field stores per-size overrides as a JSON string under `design.headings`; a pure emitter in `design-overrides.js` turns that into per-size CSS custom properties; `core.css` heading rules reference each per-size var with a fallback to the global `--heading-*` token, then to a base value.

**Tech Stack:** Keystatic custom fields (React 19), Astro, `node --test` scaffold suite, headless Chrome for admin verification.

Spec: `docs/superpowers/specs/2026-06-08-per-heading-overrides-design.md`.

**Plan refinements over the spec (within its stated fallbacks):** storage is a JSON string in a spread `fields.text` (reuses the TASK-46 custom-field pattern; no hand-rolled object `BasicFormField`); the emitter lives in `lib/design-overrides.js` (reuses its `isSet`/`isSafe`, no circular import); base h1–h6 sizes are hardcoded in `core.css` (no `--hN-base` var — YAGNI).

CSS var naming: variants → `--h-<id>-<prop>` (e.g. `--h-display-scale`); levels → `--h<n>-<prop>` (e.g. `--h2-tracking`). Props: `scale` (unitless), `tracking` (`em`), `transform` (keyword).

---

### Task 1: Emitter — `headingOverridesCss` + `designOverridesCss` wiring (TDD)

**Files:**
- Modify: `lib/design-overrides.js`
- Test: `scaffold/heading-overrides.test.js`

- [ ] **Step 1: Write the failing tests**

Create `scaffold/heading-overrides.test.js`:

```js
import test from "node:test";
import assert from "node:assert";
import { headingOverridesCss, designOverridesCss } from "../lib/design-overrides.js";

test("headingOverridesCss emits variant + level vars with units", () => {
  const lines = headingOverridesCss({
    display: { scale: "1.5", tracking: "0.1", transform: "uppercase" },
    h2: { scale: "1.2", tracking: "", transform: "" },
  });
  assert.ok(lines.includes("--h-display-scale: 1.5;"), lines.join(" "));
  assert.ok(lines.includes("--h-display-tracking: 0.1em;"));
  assert.ok(lines.includes("--h-display-transform: uppercase;"));
  assert.ok(lines.includes("--h2-scale: 1.2;"));
  assert.ok(!lines.some((l) => l.startsWith("--h2-tracking")));
});

test("headingOverridesCss handles empty / invalid / empty groups", () => {
  assert.deepStrictEqual(headingOverridesCss(null), []);
  assert.deepStrictEqual(headingOverridesCss({}), []);
  assert.deepStrictEqual(headingOverridesCss({ display: {} }), []);
});

test("headingOverridesCss skips unsafe values", () => {
  assert.deepStrictEqual(headingOverridesCss({ h1: { scale: "1}</style>" } }), []);
});

test("designOverridesCss merges heading overrides from a JSON string", () => {
  const css = designOverridesCss({ headings: JSON.stringify({ display: { scale: "2" } }) }, {});
  assert.match(css, /^:root \{ /);
  assert.match(css, /--h-display-scale: 2;/);
});

test("designOverridesCss tolerates malformed/empty headings", () => {
  assert.strictEqual(designOverridesCss({ headings: "{bad" }, {}), "");
  assert.strictEqual(designOverridesCss({ headings: "" }, {}), "");
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --test scaffold/heading-overrides.test.js`
Expected: FAIL — `headingOverridesCss` is not exported.

- [ ] **Step 3: Implement in `lib/design-overrides.js`**

Add the emitter and wire it into `designOverridesCss`. Add this block ABOVE the existing `function designOverridesCss(...)`:

```js
const HEADING_VARIANT_IDS = ["display", "heading", "eyebrow"];
const HEADING_LEVEL_IDS = ["h1", "h2", "h3", "h4", "h5", "h6"];
const HEADING_PROPS = [
  ["scale", "scale", ""],
  ["tracking", "tracking", "em"],
  ["transform", "transform", ""],
];

function headingVar(sizeId, prop) {
  const base = HEADING_LEVEL_IDS.includes(sizeId) ? sizeId : `h-${sizeId}`;
  return `--${base}-${prop}`;
}

// Returns an array of CSS declaration strings for the set per-size overrides.
function headingOverridesCss(headings) {
  if (!headings || typeof headings !== "object") return [];
  const lines = [];
  for (const sizeId of [...HEADING_VARIANT_IDS, ...HEADING_LEVEL_IDS]) {
    const group = headings[sizeId];
    if (!group || typeof group !== "object") continue;
    for (const [key, prop, unit] of HEADING_PROPS) {
      const value = group[key];
      if (isSet(value) && isSafe(value)) lines.push(`${headingVar(sizeId, prop)}: ${value}${unit};`);
    }
  }
  return lines;
}
```

Then, inside `designOverridesCss`, after the `FONT_TOKENS` loop and before the `return`, add:

```js
  let headings = design.headings;
  if (typeof headings === "string") {
    try {
      headings = headings ? JSON.parse(headings) : null;
    } catch {
      headings = null;
    }
  }
  lines.push(...headingOverridesCss(headings));
```

Finally, update the export line at the bottom:

```js
export { designOverridesCss, headingOverridesCss };
```

- [ ] **Step 4: Run to verify pass**

Run: `node --test scaffold/heading-overrides.test.js`
Expected: PASS (5 tests). Then `npm test` — full suite green.

- [ ] **Step 5: Commit**

```bash
git add lib/design-overrides.js scaffold/heading-overrides.test.js
git commit -m "feat(theme): emit per-heading-size override CSS vars"
```

---

### Task 2: `core.css` — per-size cascade for variants + h1–h6

**Files:**
- Modify: `public/assets/css/core.css` (`.block-heading` block at lines ~53-66; the `h1, h2, h3, h4` rule at line ~12)

- [ ] **Step 1: Update the `.block-heading` variant rules**

Replace the current `.block-heading { … }`, `.block-heading.is-display { … }`, and `.block-heading.is-eyebrow { … }` rules with:

```css
.block-heading {
  margin-top: calc(var(--space-unit) * 2);
  font-size: calc(1.6rem * var(--h-heading-scale, var(--heading-scale, 1)));
  letter-spacing: var(--h-heading-tracking, var(--heading-tracking, normal));
  text-transform: var(--h-heading-transform, var(--heading-transform, none));
}
.block-heading.is-display {
  font-size: calc(2.6rem * var(--h-display-scale, var(--heading-scale, 1)));
  letter-spacing: var(--h-display-tracking, var(--heading-tracking, normal));
  text-transform: var(--h-display-transform, var(--heading-transform, none));
}
.block-heading.is-eyebrow {
  font-size: calc(0.8rem * var(--h-eyebrow-scale, var(--heading-scale, 1)));
  letter-spacing: var(--h-eyebrow-tracking, var(--heading-tracking, 0.12em));
  text-transform: var(--h-eyebrow-transform, uppercase);
  color: var(--color-muted);
  font-weight: 600;
}
```

(Keep any rules that already follow `.block-heading.is-eyebrow` — e.g. the `font-weight` and `color` lines shown — exactly as they were; only the three font-size/letter-spacing/text-transform-bearing rules change. If `is-eyebrow` already includes `color`/`font-weight` after `text-transform`, preserve them as above.)

- [ ] **Step 2: Add per-level h1–h6 rules**

Immediately AFTER the existing line `h1, h2, h3, h4 { font-family: var(--font-display); line-height: 1.2; }` (line ~12), add:

```css
h1 { font-size: calc(2.4rem * var(--h1-scale, var(--heading-scale, 1))); letter-spacing: var(--h1-tracking, var(--heading-tracking, normal)); text-transform: var(--h1-transform, var(--heading-transform, none)); }
h2 { font-size: calc(1.8rem * var(--h2-scale, var(--heading-scale, 1))); letter-spacing: var(--h2-tracking, var(--heading-tracking, normal)); text-transform: var(--h2-transform, var(--heading-transform, none)); }
h3 { font-size: calc(1.4rem * var(--h3-scale, var(--heading-scale, 1))); letter-spacing: var(--h3-tracking, var(--heading-tracking, normal)); text-transform: var(--h3-transform, var(--heading-transform, none)); }
h4 { font-size: calc(1.2rem * var(--h4-scale, var(--heading-scale, 1))); letter-spacing: var(--h4-tracking, var(--heading-tracking, normal)); text-transform: var(--h4-transform, var(--heading-transform, none)); }
h5 { font-size: calc(1rem * var(--h5-scale, var(--heading-scale, 1))); letter-spacing: var(--h5-tracking, var(--heading-tracking, normal)); text-transform: var(--h5-transform, var(--heading-transform, none)); }
h6 { font-size: calc(0.875rem * var(--h6-scale, var(--heading-scale, 1))); letter-spacing: var(--h6-tracking, var(--heading-tracking, normal)); text-transform: var(--h6-transform, var(--heading-transform, none)); }
```

Note: `.block-heading*` rules (specificity 0,1,0+) win over these bare-tag rules (0,0,1) for block headings, so block headings stay governed by the variant rules; only prose headings pick up the per-level ramp.

- [ ] **Step 3: Build to verify**

Run: `npm run build`
Expected: completes with no errors.

- [ ] **Step 4: Commit**

```bash
git add public/assets/css/core.css
git commit -m "feat(theme): per-size heading cascade (variants + h1-h6 ramp)"
```

---

### Task 3: `headingsField` custom field + config wiring

**Files:**
- Modify: `src/keystatic/fields.tsx` (append the field; uses existing `React`, `fields`, `FieldShell`, `InputProps`, `Option`)
- Modify: `keystatic.config.ts` (import; add `headings:` to the `design` object after `headingTransform`)

- [ ] **Step 1: Append `headingsField` to `src/keystatic/fields.tsx`**

Add at the END of the file:

```tsx
// TASK-47: per-heading-size overrides — a collapsible <details> per size, stored
// as a JSON string (empty = no overrides). Each group overrides scale/tracking/case.
const HEADING_SIZES: { group: string; items: { id: string; label: string }[] }[] = [
  {
    group: "Variants (block headings)",
    items: [
      { id: "display", label: "Display" },
      { id: "heading", label: "Heading" },
      { id: "eyebrow", label: "Eyebrow" },
    ],
  },
  {
    group: "Levels (prose headings)",
    items: [
      { id: "h1", label: "h1" },
      { id: "h2", label: "h2" },
      { id: "h3", label: "h3" },
      { id: "h4", label: "h4" },
      { id: "h5", label: "h5" },
      { id: "h6", label: "h6" },
    ],
  },
];

type HeadingData = Record<string, Record<string, string>>;

function parseHeadings(value: string): HeadingData {
  if (!value) return {};
  try {
    const o = JSON.parse(value);
    return o && typeof o === "object" ? o : {};
  } catch {
    return {};
  }
}

function serializeHeadings(data: HeadingData): string {
  const out: HeadingData = {};
  for (const [size, props] of Object.entries(data)) {
    const kept: Record<string, string> = {};
    for (const [k, v] of Object.entries(props || {})) if (v) kept[k] = v;
    if (Object.keys(kept).length) out[size] = kept;
  }
  return Object.keys(out).length ? JSON.stringify(out) : "";
}

function HeadingsInput({ value, onChange }: InputProps) {
  const data = parseHeadings(value);
  const update = (id: string, prop: string, v: string) => {
    const next: HeadingData = { ...data, [id]: { ...(data[id] || {}), [prop]: v } };
    onChange(serializeHeadings(next));
  };
  const cell = { padding: "4px 6px", border: "1px solid #cbced4", borderRadius: 4 } as const;
  const col = { display: "flex", flexDirection: "column", fontSize: 12, gap: 2 } as const;
  return (
    <FieldShell
      label="Per-size heading overrides"
      description="Override scale / letter-spacing / case for a specific heading size. Empty inherits the defaults above, then the theme."
    >
      {HEADING_SIZES.map((group) => (
        <div key={group.group} style={{ marginBottom: 8 }}>
          <p style={{ fontSize: 12, fontWeight: 600, opacity: 0.7, margin: "8px 0 4px" }}>{group.group}</p>
          {group.items.map((item) => {
            const g = data[item.id] || {};
            const active = Boolean(g.scale || g.tracking || g.transform);
            return (
              <details key={item.id} open={active} style={{ border: "1px solid #cbced4", borderRadius: 6, padding: "6px 10px", marginBottom: 4 }}>
                <summary style={{ cursor: "pointer", fontWeight: 600 }}>
                  {item.label}
                  {active ? " •" : ""}
                </summary>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                  <label style={col}>
                    Scale
                    <input type="number" step="0.05" value={g.scale ?? ""} onChange={(e) => update(item.id, "scale", e.target.value)} style={cell} />
                  </label>
                  <label style={col}>
                    Tracking (em)
                    <input type="number" step="0.01" value={g.tracking ?? ""} onChange={(e) => update(item.id, "tracking", e.target.value)} style={cell} />
                  </label>
                  <label style={col}>
                    Case
                    <select value={g.transform ?? ""} onChange={(e) => update(item.id, "transform", e.target.value)} style={cell}>
                      <option value="">Default</option>
                      <option value="none">None</option>
                      <option value="uppercase">Uppercase</option>
                    </select>
                  </label>
                </div>
              </details>
            );
          })}
        </div>
      ))}
    </FieldShell>
  );
}

export function headingsField() {
  const base = fields.text({ label: "Per-size heading overrides" });
  return { ...base, Input: HeadingsInput };
}
```

- [ ] **Step 2: Wire into `keystatic.config.ts`**

Update the fields import to include `headingsField`:

```ts
import { colorField, fontField, themeField, headingsField } from "./src/keystatic/fields";
```

Add the field to the `design` object, immediately AFTER the `headingTransform: fields.select({ … }),` block:

```ts
            headings: headingsField(),
```

- [ ] **Step 3: Build to verify**

Run: `npm run build` (expect success) and `npm test` (expect full suite green incl. the 5 heading-override tests).

- [ ] **Step 4: Commit**

```bash
git add src/keystatic/fields.tsx keystatic.config.ts
git commit -m "feat(settings): collapsible per-heading-size override field"
```

---

### Task 4: End-to-end verification in the admin

**Files:** none (verification only).

- [ ] **Step 1: Start the dev server**

```bash
cd /Users/dalton/Dev/astro-starter && PORT=8090 npm run dev > /tmp/astro-dev-47.log 2>&1 &
```
Wait until `curl -s -o /dev/null -w "%{http_code}" http://localhost:8090/keystatic` returns 200.

- [ ] **Step 2: Drive the admin in headless Chrome**

Open `http://localhost:8090/keystatic/singleton/settings`. Under "Customize Design" find the new "Per-size heading overrides" field. Verify:
1. Nine `<details>` rows render in two groups (Variants: Display/Heading/Eyebrow; Levels: h1–h6), collapsed by default.
2. Expand **Display**, set Scale `2` — a `•` marker appears on the summary; check the page's `<style>` (injected `:root`) gains `--h-display-scale: 2;` (use `evaluate_script` to read `[...document.querySelectorAll('style')].map(s=>s.textContent).join('')` and assert it contains the var). Note: Site Settings drives the admin; to see the rendered effect, also confirm a Pages block heading with Display style enlarges in the preview, or rely on the emitted var + the Task 1 unit coverage.
3. Set **h2** Tracking `0.2`; confirm `--h2-tracking: 0.2em;` is emitted.
4. Clear the values; confirm the vars disappear (field serializes back to empty) and the summary `•` markers clear.
5. `list_console_messages` → no errors.

- [ ] **Step 3: Stop dev, confirm clean**

```bash
lsof -ti tcp:8090 | xargs kill 2>/dev/null
cd /Users/dalton/Dev/astro-starter && npm run build && git status --short
```
Expected: clean build; no stray files.

- [ ] **Step 4: Close the task** (from `/Users/dalton/Dev/push-pop`, add `--notes`/`--final-summary` first)

```bash
backlog task edit 47 --check-ac 1 --check-ac 2 --check-ac 3 --check-ac 4 --check-ac 5 -s Done
```

---

## Notes for the implementer

- **Working dirs:** code in `/Users/dalton/Dev/astro-starter`; backlog CLI from `/Users/dalton/Dev/push-pop`.
- **No co-author byline** on commits.
- `design.headings` is a JSON string; old sites without it are unaffected (all CSS `var()` fallbacks resolve to the global token, then the base/theme value).
- Block headings stay governed by the variant rules (CSS specificity); only prose headings get the h1–h6 ramp — this is the intended new behavior that extends heading tokens to prose.
