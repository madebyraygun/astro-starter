#!/usr/bin/env node
// Activates one template layer and one theme, then removes itself.
// Zero dependencies: runs before `npm install` on a fresh clone.
//   node scaffold/scaffold.js --template=blog --theme=paper [--name='My Site']
import fs from "node:fs";
import path from "node:path";

const __dirname = path.dirname(new URL(import.meta.url).pathname);

const TEMPLATES = ["blog", "portfolio", "docs"];
const THEMES = ["paper", "signal", "carbon", "dune"];

function fail(message) {
  console.error(`scaffold: ${message}`);
  process.exit(1);
}

const args = {};
for (const arg of process.argv.slice(2)) {
  const m = arg.match(/^--([^=]+)=(.+)$/);
  if (!m) fail(`unrecognized argument: ${arg}`);
  args[m[1]] = m[2];
}

const { template, theme } = args;
if (!template) fail("missing --template");
if (!theme) fail("missing --theme");
if (!TEMPLATES.includes(template)) fail(`unknown template: ${template}`);
if (!THEMES.includes(theme)) fail(`unknown theme: ${theme}`);

const root = path.join(__dirname, "..");
const layer = path.join(__dirname, template);
if (!fs.existsSync(path.join(layer, "src"))) fail(`missing template layer: ${layer}/src`);

// Read everything up front so validation failures leave the tree untouched.
const settingsPath = path.join(root, "src", "data", "settings.json");
let settings;
try {
  settings = JSON.parse(fs.readFileSync(settingsPath, "utf8"));
} catch (e) {
  fail(`could not read site files: ${e.message}`);
}

// Guard: refuse to run against an already-scaffolded project.
const pagesDir = path.join(root, "src", "content", "pages");
if (
  fs.existsSync(pagesDir) &&
  fs.readdirSync(pagesDir).some((f) => f.endsWith(".yaml"))
) {
  fail("already scaffolded: site content already present");
}

try {
  // 1. Overlay the template's seed content onto src/.
  fs.cpSync(path.join(layer, "src"), path.join(root, "src"), { recursive: true });
  // 2. Record template and theme in site settings.
  settings.template = template;
  settings.theme = theme;
  if (args.name) settings.name = args.name;
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + "\n");
  // 3. Remove the scaffold machinery from the new site.
  fs.rmSync(__dirname, { recursive: true, force: true });
} catch (e) {
  fail(`scaffolding failed mid-run (${e.message}); re-clone before retrying`);
}

console.log(`scaffolded template=${template} theme=${theme}`);
