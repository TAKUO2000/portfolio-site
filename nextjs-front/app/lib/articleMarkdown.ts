import type { Element, ElementContent, Root } from "hast";
import type { PluggableList } from "unified";
import { unified } from "unified";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import rehypeSlug from "rehype-slug";
import { markdownSanitizeSchema } from "@/app/lib/markdownSanitizeSchema";

// 表・URLの自動のリンク・打ち消し線・チェックボックス（GitHubの拡張。GFM）を読む。
// 公開の記事のページ・エディタのプレビュー・目次で同じものを使い、見た目と目次をそろえる
export const articleRemarkPlugins: PluggableList = [remarkGfm];

const CLOBBER_PREFIX = "user-content-";

/**
 * GFMの脚注のリンクを、sanitizeの後のidに合わせる。
 *
 * remark-rehypeは脚注のidとリンクに"user-content-"を付け、rehype-sanitizeはidにだけもう一度付ける
 * （DOM clobberingを防ぐため。リンクのhrefは変えない）。そのままだと本文の番号から脚注へ、
 * 脚注から本文へ飛べないので、脚注の行き来のリンク（data-footnote-ref・data-footnote-backref）だけ、
 * hrefにも同じ接頭辞を足す。sanitizeの後に置く
 */
export function rehypeFixFootnoteLinks() {
  const walk = (node: Root | ElementContent) => {
    if (node.type === "element") {
      const { href, dataFootnoteRef, dataFootnoteBackref } = node.properties;
      if (
        (dataFootnoteRef !== undefined || dataFootnoteBackref !== undefined) &&
        typeof href === "string" &&
        href.startsWith(`#${CLOBBER_PREFIX}`)
      ) {
        node.properties.href = `#${CLOBBER_PREFIX}${href.slice(1)}`;
      }
    }
    if ("children" in node) {
      for (const child of node.children) walk(child as ElementContent);
    }
  };
  return (tree: Root) => walk(tree);
}

// rehype-sanitizeは既存のidに"user-content-"を付けるため、
// slugはsanitizeの後で付けて目次のリンク先と素直に一致させる
export const articleRehypePlugins: PluggableList = [
  rehypeRaw,
  [rehypeSanitize, markdownSanitizeSchema],
  rehypeFixFootnoteLinks,
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
    // GFMの脚注の欄（見出し「Footnotes」は画面に出さない読み上げ用）は目次に入れない
    if (
      node.tagName === "section" &&
      node.properties.dataFootnotes !== undefined
    ) {
      continue;
    }
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
    .use(articleRemarkPlugins)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(articleRehypePlugins);
  const tree = processor.runSync(processor.parse(markdown)) as Root;

  const headings: TocHeading[] = [];
  collectHeadings(tree.children as ElementContent[], headings);
  return headings;
}
