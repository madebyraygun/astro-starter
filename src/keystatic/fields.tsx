import React from "react";
import { fields } from "@keystatic/core";
import catalog from "../data/fontCatalog.json";

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

// TASK-44: color token field — native swatch + hex text. Empty = theme default.
function makeColorInput(label: string, description?: string) {
  return function ColorInput({ value, onChange, autoFocus }: InputProps) {
    const swatch = HEX.test(value) ? value : "#000000";
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

export function colorField(label: string) {
  const description = "Hex color, e.g. #336699. Leave empty for the theme default.";
  const base = fields.text({ label, description });
  return { ...base, Input: makeColorInput(label, description) };
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

function makeFontInput(label: string, options: Option[]) {
  return function FontInput({ value, onChange }: InputProps) {
    const [open, setOpen] = React.useState(false);
    const ref = React.useRef<HTMLDivElement>(null);
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
    const current = options.find((o) => o.value === value) ?? options[0];
    return (
      <FieldShell label={label}>
        <div ref={ref} style={{ position: "relative", maxWidth: 360 }}>
          <button
            type="button"
            aria-haspopup="listbox"
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
            style={{ width: "100%", textAlign: "left", padding: "7px 9px", border: "1px solid #cbced4", borderRadius: 6, background: "none", cursor: "pointer", fontFamily: stackFor(value), fontSize: 15 }}
          >
            {current.label}
          </button>
          {open && (
            <ul
              role="listbox"
              style={{ position: "absolute", zIndex: 10, top: "calc(100% + 4px)", left: 0, right: 0, margin: 0, padding: 4, listStyle: "none", maxHeight: 280, overflowY: "auto", background: "#fff", color: "#111", border: "1px solid #cbced4", borderRadius: 6, boxShadow: "0 6px 24px rgba(0,0,0,0.18)" }}
            >
              {options.map((o) => (
                <li key={o.value} role="option" aria-selected={o.value === value}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(o.value);
                      setOpen(false);
                    }}
                    style={{ width: "100%", textAlign: "left", padding: "8px 10px", border: 0, borderRadius: 4, background: o.value === value ? "#eef1f6" : "transparent", color: "#111", cursor: "pointer", fontFamily: stackFor(o.value), fontSize: 16 }}
                  >
                    {o.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </FieldShell>
    );
  };
}

export function fontField(label: string) {
  const options: Option[] = [
    { label: "Theme default", value: "" },
    ...Object.entries(FONTS).map(([value, f]) => ({ label: f.label, value })),
  ];
  const base = fields.select({ label, options, defaultValue: "" });
  return { ...base, Input: makeFontInput(label, options) };
}
