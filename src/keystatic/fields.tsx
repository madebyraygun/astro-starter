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
