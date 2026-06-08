import fs from "node:fs";
import { downloadMissingFonts } from "../lib/fonts.js";

// Downloads any missing catalog fonts before dev/build so published sites
// stay fully self-hosted (same warn-and-continue behavior as the Eleventy engine).
export default function fontDownload() {
  return {
    name: "pushpop-font-download",
    hooks: {
      "astro:config:setup": async () => {
        const settings = JSON.parse(fs.readFileSync("src/data/design.json", "utf8"));
        const catalog = JSON.parse(fs.readFileSync("src/data/fontCatalog.json", "utf8"));
        await downloadMissingFonts(settings.design || {}, catalog, "public/assets/fonts");
      },
    },
  };
}
