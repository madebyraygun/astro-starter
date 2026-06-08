import test from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";

const REPO = path.join(path.dirname(new URL(import.meta.url).pathname), "..");

function freshCopy() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "astro-starter-"));
  fs.cpSync(REPO, dir, {
    recursive: true,
    filter: (src) => !/node_modules|\.git$|\.git\/|dist/.test(src),
  });
  return dir;
}

function scaffold(dir, args) {
  return spawnSync("node", [path.join(dir, "scaffold", "scaffold.js"), ...args], {
    encoding: "utf8",
  });
}

test("scaffolds blog: seeds pages and posts, writes site.json and design.json, removes scaffold/", () => {
  const dir = freshCopy();
  execFileSync("node", [path.join(dir, "scaffold", "scaffold.js"), "--template=blog", "--theme=carbon"]);
  assert.ok(fs.existsSync(path.join(dir, "src/content/pages/home.yaml")));
  assert.ok(fs.existsSync(path.join(dir, "src/content/pages/posts.yaml")));
  assert.ok(fs.existsSync(path.join(dir, "src/content/posts/welcome.mdoc")));
  const site = JSON.parse(fs.readFileSync(path.join(dir, "src/data/site.json"), "utf8"));
  const design = JSON.parse(fs.readFileSync(path.join(dir, "src/data/design.json"), "utf8"));
  assert.strictEqual(site.template, "blog");
  assert.strictEqual(design.theme, "carbon");
  assert.ok(!fs.existsSync(path.join(dir, "scaffold")));
});

test("rejects unknown template", () => {
  const dir = freshCopy();
  const r = scaffold(dir, ["--template=shop", "--theme=paper"]);
  assert.notStrictEqual(r.status, 0);
  assert.match(r.stderr, /unknown template/);
  assert.ok(fs.existsSync(path.join(dir, "scaffold")), "scaffold/ must survive a failed run");
});

test("rejects unknown theme", () => {
  const dir = freshCopy();
  const r = scaffold(dir, ["--template=blog", "--theme=neon"]);
  assert.notStrictEqual(r.status, 0);
  assert.match(r.stderr, /unknown theme/);
});

test("rejects missing arguments", () => {
  const dir = freshCopy();
  const r = scaffold(dir, ["--template=blog"]);
  assert.notStrictEqual(r.status, 0);
});

test("refuses to run against an already-scaffolded project", () => {
  const dir = freshCopy();
  fs.writeFileSync(path.join(dir, "src/content/pages/anything.yaml"), "title: Existing\n");
  const r = scaffold(dir, ["--template=blog", "--theme=paper"]);
  assert.notStrictEqual(r.status, 0);
  assert.match(r.stderr, /already scaffolded/);
});

test("applies --name to site.json", () => {
  const dir = freshCopy();
  execFileSync("node", [
    path.join(dir, "scaffold", "scaffold.js"),
    "--template=blog", "--theme=paper", "--name=Dalton's Blog & More",
  ]);
  const site = JSON.parse(fs.readFileSync(path.join(dir, "src/data/site.json"), "utf8"));
  assert.strictEqual(site.name, "Dalton's Blog & More");
});

test("keeps default name when --name omitted", () => {
  const dir = freshCopy();
  execFileSync("node", [path.join(dir, "scaffold", "scaffold.js"), "--template=blog", "--theme=paper"]);
  const site = JSON.parse(fs.readFileSync(path.join(dir, "src/data/site.json"), "utf8"));
  assert.strictEqual(site.name, "New Site");
});
