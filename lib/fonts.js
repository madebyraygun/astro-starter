// Font plumbing for design overrides: which families a site uses, the @font-face
// rules for them, and on-demand download of missing woff2 files from Fontsource.
import fs from "node:fs";
import path from "node:path";

// Every theme's token files reference these, so they must always be present.
const BASE_FAMILIES = ["inter", "lora", "space-grotesk"];

function isSet(value) {
  return value !== undefined && value !== null && value !== "";
}

function usedFamilies(design) {
  const used = [...BASE_FAMILIES];
  for (const key of ["fontDisplay", "fontBody"]) {
    const slug = design ? design[key] : undefined;
    if (isSet(slug) && !used.includes(slug)) used.push(slug);
  }
  return used;
}

function neededFiles(design, catalog) {
  const files = [];
  for (const slug of usedFamilies(design)) {
    const family = catalog[slug];
    if (!family) continue;
    for (const weight of family.weights) {
      files.push(`${slug}-latin-${weight}-normal.woff2`);
    }
  }
  return files;
}

function fontFacesCss(design, catalog) {
  const rules = [];
  for (const slug of usedFamilies(design)) {
    const family = catalog[slug];
    if (!family) continue;
    for (const weight of family.weights) {
      rules.push(
        `@font-face { font-family: "${family.label}"; ` +
          `src: url("/assets/fonts/${slug}-latin-${weight}-normal.woff2") format("woff2"); ` +
          `font-weight: ${weight}; font-style: normal; font-display: swap; }`
      );
    }
  }
  return rules.join("\n") + "\n";
}

async function downloadMissingFonts(design, catalog, fontsDir, fetchImpl = fetch, log = console) {
  for (const file of neededFiles(design, catalog)) {
    const dest = path.join(fontsDir, file);
    if (fs.existsSync(dest)) continue;
    const match = file.match(/^(.+)-latin-(\d+)-normal\.woff2$/);
    if (!match) {
      log.warn(`fonts: unrecognized font file name ${file}; skipping`);
      continue;
    }
    const url = `https://cdn.jsdelivr.net/fontsource/fonts/${match[1]}@latest/latin-${match[2]}-normal.woff2`;
    try {
      const response = await fetchImpl(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      fs.writeFileSync(dest, Buffer.from(await response.arrayBuffer()));
      log.log(`fonts: downloaded ${file}`);
    } catch (error) {
      log.warn(`fonts: could not download ${file} (${error.message}); fallback stack applies until a connected build`);
    }
  }
}

export { BASE_FAMILIES, usedFamilies, neededFiles, fontFacesCss, downloadMissingFonts };
