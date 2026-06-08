import { config, fields, collection, singleton, type Collection } from "@keystatic/core";
import type { ComponentSchema } from "@keystatic/core";
import catalog from "./src/data/fontCatalog.json";
import settings from "./src/data/settings.json";

const template: string = settings.template ?? "blog";
const brandName: string = settings.name?.trim() || "Push Pop";

const fontOptions = Object.entries(catalog).map(([value, family]: [string, any]) => ({
  label: (family as { label: string }).label,
  value,
}));

const optionalColor = (label: string) =>
  fields.text({
    label,
    description: "Hex color, e.g. #336699. Leave empty for the theme default.",
  });

const alignField = () =>
  fields.select({
    label: "Alignment",
    options: [
      { label: "Left", value: "" },
      { label: "Center", value: "center" },
      { label: "Right", value: "right" },
    ],
    defaultValue: "",
  });

const backgroundField = () =>
  fields.select({
    label: "Background",
    options: [
      { label: "None", value: "" },
      { label: "Surface", value: "surface" },
      { label: "Accent", value: "accent" },
    ],
    defaultValue: "",
  });

// src/assets (not public/) so astro:assets can optimize what Keystatic stores.
const uploads = { directory: "src/assets/uploads", publicPath: "/src/assets/uploads/" };

const blocks = fields.blocks(
  {
    heading: {
      label: "Heading",
      schema: fields.object({
        text: fields.text({ label: "Text" }),
        level: fields.select({
          label: "Level",
          options: [
            { label: "2", value: "2" },
            { label: "3", value: "3" },
          ],
          defaultValue: "2",
        }),
        style: fields.select({
          label: "Style",
          options: [
            { label: "Heading", value: "" },
            { label: "Display (large)", value: "display" },
            { label: "Eyebrow (small caps)", value: "eyebrow" },
          ],
          defaultValue: "",
        }),
        align: alignField(),
        background: backgroundField(),
      }),
    },
    text: {
      label: "Text",
      schema: fields.object({
        body: fields.text({ label: "Body", multiline: true }),
        align: alignField(),
        background: backgroundField(),
      }),
    },
    image: {
      label: "Image",
      schema: fields.object({
        image: fields.image({ label: "Image", ...uploads }),
        alt: fields.text({ label: "Alt text" }),
        caption: fields.text({ label: "Caption" }),
      }),
    },
    gallery: {
      label: "Image Gallery",
      schema: fields.object({
        columns: fields.select({
          label: "Columns",
          options: [
            { label: "2", value: "2" },
            { label: "3", value: "3" },
            { label: "4", value: "4" },
          ],
          defaultValue: "3",
        }),
        images: fields.array(
          fields.object({
            image: fields.image({ label: "Image", ...uploads }),
            alt: fields.text({ label: "Alt text" }),
          }),
          { label: "Images", itemLabel: (props) => props.fields.alt.value || "Image" }
        ),
      }),
    },
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
    cta: {
      label: "Call to Action",
      schema: fields.object({
        heading: fields.text({ label: "Heading" }),
        text: fields.text({ label: "Text" }),
        label: fields.text({ label: "Button label" }),
        url: fields.text({ label: "Button URL" }),
        background: backgroundField(),
      }),
    },
    hero: {
      label: "Hero",
      schema: fields.object({
        eyebrow: fields.text({ label: "Eyebrow (optional)" }),
        headline: fields.text({ label: "Headline" }),
        image: fields.image({ label: "Image", ...uploads }),
        alt: fields.text({ label: "Alt text" }),
        caption: fields.text({ label: "Image caption (optional)" }),
        imagePosition: fields.select({
          label: "Image position",
          options: [
            { label: "Right", value: "" },
            { label: "Left", value: "left" },
          ],
          defaultValue: "",
        }),
        ratio: fields.select({
          label: "Split ratio (text : image)",
          options: [
            { label: "50 / 50", value: "" },
            { label: "40 / 60", value: "40-60" },
            { label: "60 / 40", value: "60-40" },
          ],
          defaultValue: "",
        }),
        background: backgroundField(),
      }),
    },
    columns: {
      label: "Two Columns (image + text)",
      schema: fields.object({
        image: fields.image({ label: "Image", ...uploads }),
        alt: fields.text({ label: "Alt text" }),
        body: fields.text({ label: "Text", multiline: true }),
        imagePosition: fields.select({
          label: "Image position",
          options: [
            { label: "Right", value: "" },
            { label: "Left", value: "left" },
          ],
          defaultValue: "",
        }),
        ratio: fields.select({
          label: "Ratio (image : text)",
          options: [
            { label: "50 / 50", value: "" },
            { label: "40 / 60", value: "40-60" },
            { label: "60 / 40", value: "60-40" },
          ],
          defaultValue: "",
        }),
        verticalAlign: fields.select({
          label: "Vertical alignment",
          options: [
            { label: "Center", value: "" },
            { label: "Top", value: "top" },
            { label: "Bottom", value: "bottom" },
          ],
          defaultValue: "",
        }),
      }),
    },
    credits: {
      label: "Credits / Metadata",
      schema: fields.object({
        rows: fields.array(
          fields.object({
            label: fields.text({ label: "Label" }),
            items: fields.array(fields.text({ label: "Item" }), {
              label: "Items",
              itemLabel: (props) => props.value || "Item",
            }),
          }),
          { label: "Rows", itemLabel: (props) => props.fields.label.value || "Row" }
        ),
      }),
    },
  },
  { label: "Blocks" }
);

