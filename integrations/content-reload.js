import { fileURLToPath } from "node:url";

// Content lives outside Vite's module graph (the Keystatic reader does plain
// filesystem reads), so saves in the admin don't trigger HMR. Watch the content
// paths, invalidate the route cache, and push a full reload to the browser.
export default function contentReload() {
  // The asset glob in images.ts is evaluated once and cached, so a freshly
  // uploaded image isn't in the map until this module is re-evaluated.
  const imagesModulePath = fileURLToPath(new URL("../src/lib/images.ts", import.meta.url));
  // Mirror the glob extensions in src/lib/images.ts.
  const isGlobbedImage = (file) =>
    file.includes("/src/assets/uploads/") && /\.(jpe?g|png|gif|webp)$/i.test(file);

  return {
    name: "pushpop-content-reload",
    hooks: {
      "astro:server:setup": ({ server }) => {
        const shouldReload = (file) =>
          file.includes("/src/content/") ||
          (file.includes("/src/data/") && file.endsWith(".json")) ||
          file.includes("/src/assets/uploads/") ||
          file.includes("/public/uploads/");

        // Re-run import.meta.glob in images.ts by invalidating it and every
        // module that imports it, so a new/removed upload is reflected on the
        // reload below instead of staying stale until a manual restart. Walks
        // the importer chain because Vite's invalidation does not cascade.
        const reindexAssets = () => {
          const graph = server.environments?.ssr?.moduleGraph ?? server.moduleGraph;
          if (!graph) return;
          const seen = new Set();
          const queue = [...(graph.getModulesByFile(imagesModulePath) ?? [])];
          while (queue.length) {
            const mod = queue.shift();
            if (!mod || seen.has(mod)) continue;
            seen.add(mod);
            graph.invalidateModule(mod);
            queue.push(...mod.importers);
          }
        };

        server.watcher.add(["src/content", "src/data", "src/assets/uploads", "public/uploads"]);
        server.watcher.on("all", (event, file) => {
          if (!shouldReload(file)) return;
          if ((event === "add" || event === "unlink") && isGlobbedImage(file)) {
            reindexAssets();
          }
          // Tell the prerender pipeline to clear its getStaticPaths cache so
          // the next request re-reads the YAML from disk.
          const ssrEnv = server.environments?.ssr;
          if (ssrEnv?.hot) {
            ssrEnv.hot.send("astro:content-changed", {});
          }
          // Full-reload the browser so it re-requests the now-stale page.
          server.ws.send({ type: "full-reload" });
        });
      },
    },
  };
}
