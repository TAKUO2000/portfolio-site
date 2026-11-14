import { describe, expect, test } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import ReactMarkdown from "react-markdown";
import {
  articleRehypePlugins,
  articleRemarkPlugins,
  extractHeadings,
} from "@/app/lib/articleMarkdown";

describe("extractHeadings", () => {
  test("h1〜h3を順番通りに階層付きで取り出す", () => {
    const md = "# 概要\n\n本文\n\n## 環境構築\n\n### Docker\n\n#### 細かい話";

    expect(extractHeadings(md)).toEqual([
      { depth: 1, text: "概要", id: "概要" },
      { depth: 2, text: "環境構築", id: "環境構築" },
      { depth: 3, text: "Docker", id: "docker" },
    ]);
  });

  test("同じ見出しはidに連番が付く", () => {
    const md = "## はじめに\n\n## はじめに";

    expect(extractHeadings(md).map((h) => h.id)).toEqual([
      "はじめに",
      "はじめに-1",
    ]);
  });

  test("装飾付きの見出しは文字だけを目次に使う", () => {
    expect(extractHeadings("## **太字**と`code`")).toEqual([
      { depth: 2, text: "太字とcode", id: "太字とcode" },
    ]);
  });

  test("手書きHTMLの見出しも拾う", () => {
    const md = '<h2>HTMLの見出し</h2>\n\n<h3 id="custom">id付き</h3>';

    expect(extractHeadings(md)).toEqual([
      { depth: 2, text: "HTMLの見出し", id: "htmlの見出し" },
      { depth: 3, text: "id付き", id: "user-content-custom" },
    ]);
  });

  test("見出しが無ければ空配列を返す", () => {
    expect(extractHeadings("ただの本文")).toEqual([]);
  });
});

// 公開の記事のページと同じプラグインで描く（エディタのプレビューも同じ remark のプラグインを使う）
function renderArticle(markdown: string): string {
  return renderToStaticMarkup(
    <ReactMarkdown
      remarkPlugins={articleRemarkPlugins}
      rehypePlugins={articleRehypePlugins}
    >
      {markdown}
    </ReactMarkdown>,
  );
}

describe("記事の本文の描画（GFM）", () => {
  test("Markdown の表が表になる", () => {
    const html = renderArticle("| 項目 | 値 |\n| --- | --- |\n| a | b |");

    expect(html).toContain("<table>");
    expect(html).toContain("<th>項目</th>");
    expect(html).toContain("<td>b</td>");
  });

  test("URL をそのまま書くとリンクになる", () => {
    const html = renderArticle("詳しくは https://example.com を見る");

    expect(html).toContain(
      '<a href="https://example.com">https://example.com</a>',
    );
  });

  test("打ち消し線が使える", () => {
    expect(renderArticle("~~古い~~")).toContain("<del>古い</del>");
  });

  test("HTML の表は今までどおり描かれる", () => {
    const html = renderArticle(
      "<table><thead><tr><th>項目</th></tr></thead><tbody><tr><td>a</td></tr></tbody></table>",
    );

    expect(html).toContain("<th>項目</th>");
    expect(html).toContain("<td>a</td>");
  });

  test("表の後の見出しも目次に出る", () => {
    expect(
      extractHeadings("| a |\n| --- |\n| b |\n\n## まとめ").map((h) => h.text),
    ).toEqual(["まとめ"]);
  });
});

describe("記事の本文の描画（GFM の脚注）", () => {
  const md = "本文[^1]\n\n[^1]: 注";

  test("本文の脚注の番号から、脚注へ飛べる（リンク先のidがある）", () => {
    const html = renderArticle(md);
    const refHref = html.match(/<a href="#([^"]+)"[^>]*data-footnote-ref/)?.[1];

    expect(refHref).toBeDefined();
    expect(html).toContain(`id="${refHref}"`);
  });

  test("脚注の戻るリンクから、本文の番号へ戻れる", () => {
    const html = renderArticle(md);
    const backHref = html.match(
      /<a href="#([^"]+)"[^>]*data-footnote-backref/,
    )?.[1];

    expect(backHref).toBeDefined();
    expect(html).toContain(`id="${backHref}"`);
  });

  test("脚注の見出し（Footnotes）は目次に出さない", () => {
    expect(extractHeadings(`## まとめ\n\n${md}`).map((h) => h.text)).toEqual([
      "まとめ",
    ]);
  });
});
