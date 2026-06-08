# Theme-aware field defaults — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a color/font token is unset in Site Settings, show the active theme's real value — the color swatch in the theme's color, the font field with the theme's font name in its own typeface (TASK-46).

**Architecture:** A custom `themeField` (native `<select>`) publishes the selected theme to a small module store; `colorField`/`fontField` subscribe via a `useThemeTokens()` hook that fetches+parses `/assets/css/themes/<slug>.css` at runtime (zero drift). Pure parsing lives in framework-free `lib/theme-tokens.js` (testable).

**Tech Stack:** Keystatic custom fields (React 19), Astro, `node --test` scaffold suite, headless Chrome for admin verification.

Spec: `docs/superpowers/specs/2026-06-08-theme-aware-field-defaults-design.md`.

---

### Task 1: Pure theme-CSS parser — `lib/theme-tokens.js` (TDD)

**Files:**
- Create: `lib/theme-tokens.js`
- Test: `scaffold/theme-tokens.test.js`

- [ ] **Step 1: Write the failing tests**

Create `scaffold/theme-tokens.test.js`:

```js
import test from "node:test";
import assert from "node:assert";
import { parseThemeCss, firstFamily } from "../lib/theme-tokens.js";

test("parseThemeCss extracts custom properties", () => {
  const css = ':root { --color-bg: #faf6ef; --color-accent: #9a2b2b; --font-display: "Lora", Georgia, serif; --radius: 4px; }';
  const t = parseThemeCss(css);
  assert.strictEqual(t["--color-bg"], "#faf6ef");
  assert.strictEqual(t["--color-accent"], "#9a2b2b");
  assert.strictEqual(t["--font-display"], '"Lora", Georgia, serif');
  assert.strictEqual(t["--radius"], "4px");
  assert.strictEqual(t["--missing"], undefined);
});

test("parseThemeCss tolerates empty / junk input", () => {
  assert.deepStrictEqual(parseThemeCss(""), {});
  assert.deepStrictEqual(parseThemeCss("not css"), {});
});

test("firstFamily strips quotes and trailing stack", () => {
  assert.strictEqual(firstFamily('"Lora", Georgia, serif'), "Lora");
  assert.strictEqual(firstFamily("Inter, system-ui, sans-serif"), "Inter");
  assert.strictEqual(firstFamily("'Space Grotesk', sans-serif"), "Space Grotesk");
  assert.strictEqual(firstFamily(""), "");
  assert.strictEqual(firstFamily(undefined), "");
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test scaffold/theme-tokens.test.js`
Expected: FAIL — `Cannot find module '../lib/theme-tokens.js'`.

- [ ] **Step 3: Implement the parser**

Create `lib/theme-tokens.js`:

```js
// Pure helpers for reading a theme's CSS custom properties (framework-free so
// node --test can cover them; mirrors lib/design-overrides.js).

export function parseThemeCss(cssText) {
  const out = {};
  if (typeof cssText !== "string") return out;
  const re = /(--[a-z-]+)\s*:\s*([^;]+);/gi;
  let m;
  while ((m = re.exec(cssText))) out[m[1]] = m[2].trim();
  return out;
}

// First family name from a CSS font stack: '"Lora", Georgia, serif' -> "Lora".
export function firstFamily(stack) {
  if (!stack) return "";
  return stack.split(",")[0].trim().replace(/^["']|["']$/g, "");
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test scaffold/theme-tokens.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/theme-tokens.js scaffold/theme-tokens.test.js
git commit -m "feat(theme): testable theme-CSS token parser"
```

---

### Task 2: Theme store + `themeField`, wired into the config

**Files:**
- Create: `src/keystatic/themeStore.ts`
- Modify: `src/keystatic/fields.tsx` (add `themeField`)
- Modify: `keystatic.config.ts` (imports; `theme:` field at lines 304-313)

- [ ] **Step 1: Create the store + hook**

Create `src/keystatic/themeStore.ts`:

