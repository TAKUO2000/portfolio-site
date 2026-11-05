import { describe, expect, test } from "vitest";
import { extractHeadings } from "@/app/lib/articleMarkdown";

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
