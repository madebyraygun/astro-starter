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
