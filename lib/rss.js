// Pure helpers for the Posts RSS feed, shared by the Astro endpoint and tests.

// Decides whether the feed should be generated. Returned to getStaticPaths:
// a single `rss` path when enabled, an empty array otherwise (so the file is
// not emitted by a static build at all).
export function rssFeedPaths(settings) {
  const enabled = Boolean(settings?.rssEnabled) && Boolean(settings?.siteUrl);
  return enabled ? [{ params: { file: "rss" } }] : [];
}

export function htmlToText(html) {
  if (!html) return "";
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

export function excerpt(text, max = 280) {
  if (!text) return "";
  if (text.length <= max) return text;
  return text.slice(0, max).replace(/\s+\S*$/, "") + "…";
}
