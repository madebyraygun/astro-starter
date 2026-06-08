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
  return lines.length ? `:root { ${lines.join(" ")} }` : "";
}

export { designOverridesCss };
