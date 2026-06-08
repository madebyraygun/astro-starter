// Builds the :root CSS that applies a site's design overrides on top of its theme.
const TOKENS = [
  ["colorBg", "--color-bg", ""],
  ["colorSurface", "--color-surface", ""],
  ["colorText", "--color-text", ""],
  ["colorMuted", "--color-muted", ""],
  ["colorAccent", "--color-accent", ""],
  ["colorAccentContrast", "--color-accent-contrast", ""],
  ["radius", "--radius", "px"],
  ["spaceUnit", "--space-unit", "rem"],
  ["contentWidth", "--content-width", "rem"],
  ["headingScale", "--heading-scale", ""],
  ["headingTracking", "--heading-tracking", "em"],
  ["headingTransform", "--heading-transform", ""],
];

const FONT_TOKENS = [
  ["fontDisplay", "--font-display"],
  ["fontBody", "--font-body"],
];

function isSet(value) {
  return value !== undefined && value !== null && value !== "";
}

function isSafe(value) {
  return !/[<>{};\n\r]/.test(String(value));
}

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

function designOverridesCss(design, catalog) {
  if (!design) return "";
  const lines = [];
  for (const [key, token, unit] of TOKENS) {
    if (isSet(design[key]) && isSafe(design[key])) lines.push(`${token}: ${design[key]}${unit};`);
  }
  for (const [key, token] of FONT_TOKENS) {
    const family = isSet(design[key]) && isSafe(design[key]) ? (catalog || {})[design[key]] : undefined;
    if (family) lines.push(`${token}: ${family.stack};`);
  }
  let headings = design.headings;
  if (typeof headings === "string") {
    try {
      headings = headings ? JSON.parse(headings) : null;
    } catch {
      headings = null;
    }
  }
  lines.push(...headingOverridesCss(headings));
  return lines.length ? `:root { ${lines.join(" ")} }` : "";
}

export { designOverridesCss, headingOverridesCss };