```ts
import React from "react";
// @ts-ignore - framework-free JS helper
import { parseThemeCss } from "../../lib/theme-tokens.js";

type Tokens = Record<string, string>;

let currentTheme = "paper";
const listeners = new Set<() => void>();
const tokenCache: Record<string, Tokens> = {};
const pending: Record<string, boolean> = {};

function notify() {
  listeners.forEach((l) => l());
}

export function setTheme(slug: string) {
  const next = slug || "paper";
  if (next === currentTheme) return;
  currentTheme = next;
  notify();
}

function ensureTokens(slug: string) {
  if (tokenCache[slug] || pending[slug] || typeof fetch === "undefined") return;
  pending[slug] = true;
  fetch(`/assets/css/themes/${slug}.css`)
    .then((res) => (res.ok ? res.text() : Promise.reject(new Error(String(res.status)))))
    .then((css) => {
      tokenCache[slug] = parseThemeCss(css);
      notify();
    })
    .catch(() => {
      /* offline / missing theme css — leave uncached; fields keep neutral fallback */
    })
    .finally(() => {
      pending[slug] = false;
    });
}

// Returns the parsed tokens for the active theme, or null until first load.
export function useThemeTokens(): Tokens | null {
  const [, force] = React.useReducer((n: number) => n + 1, 0);
  React.useEffect(() => {
    listeners.add(force);
    return () => {
      listeners.delete(force);
    };
  }, []);
  const theme = currentTheme;
  React.useEffect(() => {
    ensureTokens(theme);
  }, [theme]);
  return tokenCache[theme] ?? null;
}
```

- [ ] **Step 2: Add `themeField` to `fields.tsx`**

At the top of `src/keystatic/fields.tsx`, add the store import after the existing imports (line 3):

```ts
import { setTheme, useThemeTokens } from "./themeStore";
```

At the END of `src/keystatic/fields.tsx` (after `fontField`), add:

```tsx
// TASK-46: theme select that publishes the selection to the theme store so the
// color/font fields can preview the active theme's defaults. Native <select>
// (plain-text options render fine in WebKit; only per-option font styling does not).
const THEME_OPTIONS: Option[] = [
  { label: "Paper", value: "paper" },
  { label: "Signal", value: "signal" },
  { label: "Carbon", value: "carbon" },
  { label: "Dune", value: "dune" },
];

function ThemeInput({ value, onChange }: InputProps) {
  React.useEffect(() => {
    setTheme(value);
  }, [value]);
  return (
    <FieldShell label="Theme">
      <select
        aria-label="Theme"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ maxWidth: 360, padding: "7px 9px", border: "1px solid #cbced4", borderRadius: 6 }}
      >
        {THEME_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </FieldShell>
  );
}

export function themeField() {
  const base = fields.select({ label: "Theme", options: THEME_OPTIONS, defaultValue: "paper" });
  return { ...base, Input: ThemeInput };
}
```

- [ ] **Step 3: Wire the theme field in the config**

In `keystatic.config.ts`, update the import on line 4:

```ts
import { colorField, fontField, themeField } from "./src/keystatic/fields";
```

Replace the `theme:` select (lines 304-313) with:

```ts
        theme: themeField(),
```

- [ ] **Step 4: Build to verify it compiles**

Run: `npm run build`
Expected: build completes with no errors.

- [ ] **Step 5: Commit**

```bash
git add src/keystatic/themeStore.ts src/keystatic/fields.tsx keystatic.config.ts
git commit -m "feat(settings): theme field publishes selection to a theme-token store"
```

---

### Task 3: `colorField(label, cssVar)` shows the theme color when unset

**Files:**
- Modify: `src/keystatic/fields.tsx` (`makeColorInput` lines 36-67, `colorField` lines 69-73)
- Modify: `keystatic.config.ts` (`optionalColor` line 9; color fields lines 366-371)

- [ ] **Step 1: Use the theme token as the swatch fallback**

Replace `makeColorInput` and `colorField` (lines 36-73) in `src/keystatic/fields.tsx` with:

```tsx
// TASK-44/46: color token field — native swatch + hex text. Empty shows the
// active theme's color for `cssVar` (TASK-46); the stored value stays empty.
function makeColorInput(label: string, description: string, cssVar: string) {
  return function ColorInput({ value, onChange, autoFocus }: InputProps) {
    const tokens = useThemeTokens();
    const themeColor = tokens?.[cssVar];
    const swatch = HEX.test(value)
      ? value
      : themeColor && HEX.test(themeColor)
        ? themeColor
        : "#000000";
    return (
      <FieldShell label={label} description={description}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            type="color"
            aria-label={`${label} swatch`}
            value={swatch}
            onChange={(e) => onChange(e.target.value)}
            style={{ width: 42, height: 34, padding: 0, border: "1px solid #cbced4", borderRadius: 6, background: "none" }}
          />
          <input
            type="text"
            aria-label={label}
            autoFocus={autoFocus}
            value={value}
            placeholder="#336699"
            onChange={(e) => onChange(e.target.value)}
            style={{ flex: 1, minWidth: 0, padding: "7px 9px", border: "1px solid #cbced4", borderRadius: 6 }}
          />
          {value && (
            <button type="button" onClick={() => onChange("")} style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #cbced4", background: "none", cursor: "pointer" }}>
              Clear
            </button>
          )}
        </div>
      </FieldShell>
    );
  };
}

export function colorField(label: string, cssVar: string) {
  const description = "Hex color, e.g. #336699. Leave empty for the theme default.";
  const base = fields.text({ label, description });
  return { ...base, Input: makeColorInput(label, description, cssVar) };
}
```

