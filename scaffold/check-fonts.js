#!/usr/bin/env node
// Fails if a catalog entry's stack doesn't lead with its label (the @font-face
// family name) or has no weights.
import fs from "node:fs";
import path from "node:path";

const catalog = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "src/data/fontCatalog.json"), "utf8")
);

let failed = false;
for (const [slug, family] of Object.entries(catalog)) {
  if (!family.stack.startsWith(`"${family.label}"`)) {
    console.error(`${slug}: stack must start with "${family.label}"`);
    failed = true;
  }
  if (!Array.isArray(family.weights) || family.weights.length === 0) {
    console.error(`${slug}: weights must be a non-empty array`);
    failed = true;
  }
}
if (failed) process.exit(1);
console.log("font catalog is consistent");
