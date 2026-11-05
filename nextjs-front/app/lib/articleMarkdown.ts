import type { Element, ElementContent, Root } from "hast";
import type { PluggableList } from "unified";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import rehypeSlug from "rehype-slug";
import { markdownSanitizeSchema } from "@/app/lib/markdownSanitizeSchema";

// rehype-sanitizeは既存のidに"user-content-"を付けるため、
// slugはsanitizeの後で付けて目次のリンク先と素直に一致させる
export const articleRehypePlugins: PluggableList = [
  rehypeRaw,
  [rehypeSanitize, markdownSanitizeSchema],
  rehypeSlug,
];

const TOC_HEADING_TAGS = { h1: 1, h2: 2, h3: 3 } as const;

export interface TocHeading {
  depth: 1 | 2 | 3;
  text: string;
  id: string;
}

function textOf(node: ElementContent): string {
  if (node.type === "text") return node.value;
  if (node.type === "element") return node.children.map(textOf).join("");
  return "";
}

function collectHeadings(nodes: ElementContent[], headings: TocHeading[]) {
  for (const node of nodes) {
    if (node.type !== "element") continue;
    const depth =
      TOC_HEADING_TAGS[node.tagName as keyof typeof TOC_HEADING_TAGS];
    const id = (node as Element).properties.id;
    if (depth && typeof id === "string") {
      const text = textOf(node).trim();
      if (text) headings.push({ depth, text, id });
      continue;
    }
    collectHeadings(node.children, headings);
  }
}

/**
 * 本文から目次用の見出し(h1〜h3)を取り出す。
 * 表示(ReactMarkdown)と同じプラグインを通すので、idが表示と必ず一致し、
 * 手書きHTMLの見出しも拾える
 */
export function extractHeadings(markdown: string): TocHeading[] {
  const processor = unified()
    .use(remarkParse)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(articleRehypePlugins);
  const tree = processor.runSync(processor.parse(markdown)) as Root;

  const headings: TocHeading[] = [];
  collectHeadings(tree.children as ElementContent[], headings);
  return headings;
}
