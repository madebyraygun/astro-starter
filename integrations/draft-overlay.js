// Dev-only endpoint that holds unsaved Keystatic drafts (relayed by Push Pop
// from the patched admin's keystatic.draft messages) as files under
// .pushpop/drafts/, where the draft-aware reader picks them up. Saving writes
// the real files; Push Pop then clears the overlay.
import fs from "node:fs";
import path from "node:path";

const DRAFT_ROOT = ".pushpop/drafts";

export default function draftOverlay() {
  return {
    name: "draft-overlay",
    hooks: {
      "astro:server:setup": ({ server }) => {
        // Invalidate the route cache only — no websocket broadcast. A
        // full-reload would hit every connected page including the admin,
        // yanking the form mid-keystroke; the caller (Push Pop) reloads just
        // the preview after a successful POST.
        const reload = () => {
          const ssrEnv = server.environments?.ssr;
          if (ssrEnv?.hot) {
            ssrEnv.hot.send("astro:content-changed", {});
          }
        };

        server.middlewares.use("/__pushpop/draft", (req, res) => {
          if (req.method !== "POST") {
            res.statusCode = 405;
            return res.end();
          }
          let body = "";
          req.on("data", (chunk) => (body += chunk));
          req.on("end", () => {
            try {
              const { files = [], remove = [] } = JSON.parse(body);
              let changed = false;
              for (const file of files) {
                const target = safeDraftPath(file.path);
                if (!target) continue;
                fs.mkdirSync(path.dirname(target), { recursive: true });
                fs.writeFileSync(target, Buffer.from(file.contents, "base64"));
                changed = true;
              }
              for (const removed of remove) {
                const target = safeDraftPath(removed);
                if (target && fs.existsSync(target)) {
                  fs.rmSync(target);
                  changed = true;
                }
              }
              if (changed) reload();
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ ok: true }));
            } catch (err) {
              res.statusCode = 400;
              res.end(JSON.stringify({ ok: false, error: String(err) }));
            }
          });
        });
      },
    },
  };
}

// Drafts may only land inside the overlay's content mirror or be one of the
// settings singleton files (so design-token edits live-preview pre-save).
const SINGLETON_DRAFT_PATHS = new Set([
  "src/data/site.json",
  "src/data/design.json",
  "src/data/navigation.json",
]);
export function safeDraftPath(relative) {
  if (typeof relative !== "string") return null;
  const allowed = relative.startsWith("src/content/") || SINGLETON_DRAFT_PATHS.has(relative);
  if (!allowed) return null;
  const target = path.resolve(DRAFT_ROOT, relative);
  return target.startsWith(path.resolve(DRAFT_ROOT) + path.sep) ? target : null;
}
