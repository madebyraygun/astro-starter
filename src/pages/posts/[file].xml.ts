// Per-collection RSS feed for the Posts collection.
//
// This is a *dynamic* route on purpose. A plain `rss.xml.ts` endpoint would
// always emit a file at build time; here `getStaticPaths` returns the single
// `rss` path only when the feed is enabled in Site Settings (and a Site URL is
// present), and an empty array otherwise. An empty array means the build emits
// nothing, so disabling the toggle removes the feed from the published site.
import rss from "@astrojs/rss";
import type { APIContext } from "astro";

export const prerender = true;

export async function getStaticPaths() {
  const { getSettings } = await import("../../lib/site");
  // @ts-ignore - plain JS helper shared with tests
  const { rssFeedPaths } = await import("../../../lib/rss.js");
  const site = await getSettings();
  return rssFeedPaths(site);
}

export async function GET(_context: APIContext) {
  const Markdoc = (await import("@markdoc/markdoc")).default;
  const { reader, getSettings } = await import("../../lib/site");
  // @ts-ignore - plain JS helper shared with tests
  const { htmlToText, excerpt } = await import("../../../lib/rss.js");
  const site = await getSettings();

  const posts = (await (reader.collections as any).posts?.all()) ?? [];

  const items = await Promise.all(
    posts
      .filter((p: any) => p.entry.date)
      .sort((a: any, b: any) =>
        String(b.entry.date ?? "").localeCompare(String(a.entry.date ?? "")),
      )
      .map(async (p: any) => {
        const { node } = await p.entry.content();
        const html = Markdoc.renderers.html(Markdoc.transform(node));
        const description = excerpt(htmlToText(html)) || p.entry.title;
        return {
          title: p.entry.title,
          link: `/posts/${p.slug}/`,
          pubDate: p.entry.date ? new Date(p.entry.date) : undefined,
          description,
          content: html || undefined,
        };
      }),
  );

  return rss({
    title: site.name,
    description: site.footerText || `${site.name} — Posts`,
    // Absolute base for item links, from the Site URL setting. The route is not
    // generated unless this is present (see getStaticPaths / rssFeedPaths).
    site: site.siteUrl,
    items,
    customData: `<language>en-us</language>`,
  });
}
