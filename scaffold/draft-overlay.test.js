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

test("the singleton files are allowed (live preview)", () => {
  for (const p of ["src/data/site.json", "src/data/design.json", "src/data/navigation.json"]) {
    const r = safeDraftPath(p);
    assert.ok(r && r.endsWith(p.replace(/\//g, path.sep)), p);
  }
});

test("other paths are rejected", () => {
  assert.strictEqual(safeDraftPath("src/data/settings.json"), null);
  assert.strictEqual(safeDraftPath("src/data/other.json"), null);
  assert.strictEqual(safeDraftPath("package.json"), null);
  assert.strictEqual(safeDraftPath(123), null);
});

test("path traversal that escapes the overlay root is rejected", () => {
  assert.strictEqual(safeDraftPath("src/content/../../../../etc/passwd"), null);
});
