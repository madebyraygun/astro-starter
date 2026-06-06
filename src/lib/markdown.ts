import Markdoc from "@markdoc/markdoc";

export function renderMarkdown(source: string): string {
  if (!source) return "";
  const ast = Markdoc.parse(source);
  const content = Markdoc.transform(ast);
  return Markdoc.renderers.html(content);
}
