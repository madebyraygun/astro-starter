import test from "node:test";
import assert from "node:assert";
import { rssFeedPaths, htmlToText, excerpt } from "../lib/rss.js";

test("rssFeedPaths: emits the rss path only when enabled and a Site URL is set", () => {
  assert.deepStrictEqual(
    rssFeedPaths({ rssEnabled: true, siteUrl: "https://example.com" }),
    [{ params: { file: "rss" } }],
  );
});

test("rssFeedPaths: empty when disabled", () => {
  assert.deepStrictEqual(rssFeedPaths({ rssEnabled: false, siteUrl: "https://example.com" }), []);
});

test("rssFeedPaths: empty when Site URL is missing", () => {
  assert.deepStrictEqual(rssFeedPaths({ rssEnabled: true, siteUrl: "" }), []);
  assert.deepStrictEqual(rssFeedPaths({ rssEnabled: true }), []);
});

test("rssFeedPaths: empty for empty/undefined settings", () => {
  assert.deepStrictEqual(rssFeedPaths({}), []);
  assert.deepStrictEqual(rssFeedPaths(undefined), []);
});

test("htmlToText: strips tags and decodes common entities", () => {
  assert.strictEqual(
    htmlToText("<p>Hello <strong>world</strong> &amp; friends</p>"),
    "Hello world & friends",
  );
  assert.strictEqual(htmlToText(""), "");
  assert.strictEqual(htmlToText(null), "");
});

test("excerpt: returns short text unchanged", () => {
  assert.strictEqual(excerpt("short", 280), "short");
});

test("excerpt: truncates long text at a word boundary with an ellipsis", () => {
  const long = "word ".repeat(100).trim();
  const out = excerpt(long, 20);
  assert.ok(out.length <= 21);
  assert.ok(out.endsWith("…"));
  assert.ok(!out.slice(0, -1).endsWith(" "));
});
