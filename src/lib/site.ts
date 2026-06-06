import { createReader } from "@keystatic/core/reader";
import keystaticConfig from "../../keystatic.config";

export const reader = createReader(process.cwd(), keystaticConfig);

export async function getSettings() {
  const s = await reader.singletons.settings.read();
  return {
    name: s?.name || "New Site",
    template: s?.template || "blog",
    theme: s?.theme || "paper",
    extraLinks: s?.extraLinks ?? [],
    footerText: s?.footerText || "",
    design: (s?.design ?? {}) as Record<string, unknown>,
  };
}

export async function getNavPages() {
  const pages = await reader.collections.pages.all();
  return pages
    .filter((p) => p.entry.navShow !== false)
    .sort((a, b) => (a.entry.navOrder ?? 99) - (b.entry.navOrder ?? 99))
    .map((p) => ({
      slug: p.slug,
      title: p.entry.title,
      url: p.slug === "home" ? "/" : `/${p.slug}/`,
    }));
}
