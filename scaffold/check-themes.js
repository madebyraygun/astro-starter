#!/usr/bin/env node
// Fails if any theme file is missing any required design token.
import fs from "node:fs";
import path from "node:path";

const REQUIRED = [
  "--color-bg", "--color-surface", "--color-text", "--color-muted",
  "--color-accent", "--color-accent-contrast",
  "--font-display", "--font-body",
  "--radius", "--space-unit", "--content-width",
];

const dir = path.join(process.cwd(), "public/assets/css/themes");
let failed = false;
const files = fs.readdirSync(dir).filter((f) => f.endsWith(".css"));
if (files.length === 0) {
  console.error(`no theme files found in ${dir}`);
  process.exit(1);
}
for (const file of files) {
  const css = fs.readFileSync(path.join(dir, file), "utf8");
  for (const token of REQUIRED) {
    if (!css.includes(`${token}:`)) {
      console.error(`${file}: missing ${token}`);
      failed = true;
    }
  }
}
if (failed) process.exit(1);
console.log("all themes define the full token set");
