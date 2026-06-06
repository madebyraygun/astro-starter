import test from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { usedFamilies, neededFiles, fontFacesCss, downloadMissingFonts } from "../lib/fonts.js";

const CATALOG = {
  inter: { label: "Inter", stack: '"Inter", system-ui, sans-serif', weights: [400, 700] },
  lora: { label: "Lora", stack: '"Lora", Georgia, serif', weights: [400, 700] },
  "space-grotesk": { label: "Space Grotesk", stack: '"Space Grotesk", system-ui, sans-serif', weights: [400, 700] },
  fraunces: { label: "Fraunces", stack: '"Fraunces", Georgia, serif', weights: [400, 700] },
};

test("usedFamilies always includes the base three, adds overrides, dedupes", () => {
  assert.deepStrictEqual(usedFamilies({}), ["inter", "lora", "space-grotesk"]);
  assert.deepStrictEqual(
    usedFamilies({ fontDisplay: "fraunces", fontBody: "inter" }),
    ["inter", "lora", "space-grotesk", "fraunces"]
  );
});

test("neededFiles expands families by weight", () => {
  const files = neededFiles({ fontDisplay: "fraunces" }, CATALOG);
  assert.ok(files.includes("inter-latin-400-normal.woff2"));
  assert.ok(files.includes("fraunces-latin-700-normal.woff2"));
  assert.strictEqual(files.length, 8);
});

test("fontFacesCss emits a rule per family/weight with the label as family name", () => {
  const css = fontFacesCss({ fontDisplay: "fraunces" }, CATALOG);
  assert.match(css, /font-family: "Fraunces"; src: url\("\/assets\/fonts\/fraunces-latin-400-normal\.woff2"\)/);
  assert.match(css, /font-weight: 700/);
  assert.match(css, /font-display: swap/);
  assert.strictEqual((css.match(/@font-face/g) || []).length, 8);
});

test("downloadMissingFonts downloads only missing files", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "fonts-"));
  fs.writeFileSync(path.join(dir, "inter-latin-400-normal.woff2"), "x");
  const fetched = [];
  const fakeFetch = async (url) => {
    fetched.push(url);
    return { ok: true, arrayBuffer: async () => new TextEncoder().encode("woff2bytes").buffer };
  };
  await downloadMissingFonts({ fontDisplay: "fraunces" }, CATALOG, dir, fakeFetch, { log() {}, warn() {} });
  assert.strictEqual(fetched.length, 7); // 8 needed, 1 already present
  assert.ok(fetched.every((u) => u.startsWith("https://cdn.jsdelivr.net/fontsource/fonts/")));
  assert.ok(fs.existsSync(path.join(dir, "fraunces-latin-700-normal.woff2")));
});

test("downloadMissingFonts warns and continues on failure", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "fonts-"));
  const warnings = [];
  let calls = 0;
  const flakyFetch = async () => {
    calls += 1;
    if (calls === 1) throw new Error("offline");
    return { ok: true, arrayBuffer: async () => new TextEncoder().encode("y").buffer };
  };
  await downloadMissingFonts({}, CATALOG, dir, flakyFetch, { log() {}, warn: (m) => warnings.push(m) });
  assert.strictEqual(warnings.length, 1);
  assert.strictEqual(calls, 6); // all 6 base files attempted despite the first failing
});

test("downloadMissingFonts treats non-ok responses as failures", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "fonts-"));
  const warnings = [];
  const notFoundFetch = async () => ({ ok: false, status: 404 });
  await downloadMissingFonts({ fontDisplay: "fraunces" }, CATALOG, dir, notFoundFetch, { log() {}, warn: (m) => warnings.push(m) });
  assert.strictEqual(warnings.length, 8);
  assert.strictEqual(fs.readdirSync(dir).length, 0);
});
