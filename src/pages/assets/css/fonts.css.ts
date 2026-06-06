import type { APIRoute } from "astro";
import fs from "node:fs";
// @ts-ignore
import { fontFacesCss } from "../../../../lib/fonts.js";

export const GET: APIRoute = () => {
  const settings = JSON.parse(fs.readFileSync("src/data/settings.json", "utf8"));
  const catalog = JSON.parse(fs.readFileSync("src/data/fontCatalog.json", "utf8"));
  return new Response(fontFacesCss(settings.design || {}, catalog), {
    headers: { "Content-Type": "text/css" },
  });
};
