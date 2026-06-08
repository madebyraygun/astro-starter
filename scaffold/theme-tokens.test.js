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
