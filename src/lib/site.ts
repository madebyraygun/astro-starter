import { createReader } from "@keystatic/core/reader";
import keystaticConfig from "../../keystatic.config";

const realReader = createReader(process.cwd(), keystaticConfig);

/// In dev, unsaved Keystatic drafts relayed by Push Pop live under
/// .pushpop/drafts as a sparse mirror of src/content; entries found there win
/// over the saved files so the preview can show pre-save state.
function draftAwareReader(): typeof realReader {
  const draftReader = createReader(process.cwd() + "/.pushpop/drafts", keystaticConfig);

  const collections = Object.fromEntries(
    Object.entries(realReader.collections).map(([name, real]) => [
      name,
      {
        ...real,
        read: async (slug: string, opts?: any) =>
          (await tryDraft(() => (draftReader.collections as any)[name].read(slug, opts))) ??
          (real as any).read(slug, opts),
        all: async (opts?: any) => {
          const entries = await (real as any).all(opts);
          return Promise.all(
            entries.map(async (item: any) => {
              const draft = await tryDraft(() =>
                (draftReader.collections as any)[name].read(item.slug, opts)
              );
              return draft ? { ...item, entry: draft } : item;
            })
          );
        },
      },
    ])
  );

  const singletons = Object.fromEntries(
    Object.entries(realReader.singletons).map(([name, real]) => [
      name,
      {
        ...real,
        read: async (opts?: any) =>
          (await tryDraft(() => (draftReader.singletons as any)[name].read(opts))) ??
          (real as any).read(opts),
      },
    ])
  );

  return { ...realReader, collections, singletons } as typeof realReader;
}

async function tryDraft<T>(read: () => Promise<T | null>): Promise<T | null> {
  try {
    return await read();
  } catch {
    return null;
  }
}

export const reader = import.meta.env.DEV ? draftAwareReader() : realReader;

export async function getSettings() {
  const s = await reader.singletons.settings.read();
  return {
    name: s?.name || "New Site",
    template: s?.template || "blog",
    theme: s?.theme || "paper",
    extraLinks: s?.extraLinks ?? [],
    footerText: s?.footerText || "",
    siteUrl: s?.siteUrl?.trim() || "",
    rssEnabled: s?.rssEnabled ?? true,
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