const pages = collection({
  label: "Pages",
  slugField: "title",
  path: "src/content/pages/*",
  format: { data: "yaml" },
  schema: {
    title: fields.slug({ name: { label: "Title" } }),
    navShow: fields.checkbox({ label: "Show in navigation", defaultValue: true }),
    navOrder: fields.integer({ label: "Nav order", defaultValue: 10 }),
    blocks,
  },
});

const posts = collection({
  label: "Posts",
  slugField: "title",
  path: "src/content/posts/*",
  format: { contentField: "content" },
  schema: {
    title: fields.slug({ name: { label: "Title" } }),
    date: fields.date({ label: "Date" }),
    content: fields.markdoc({ label: "Body" }),
  },
});

const projects = collection({
  label: "Projects",
  slugField: "title",
  path: "src/content/projects/*",
  format: { contentField: "content" },
  schema: {
    title: fields.slug({ name: { label: "Title" } }),
    order: fields.integer({ label: "Order", defaultValue: 10 }),
    cover: fields.image({ label: "Cover image", ...uploads }),
    gallery: fields.array(
      fields.object({
        image: fields.image({ label: "Image", ...uploads }),
        alt: fields.text({ label: "Alt text" }),
      }),
      { label: "Gallery", itemLabel: (props) => props.fields.alt.value || "Image" }
    ),
    content: fields.markdoc({ label: "Body" }),
  },
});

const docs = collection({
  label: "Documentation pages",
  slugField: "title",
  path: "src/content/docs/*",
  format: { contentField: "content" },
  schema: {
    title: fields.slug({ name: { label: "Title" } }),
    order: fields.integer({ label: "Order", defaultValue: 10 }),
    content: fields.markdoc({ label: "Body" }),
  },
});

const templateCollections: Record<string, Record<string, Collection<Record<string, ComponentSchema>, string>>> = {
  blog: { posts },
  portfolio: { projects },
  docs: { docs },
};

