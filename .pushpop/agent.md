# Extending this site

This is an [Astro](https://astro.build) site with content managed by [Keystatic](https://keystatic.com). It was scaffolded from the Push Pop starter and uses a block-based page builder: editors compose pages from a fixed set of reusable blocks, and each block type is defined in three coordinated places (a component, a registry, and a schema).

Read this whole file before making changes. Match the conventions described here exactly — they are what keep the site building and editable in Keystatic.

## Project shape

| Path | What lives there |
| --- | --- |
| `src/content/` | Editable content: `pages/`, plus a per-template collection (`posts/`, `projects/`, or `docs/`). |
| `src/data/` | Singleton data as JSON: `settings.json` (site config + design overrides), `fontCatalog.json` (font registry — don't edit by hand). |
| `src/components/` | Astro components. Page-level pieces (`Header`, `Footer`, `PostList`, `ProjectGrid`, `Picture`) and the block system (`Blocks.astro` + `blocks/`). |
| `src/components/blocks/` | One `.astro` file per block type (`Heading`, `Text`, `Image`, `Gallery`, `Faq`, `Cta`). |
| `src/layouts/` | Page shells. |
| `src/pages/` | Astro routes that read content via the reader and render it. |
| `src/lib/` | Helpers (markdown rendering, image pipeline). |
| `src/assets/uploads/` | Images uploaded through Keystatic, optimized at build time. |
| `public/assets/css/core.css` | Global layout and component styles (uses the theme tokens). |
| `public/assets/css/themes/` | One CSS file per theme (`paper`, `signal`, `carbon`, `dune`), each defining design tokens as CSS custom properties. |
| `keystatic.config.ts` | The editing schema: collections, singletons, and the `blocks` field. |

## Adding a block type (the core extension)

A page is a list of blocks. To add a new block type — say a `quote` block — you must touch **three** places. Use the existing **FAQ block** as the worked example to copy.

### 1. Create the component: `src/components/blocks/<Name>.astro`

It receives the block's schema fields as props. The FAQ block (`src/components/blocks/Faq.astro`):

```astro
---
import { renderMarkdown } from "../../lib/markdown";
const { items } = Astro.props;
---
<div class="block-faq">
  {(items ?? []).map((item) => (
    <details>
      <summary>{item.question}</summary>
      <div set:html={renderMarkdown(item.answer)} />
    </details>
  ))}
</div>
```

Add any styles to `public/assets/css/core.css` using the theme tokens (`var(--color-surface)`, `var(--space-unit)`, `var(--radius)`, etc.) so the block adapts to every theme. Look at the existing `.block-faq` / `.block-cta` rules as a pattern.

### 2. Register it in `src/components/Blocks.astro`

Import the component and add it to the `components` map, keyed by the block's **discriminant** (its key in the schema):

```astro
---
import Faq from "./blocks/Faq.astro";
// ...
const components: Record<string, any> = { heading: Heading, text: Text, image: Image, gallery: Gallery, faq: Faq, cta: Cta };
---
{(blocks ?? []).map((block: any) => {
  const Component = components[block.discriminant];
  return Component ? <Component {...block.value} /> : null;
})}
```

The discriminant string here **must** match the key you use in the schema below.

### 3. Add the schema entry in `keystatic.config.ts`

Add a `fields.object({...})` entry to the `blocks` field, keyed by the same discriminant. The FAQ entry:

```ts
const blocks = fields.blocks(
  {
    // ...other blocks
    faq: {
      label: "FAQ",
      schema: fields.object({
        items: fields.array(
          fields.object({
            question: fields.text({ label: "Question" }),
            answer: fields.text({ label: "Answer", multiline: true }),
          }),
          { label: "Items", itemLabel: (props) => props.fields.question.value }
        ),
      }),
    },
  },
  { label: "Blocks" }
);
```

The schema fields become the props your component receives. For image fields inside a block, spread the shared `uploads` config: `fields.image({ label: "Image", ...uploads })`.

The three keys (component map key, schema key, and the block's discriminant in saved content) are the **same string**. Keep them in sync or the block silently renders nothing.

## Editing content

- **Pages** live in `src/content/pages/*` as YAML, each with a `blocks` list. Add, remove, or reorder entries in that list to change a page. Each entry is `discriminant` + `value`.
- **Per-template collections** depend on the site's template:
  - `blog` → `posts/` (`title`, `date`, Markdoc `content`)
  - `portfolio` → `projects/` (`title`, `order`, `cover`, `gallery`, Markdoc `content`)
  - `docs` → `docs/` (`title`, `order`, Markdoc `content`)
- To add an entry, create a file under the collection directory matching the schema in `keystatic.config.ts`. Prefer doing this through Keystatic; if writing files directly, match the exact frontmatter/field shape of an existing entry.

## Images

- Content images are uploaded through Keystatic and stored under `src/assets/uploads/` (configured via the shared `uploads` object in `keystatic.config.ts`). Storing them in `src/assets` lets Astro optimize them.
- Render content images with the **`Picture` component** (`src/components/Picture.astro`), which emits responsive `<picture>` markup with AVIF/WebP sources and a fallback `<img>`:

  ```astro
  <Picture src={entry.cover} alt={entry.title} />
  ```

- **Never** use a plain `<img>` for content images. Plain `<img>` is only acceptable for tiny static UI chrome, not editor-supplied media.

## Theme and design

- Design tokens are CSS custom properties defined per theme in `public/assets/css/themes/<theme>.css` (`--color-bg`, `--color-surface`, `--color-text`, `--color-accent`, `--font-display`, `--font-body`, `--radius`, `--space-unit`, `--content-width`).
- For per-site color/font/spacing tweaks, **edit the `design` object in the settings singleton** (`src/data/settings.json`, schema in `keystatic.config.ts`) — these override the active theme's tokens. Do this through Keystatic's "Customize Design" panel where possible.
- **Don't hand-edit the theme files** in `public/assets/css/themes/` for one site's tweaks; those are shared theme definitions. Use the settings `design` overrides instead.

## Conventions

- Match the existing code style (formatting, naming, the `Astro.props` destructuring pattern in components).
- No history or justification comments. Don't annotate why a line changed or that it was recently added — that belongs in the commit message. Describe what the code does, not its edit history.
- Keep the static build working. After changes, verify:

  ```bash
  SKIP_KEYSTATIC=1 npm run build
  ```

  And run the test suite:

  ```bash
  npm test
  ```

## Boundaries

- Never edit `deploy.sh` or `deploy.env`.
- Never run `git`, never publish or deploy.
- Never touch files outside this project directory.
