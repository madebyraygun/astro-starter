import test from "node:test";
import assert from "node:assert";
import { normalizeSettings, docsSidebarItems } from "../lib/site-helpers.js";

test("normalizeSettings fills defaults from null/empty", () => {
  const s = normalizeSettings(null);
  assert.strictEqual(s.name, "New Site");
  assert.strictEqual(s.theme, "paper");
  assert.strictEqual(s.logo, null);
  assert.strictEqual(s.logoAlign, "");
  assert.deepStrictEqual(s.headerNav, []);
  assert.deepStrictEqual(s.footerNav, []);
  assert.deepStrictEqual(s.socialLinks, []);
  assert.strictEqual(s.footerText, "");
  assert.strictEqual(s.signup.buttonLabel, "Sign up");
  assert.strictEqual(s.signup.placeholder, "Email address");
  assert.strictEqual(s.signup.actionUrl, "");
});

test("normalizeSettings passes through provided values and trims actionUrl", () => {
  const s = normalizeSettings({
    name: "Hi-Res",
    logo: "/src/assets/uploads/logo.png",
    logoAlign: "center",
    headerNav: [{ label: "Work", url: "/work" }],
    footerNav: [{ label: "IG", url: "https://ig" }],
    signup: { heading: "For updates", actionUrl: "  https://list  ", buttonLabel: "Join" },
    socialLinks: [{ label: "Instagram", url: "https://ig" }],
    footerText: "© Hi-Res",
  });
  assert.strictEqual(s.name, "Hi-Res");
  assert.strictEqual(s.logo, "/src/assets/uploads/logo.png");
  assert.strictEqual(s.logoAlign, "center");
  assert.deepStrictEqual(s.headerNav, [{ label: "Work", url: "/work" }]);
  assert.strictEqual(s.signup.actionUrl, "https://list");
  assert.strictEqual(s.signup.buttonLabel, "Join");
  assert.strictEqual(s.signup.placeholder, "Email address"); // default kept
  assert.strictEqual(s.footerText, "© Hi-Res");
});

test("docsSidebarItems lists navShow pages (by navOrder) then docs (by order)", () => {
  const pages = [
    { slug: "about", entry: { title: "About", navShow: true, navOrder: 20 } },
    { slug: "home", entry: { title: "Home", navShow: true, navOrder: 10 } },
    { slug: "secret", entry: { title: "Secret", navShow: false, navOrder: 5 } },
  ];
  const docs = [
    { slug: "install", entry: { title: "Install", order: 2 } },
    { slug: "intro", entry: { title: "Intro", order: 1 } },
  ];
  assert.deepStrictEqual(docsSidebarItems(pages, docs), [
    { url: "/", title: "Home" },
    { url: "/about/", title: "About" },
    { url: "/docs/intro/", title: "Intro" },
    { url: "/docs/install/", title: "Install" },
  ]);
});

test("docsSidebarItems tolerates empty inputs", () => {
  assert.deepStrictEqual(docsSidebarItems([], []), []);
  assert.deepStrictEqual(docsSidebarItems(undefined, undefined), []);
});

test("normalizeSettings works on an object merged from three singletons", () => {
  const site = { name: "Hi-Res", siteUrl: "https://x", rssEnabled: false, template: "portfolio" };
  const design = { theme: "dune", logo: "/l.png", logoAlign: "center", design: { colorBg: "#111" } };
  const navigation = { headerNav: [{ label: "Work", url: "/work" }], footerText: "© Hi-Res" };
  const s = normalizeSettings({ ...site, ...design, ...navigation });
  assert.strictEqual(s.name, "Hi-Res");
  assert.strictEqual(s.template, "portfolio");
  assert.strictEqual(s.theme, "dune");
  assert.strictEqual(s.logo, "/l.png");
  assert.deepStrictEqual(s.design, { colorBg: "#111" });
  assert.deepStrictEqual(s.headerNav, [{ label: "Work", url: "/work" }]);
  assert.strictEqual(s.footerText, "© Hi-Res");
});
