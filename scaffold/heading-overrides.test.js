import test from "node:test";
import assert from "node:assert";
import { headingOverridesCss, designOverridesCss } from "../lib/design-overrides.js";

test("headingOverridesCss emits variant + level vars with units", () => {
  const lines = headingOverridesCss({
    display: { scale: "1.5", tracking: "0.1", transform: "uppercase" },
    h2: { scale: "1.2", tracking: "", transform: "" },
  });
  assert.ok(lines.includes("--h-display-scale: 1.5;"), lines.join(" "));
  assert.ok(lines.includes("--h-display-tracking: 0.1em;"));
  assert.ok(lines.includes("--h-display-transform: uppercase;"));
  assert.ok(lines.includes("--h2-scale: 1.2;"));
  assert.ok(!lines.some((l) => l.startsWith("--h2-tracking")));
});

test("headingOverridesCss handles empty / invalid / empty groups", () => {
  assert.deepStrictEqual(headingOverridesCss(null), []);
  assert.deepStrictEqual(headingOverridesCss({}), []);
  assert.deepStrictEqual(headingOverridesCss({ display: {} }), []);
});

test("headingOverridesCss skips unsafe values", () => {
  assert.deepStrictEqual(headingOverridesCss({ h1: { scale: "1}</style>" } }), []);
});

test("designOverridesCss merges heading overrides from a JSON string", () => {
  const css = designOverridesCss({ headings: JSON.stringify({ display: { scale: "2" } }) }, {});
  assert.match(css, /^:root \{ /);
  assert.match(css, /--h-display-scale: 2;/);
});

test("designOverridesCss tolerates malformed/empty headings", () => {
  assert.strictEqual(designOverridesCss({ headings: "{bad" }, {}), "");
  assert.strictEqual(designOverridesCss({ headings: "" }, {}), "");
});
