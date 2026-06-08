// Pure helpers for reading a theme's CSS custom properties (framework-free so
// node --test can cover them; mirrors lib/design-overrides.js).

export function parseThemeCss(cssText) {
  const tokens = {};
  if (typeof cssText !== "string") return tokens;
  const body = cssText.replace(/\/\*[\s\S]*?\*\//g, "");
  const re = /(--[\w-]+)\s*:\s*([^;]+);/gi;
  let m;
  while ((m = re.exec(body))) tokens[m[1]] = m[2].trim().replace(/\s*!important\s*$/i, "");
  return tokens;
}

// First family name from a CSS font stack: '"Lora", Georgia, serif' -> "Lora".
export function firstFamily(stack) {
  if (!stack) return "";
  return stack.split(",")[0].trim().replace(/^["']|["']$/g, "");
}
