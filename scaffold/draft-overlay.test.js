import test from "node:test";
import assert from "node:assert";
import path from "node:path";
import { safeDraftPath } from "../integrations/draft-overlay.js";

const root = path.resolve(".pushpop/drafts");

test("content drafts are allowed", () => {
  const p = safeDraftPath("src/content/pages/home.yaml");
  assert.ok(p && p.startsWith(root + path.sep));
  assert.ok(p.endsWith(path.join("src", "content", "pages", "home.yaml")));
});

test("the settings singleton is allowed (live design-token preview)", () => {
  const p = safeDraftPath("src/data/settings.json");
  assert.ok(p && p.endsWith(path.join("src", "data", "settings.json")));
});

test("other paths are rejected", () => {
  assert.strictEqual(safeDraftPath("src/data/other.json"), null);
  assert.strictEqual(safeDraftPath("package.json"), null);
  assert.strictEqual(safeDraftPath(123), null);
});

test("path traversal that escapes the overlay root is rejected", () => {
  assert.strictEqual(safeDraftPath("src/content/../../../../etc/passwd"), null);
});
