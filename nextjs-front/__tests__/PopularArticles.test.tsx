import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import PopularArticles from "@/app/components/PopularArticles";
import type { ArticleSummary } from "@/app/types/models";

/**
 * 要素のクラスを1つずつの配列にする。className の文字列に toContain を使うと部分一致になり、
 * 「hidden」が「max-md:hidden」でも通ってしまうので、配列にして完全一致で比べる
 */
function classesOf(element: Element | null | undefined): string[] {
  return element ? Array.from(element.classList) : [];
}

// CategoryBox は SVG をコンポーネントとして読み込むので、テストでは名前だけを出す
vi.mock("@/app/components/ui/CategoryBox", () => ({
  default: ({ category }: { category: string }) => <div>{category}</div>,
}));

const article: ArticleSummary = {
  id: 1,
  title: "記事のタイトル",
  summary: "記事の概要",
  header_image: null,
  published_at: "2026-09-10T18:35:39.000000Z",
  user: { id: 1, name: "Admin User" },
  category: { id: 1, name: "技術" },
  tags: [{ id: 1, name: "Laravel" }],
  like_count: 1,
};

afterEach(() => {
  cleanup();
});

function renderPopular() {
  render(
    <PopularArticles
      title="Popular Articles"
      moreButtonHref="/articles?sort=popular"
      articles={[article]}
    />,
  );
}

describe("PopularArticles", () => {
  // 左右に余白（px-16）があると、スマホの幅で見出しが2行になる
  it("見出しの左右の余白は、md以上だけに付ける", () => {
    renderPopular();
    const heading = classesOf(screen.getByRole("heading", { level: 2 }));

    expect(heading).toContain("md:px-16");
    expect(heading).not.toContain("px-16");
  });

  it("md未満は、画像を左に置いた小さなカードにする", () => {
    renderPopular();
    const card = classesOf(
      screen.getByRole("link", { name: /記事のタイトル/ }),
    );

    expect(card).toContain("grid-cols-[104px_1fr]");
    expect(card).toContain("md:grid-cols-[288px_1fr]");
  });

  it("md未満は、概要文・タグ・右下の矢印を出さない", () => {
    renderPopular();

    expect(classesOf(screen.getByText("記事の概要"))).toContain(
      "max-md:hidden",
    );
    expect(classesOf(screen.getByText("Laravel").parentElement)).toContain(
      "max-md:hidden",
    );
    expect(classesOf(screen.getByText("記事を読む").parentElement)).toContain(
      "max-md:hidden",
    );
  });

  // 画像が小さく、アイコン付きのカテゴリが収まらないので、文字だけのものに出し分ける
  it("カテゴリは、md未満は文字だけのもの、md以上は画像の上のものを出す", () => {
    renderPopular();
    const [onImage, textOnly] = screen.getAllByText("技術");

    expect(classesOf(onImage.closest(".absolute"))).toContain("max-md:hidden");
    expect(classesOf(textOnly)).toContain("md:hidden");
  });
});
