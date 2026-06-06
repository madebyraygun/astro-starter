// Content lives outside Vite's module graph (the Keystatic reader does plain
// filesystem reads), so saves in the admin don't trigger HMR. Watch the content
// paths, invalidate the route cache, and push a full reload to the browser.
export default function contentReload() {
  return {
    name: "pushpop-content-reload",
    hooks: {
      "astro:server:setup": ({ server }) => {
        const shouldReload = (file) =>
          file.includes("/src/content/") ||
          file.endsWith("/src/data/settings.json") ||
          file.includes("/public/uploads/");
        server.watcher.add(["src/content", "src/data", "public/uploads"]);
        server.watcher.on("all", (_event, file) => {
          if (shouldReload(file)) {
            // Tell the prerender pipeline to clear its getStaticPaths cache so
            // the next request re-reads the YAML from disk.
            const ssrEnv = server.environments?.ssr;
            if (ssrEnv?.hot) {
              ssrEnv.hot.send("astro:content-changed", {});
            }
            // Full-reload the browser so it re-requests the now-stale page.
            server.ws.send({ type: "full-reload" });
          }
        });
      },
    },
  };
}
