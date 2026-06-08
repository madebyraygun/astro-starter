import test from "node:test";
import assert from "node:assert";
import { designOverridesCss } from "../lib/design-overrides.js";

const CATALOG = {
  inter: { label: "Inter", stack: '"Inter", system-ui, sans-serif', weights: [400, 700] },
};

test("empty or missing design yields empty string", () => {
  assert.strictEqual(designOverridesCss({}, CATALOG), "");
  assert.strictEqual(designOverridesCss(null, CATALOG), "");
  assert.strictEqual(designOverridesCss(undefined, CATALOG), "");
});

test("set colors become :root declarations", () => {
  const css = designOverridesCss({ colorBg: "#111111", colorAccent: "#ff0000" }, CATALOG);
  assert.match(css, /^:root \{ /);
  assert.match(css, /--color-bg: #111111;/);
  assert.match(css, /--color-accent: #ff0000;/);
});

test("numbers get units, including zero", () => {
  const css = designOverridesCss({ radius: 0, spaceUnit: 1.25, contentWidth: 60 }, CATALOG);
  assert.match(css, /--radius: 0px;/);
  assert.match(css, /--space-unit: 1.25rem;/);
  assert.match(css, /--content-width: 60rem;/);
});

test("heading typography tokens emit with correct units", () => {
  const css = designOverridesCss(
    { headingScale: 1.5, headingTracking: 0.12, headingTransform: "uppercase" },
    CATALOG
  );
  assert.match(css, /--heading-scale: 1.5;/);
  assert.match(css, /--heading-tracking: 0.12em;/);
  assert.match(css, /--heading-transform: uppercase;/);
});

test("zero heading tracking still emits", () => {
  const css = designOverridesCss({ headingTracking: 0 }, CATALOG);
  assert.match(css, /--heading-tracking: 0em;/);
});

test("empty heading transform is skipped", () => {
  assert.strictEqual(designOverridesCss({ headingTransform: "" }, CATALOG), "");
});

test("fonts resolve to catalog stacks", () => {
  const css = designOverridesCss({ fontDisplay: "inter" }, CATALOG);
  assert.match(css, /--font-display: "Inter", system-ui, sans-serif;/);
});

test("unknown font slugs and empty strings are skipped", () => {
  assert.strictEqual(designOverridesCss({ fontDisplay: "nope", colorBg: "" }, CATALOG), "");
});

test("values that could break out of the style block are skipped", () => {
  const css = designOverridesCss(
    { colorBg: "red} </style><script>x</script>", colorAccent: "#00ff00", radius: "12; }" },
    {}
  );
  assert.strictEqual(css, ":root { --color-accent: #00ff00; }");
});
