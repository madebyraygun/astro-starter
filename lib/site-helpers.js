// Pure helpers shared by src/lib/site.ts (kept framework-free so node --test
// can exercise them, mirroring lib/design-overrides.js).

export function normalizeSettings(s) {
  return {
    name: s?.name || "New Site",
    template: s?.template || "blog",
    theme: s?.theme || "paper",
    siteUrl: s?.siteUrl?.trim() || "",
    rssEnabled: s?.rssEnabled ?? true,
    logo: s?.logo || null,
    logoAlign: s?.logoAlign || "",
    headerNav: s?.headerNav ?? [],
    footerNav: s?.footerNav ?? [],
    signup: {
      heading: s?.signup?.heading || "",
      actionUrl: s?.signup?.actionUrl?.trim() || "",
      buttonLabel: s?.signup?.buttonLabel || "Sign up",
      placeholder: s?.signup?.placeholder || "Email address",
    },
    socialLinks: s?.socialLinks ?? [],
    footerText: s?.footerText || "",
    design: s?.design ?? {},
  };
}

const pageUrl = (slug) => (slug === "home" ? "/" : `/${slug}/`);

export function docsSidebarItems(pages, docs) {
  const pageItems = (pages ?? [])
    .filter((p) => p.entry.navShow !== false)
    .sort((a, b) => (a.entry.navOrder ?? 99) - (b.entry.navOrder ?? 99))
    .map((p) => ({ url: pageUrl(p.slug), title: p.entry.title }));
  const docItems = (docs ?? [])
    .slice()
    .sort((a, b) => (a.entry.order ?? 99) - (b.entry.order ?? 99))
    .map((d) => ({ url: `/docs/${d.slug}/`, title: d.entry.title }));
  return [...pageItems, ...docItems];
}