- [ ] **Step 2: Pass the CSS var for each color in the config**

In `keystatic.config.ts`, delete the `const optionalColor = colorField;` line (line 9). Replace the six color fields (lines 366-371) with:

```ts
            colorBg: colorField("Background color", "--color-bg"),
            colorSurface: colorField("Surface color", "--color-surface"),
            colorText: colorField("Text color", "--color-text"),
            colorMuted: colorField("Muted text color", "--color-muted"),
            colorAccent: colorField("Accent color", "--color-accent"),
            colorAccentContrast: colorField("Text on accent color", "--color-accent-contrast"),
```

- [ ] **Step 3: Build to verify**

Run: `npm run build`
Expected: build completes (the now-unused `optionalColor` is gone; no reference remains — confirm with `grep -n optionalColor keystatic.config.ts` returning nothing).

- [ ] **Step 4: Commit**

```bash
git add src/keystatic/fields.tsx keystatic.config.ts
git commit -m "feat(settings): color swatch previews the active theme color when unset"
```

---

### Task 4: `fontField(label, role)` shows the theme font when unset

**Files:**
- Modify: `src/keystatic/fields.tsx` (imports for `firstFamily`; `makeFontInput` lines 99-152; `fontField` lines 154-161)
- Modify: `keystatic.config.ts` (font fields lines 372-373)

- [ ] **Step 1: Add the `firstFamily` import**

In `src/keystatic/fields.tsx`, extend the store import line added in Task 2 so it also pulls the parser helper. Replace:

```ts
import { setTheme, useThemeTokens } from "./themeStore";
```

with:

```ts
import { setTheme, useThemeTokens } from "./themeStore";
// @ts-ignore - framework-free JS helper
import { firstFamily } from "../../lib/theme-tokens.js";
```

- [ ] **Step 2: Make the font field theme-aware**

Replace `makeFontInput` and `fontField` (lines 99-161) in `src/keystatic/fields.tsx` with:

```tsx
function makeFontInput(label: string, options: Option[], role: "display" | "body") {
  return function FontInput({ value, onChange }: InputProps) {
    const [open, setOpen] = React.useState(false);
    const ref = React.useRef<HTMLDivElement>(null);
    const tokens = useThemeTokens();
    React.useEffect(() => {
      ensureAdminFonts();
    }, []);
    React.useEffect(() => {
      if (!open) return;
      const onDown = (e: MouseEvent) => {
        if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
      };
      document.addEventListener("mousedown", onDown);
      return () => document.removeEventListener("mousedown", onDown);
    }, [open]);

    const themeStack = tokens?.[`--font-${role}`];
    const themeFamily = firstFamily(themeStack ?? "");
    const defaultLabel = themeFamily ? `${themeFamily} (theme default)` : "Theme default";
    const triggerLabel = value ? (options.find((o) => o.value === value)?.label ?? value) : defaultLabel;
    const triggerStack = value ? stackFor(value) : themeStack || undefined;

    return (
      <FieldShell label={label}>
        <div ref={ref} style={{ position: "relative", maxWidth: 360 }}>
          <button
            type="button"
            aria-haspopup="listbox"
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
            style={{ width: "100%", textAlign: "left", padding: "7px 9px", border: "1px solid #cbced4", borderRadius: 6, background: "none", cursor: "pointer", fontFamily: triggerStack, fontSize: 15 }}
          >
            {triggerLabel}
          </button>
          {open && (
            <ul
              role="listbox"
              style={{ position: "absolute", zIndex: 10, top: "calc(100% + 4px)", left: 0, right: 0, margin: 0, padding: 4, listStyle: "none", maxHeight: 280, overflowY: "auto", background: "#fff", color: "#111", border: "1px solid #cbced4", borderRadius: 6, boxShadow: "0 6px 24px rgba(0,0,0,0.18)" }}
            >
              {options.map((o) => {
                const isDefaultOption = o.value === "";
                const optLabel = isDefaultOption ? defaultLabel : o.label;
                const optStack = isDefaultOption ? themeStack || undefined : stackFor(o.value);
                return (
                  <li key={o.value} role="option" aria-selected={o.value === value}>
                    <button
                      type="button"
                      onClick={() => {
                        onChange(o.value);
                        setOpen(false);
                      }}
                      style={{ width: "100%", textAlign: "left", padding: "8px 10px", border: 0, borderRadius: 4, background: o.value === value ? "#eef1f6" : "transparent", color: "#111", cursor: "pointer", fontFamily: optStack, fontSize: 16 }}
                    >
                      {optLabel}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </FieldShell>
    );
  };
}

export function fontField(label: string, role: "display" | "body") {
  const options: Option[] = [
    { label: "Theme default", value: "" },
    ...Object.entries(FONTS).map(([value, f]) => ({ label: f.label, value })),
  ];
  const base = fields.select({ label, options, defaultValue: "" });
  return { ...base, Input: makeFontInput(label, options, role) };
}
```

