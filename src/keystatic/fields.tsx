import React from "react";
import { fields } from "@keystatic/core";
import catalog from "../data/fontCatalog.json";
import { setTheme, useThemeTokens } from "./themeStore";
// @ts-ignore - framework-free JS helper
import { firstFamily } from "../../lib/theme-tokens.js";

// Custom Keystatic admin fields. Each spreads a base text/select field (keeping
// Keystatic's string parse/serialize/reader plumbing) and overrides only the
// React `Input`, so the stored value and the reader stay unchanged.

type InputProps = {
  value: string;
  onChange: (value: string) => void;
  autoFocus?: boolean;
};

const HEX = /^#[0-9a-fA-F]{6}$/;

function FieldShell({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: 13, fontWeight: 600 }}>{label}</span>
      {children}
      {description && <span style={{ fontSize: 12, opacity: 0.7 }}>{description}</span>}
    </div>
  );
}

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

// TASK-43: font picker that renders each option in its own typeface.
type FontMeta = { label: string; stack: string; weights: number[] };
const FONTS = catalog as Record<string, FontMeta>;
type Option = { label: string; value: string };

// Admin-only preview fonts. The PUBLISHED site stays fully self-hosted via the
// font-download integration; the admin just needs every catalog family loaded
// to preview fonts the site doesn't use yet, so we lazily pull them from Google
// Fonts (admin DOM only, never bundled into the build output).
let adminFontsRequested = false;
function ensureAdminFonts() {
  if (adminFontsRequested || typeof document === "undefined") return;
  adminFontsRequested = true;
  const families = Object.values(FONTS)
    .map((f) => `family=${f.label.replace(/ /g, "+")}:wght@400;700`)
    .join("&");
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?${families}&display=swap`;
  document.head.appendChild(link);
}

const stackFor = (value: string) => (value && FONTS[value] ? FONTS[value].stack : undefined);

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