export default config({
  storage: { kind: "local" },
  ui: {
    brand: { name: brandName },
  },
  collections: {
    pages,
    ...(templateCollections[template] ?? {}),
  },
  singletons: {
    settings: singleton({
      label: "Site Settings",
      path: "src/data/settings",
      format: { data: "json" },
      schema: {
        name: fields.text({ label: "Site name" }),
        siteUrl: fields.text({
          label: "Site URL",
          description:
            "Full public URL of the site, e.g. https://example.com. Required for RSS feed links.",
        }),
        rssEnabled: fields.checkbox({
          label: "RSS feed",
          description:
            "Publish an RSS feed for posts at /posts/rss.xml. Requires a Site URL.",
          defaultValue: true,
        }),
        template: fields.text({ label: "Template" }),
        theme: fields.select({
          label: "Theme",
          options: [
            { label: "Paper", value: "paper" },
            { label: "Signal", value: "signal" },
            { label: "Carbon", value: "carbon" },
            { label: "Dune", value: "dune" },
          ],
          defaultValue: "paper",
        }),
        logo: fields.image({ label: "Logo", ...uploads }),
        logoAlign: fields.select({
          label: "Logo alignment",
          options: [
            { label: "Left", value: "" },
            { label: "Center", value: "center" },
            { label: "Right", value: "right" },
          ],
          defaultValue: "",
        }),
        headerNav: fields.array(
          fields.object({
            label: fields.text({ label: "Label" }),
            url: fields.text({ label: "URL" }),
          }),
          { label: "Header menu", itemLabel: (props) => props.fields.label.value }
        ),
        footerNav: fields.array(
          fields.object({
            label: fields.text({ label: "Label" }),
            url: fields.text({ label: "URL" }),
          }),
          { label: "Footer menu", itemLabel: (props) => props.fields.label.value }
        ),
        signup: fields.object(
          {
            heading: fields.text({ label: "Signup heading" }),
            actionUrl: fields.text({
              label: "Signup form action URL",
              description:
                "POST endpoint from your email provider (Mailchimp, Buttondown, etc.). Leave empty to hide the form.",
            }),
            buttonLabel: fields.text({ label: "Button label", defaultValue: "Sign up" }),
            placeholder: fields.text({ label: "Email placeholder", defaultValue: "Email address" }),
          },
          { label: "Email signup" }
        ),
        socialLinks: fields.array(
          fields.object({
            label: fields.text({ label: "Label" }),
            url: fields.text({ label: "URL" }),
          }),
          { label: "Social links", itemLabel: (props) => props.fields.label.value }
        ),
        footerText: fields.text({
          label: "Footer credit line",
          description:
            "Supports Markdown, e.g. ©2026 Hi-Res — a project of [Raygun](https://…).",
          multiline: true,
        }),
        design: fields.object(
          {
            colorBg: optionalColor("Background color"),
            colorSurface: optionalColor("Surface color"),
            colorText: optionalColor("Text color"),
            colorMuted: optionalColor("Muted text color"),
            colorAccent: optionalColor("Accent color"),
            colorAccentContrast: optionalColor("Text on accent color"),
            fontDisplay: fields.select({
              label: "Display font",
              options: [{ label: "Theme default", value: "" }, ...fontOptions],
              defaultValue: "",
            }),
            fontBody: fields.select({
              label: "Body font",
              options: [{ label: "Theme default", value: "" }, ...fontOptions],
              defaultValue: "",
            }),
            radius: fields.number({
              label: "Corner radius (px)",
              validation: { min: 0, max: 32 },
            }),
            spaceUnit: fields.number({
              label: "Spacing unit (rem)",
              validation: { min: 0.5, max: 2 },
            }),
            contentWidth: fields.number({
              label: "Content width (rem)",
              validation: { min: 30, max: 80 },
            }),
            headingScale: fields.number({
              label: "Heading size scale",
              description:
                "Multiplies block heading sizes. 1 = theme default; try 1.5 for large display headings.",
              validation: { min: 0.75, max: 3 },
            }),
            headingTracking: fields.number({
              label: "Heading letter-spacing (em)",
              description: "Tracking for block headings, e.g. 0.12. Leave empty for the theme default.",
              validation: { min: -0.05, max: 0.5 },
            }),
            headingTransform: fields.select({
              label: "Heading text case",
              options: [
                { label: "Theme default", value: "" },
                { label: "None", value: "none" },
                { label: "Uppercase", value: "uppercase" },
              ],
              defaultValue: "",
            }),
          },
          { label: "Customize Design" }
        ),
      },
    }),
  },
});
