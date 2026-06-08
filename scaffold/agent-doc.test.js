import test from "node:test";
import assert from "node:assert";
import fs from "node:fs";

test("ships the Push Pop agent conventions doc", () => {
  const doc = fs.readFileSync(".pushpop/agent.md", "utf8");
  assert.ok(doc.length > 500, "agent.md should be substantive");
  for (const marker of ["src/components/blocks/", "keystatic.config.ts", "Blocks.astro", "themes"]) {
    assert.ok(doc.includes(marker), `agent.md must document ${marker}`);
  }
});