- [ ] **Step 3: Pass the role for each font in the config**

In `keystatic.config.ts`, replace the two font fields (lines 372-373) with:

```ts
            fontDisplay: fontField("Display font", "display"),
            fontBody: fontField("Body font", "body"),
```

- [ ] **Step 4: Build + full test suite**

Run: `npm run build && npm test`
Expected: build completes; all tests pass (existing suite + the 3 new `theme-tokens` tests).

- [ ] **Step 5: Commit**

```bash
git add src/keystatic/fields.tsx keystatic.config.ts
git commit -m "feat(settings): font picker previews the active theme font when unset"
```

---

### Task 5: End-to-end verification in the admin

**Files:** none (verification only).

- [ ] **Step 1: Start the dev server against the dune test site**

The `/Users/dalton/Sites/test` site is docs/**dune**. Rebuild it from this branch's starter so it carries these changes, then run dev:

```bash
cd /Users/dalton/Dev/astro-starter && PORT=8090 npm run dev > /tmp/astro-dev-8090.log 2>&1 &
```
(Use `astro-starter` itself as the admin — it has Site Settings with the dune theme available to select.)

- [ ] **Step 2: Drive the admin in headless Chrome**

Navigate to `http://localhost:8090/keystatic/singleton/settings`, then:
1. Click the **Theme** select, choose **Dune**.
2. Confirm each unset color swatch shows a **dune** color (not `#000000`) — Background/Surface/Text/Muted/Accent/Text-on-accent.
3. Confirm **Display font** / **Body font** triggers show dune's font names with "(theme default)", rendered in those typefaces.
4. Switch Theme to **Signal**; confirm unset swatches + fonts update live.
5. Type `#123456` into a color's hex box → swatch follows the typed value; Clear → swatch returns to the theme color.
6. Pick an explicit font → trigger shows that font; reselect "… (theme default)" → returns to theme font.
7. Check `list_console_messages` for errors (expect none).

Expected: all of the above hold.

- [ ] **Step 3: Stop the dev server and confirm clean tree**

```bash
lsof -ti tcp:8090 | xargs kill 2>/dev/null
cd /Users/dalton/Dev/astro-starter && npm run build && git status --short
```
Expected: clean build; `git status` shows no stray files (all changes already committed).

- [ ] **Step 4: Close the task in the backlog** (from `/Users/dalton/Dev/push-pop`)

```bash
backlog task edit 46 --check-ac 1 --check-ac 2 --check-ac 3 --check-ac 4 -s Done   # add --notes/--final-summary first
```

---

## Notes for the implementer

- **Working dirs:** code in `/Users/dalton/Dev/astro-starter`; backlog CLI from `/Users/dalton/Dev/push-pop`.
- **No co-author byline** on commits.
- The store works across separately-mounted fields because all Keystatic field `Input`s render in one admin React bundle/document.
- The admin only runs in dev (Keystatic local mode), so the runtime `fetch('/assets/css/themes/<slug>.css')` always has a server to hit; the theme CSS is served from `public/`.
