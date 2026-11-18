import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import LatestArticle from "@/app/components/LatestArticle";
import type { ArticleSummary } from "@/app/types/models";

/**
 * 要素のクラスを1つずつの配列にする。className の文字列に toContain を使うと部分一致になり、
 * 「hidden」が「max-md:hidden」でも通ってしまうので、配列にして完全一致で比べる
 */
function classesOf(element: Element | null | undefined): string[] {
  return element ? Array.from(element.classList) : [];
}

// CategoryBox は SVG をコンポーネントとして読み込むので、テストでは名前と compact だけを出す
vi.mock("@/app/components/ui/CategoryBox", () => ({
  default: ({
    category,
    compact = false,
  }: {
    category: string;
    compact?: boolean;
  }) => <div data-compact={compact}>{category}</div>,
}));

const article: ArticleSummary = {
  id: 7,
  title: "記事のタイトル",
  summary: "記事の概要",
  header_image: null,
  published_at: "2026-09-10T18:35:39.000000Z",
  user: { id: 1, name: "Admin User" },
  category: { id: 1, name: "技術" },
  tags: [
    { id: 1, name: "Laravel" },
    { id: 2, name: "Docker" },
    { id: 3, name: "PHP" },
    { id: 4, name: "AWS" },
  ],
  like_count: 1,
};

afterEach(() => {
  cleanup();
});

function renderLatest(latest: ArticleSummary | null = article) {
  return render(
    <LatestArticle
      title="Latest Article"
      moreButtonHref="/articles?sort=latest"
      article={latest}
    />,
  );
}

describe("LatestArticle", () => {
  it("カード全体が、記事のページへのリンクになる", () => {
    renderLatest();
    const card = screen.getByRole("link", { name: /記事のタイトル/ });

    expect(card.getAttribute("href")).toBe("/articles/7");
  });

  // 影が消えても枠の四隅を欠けさせないよう、ウィンドウ用の押し込みを使う
  it("カードは、ウィンドウ風の枠にして、上にタイトルバーを付ける", () => {
    renderLatest();
    const card = screen.getByRole("link", { name: /記事のタイトル/ });

    expect(classesOf(card)).toContain("pixel-window");
    expect(classesOf(card)).toContain("pixel-press-window");
    expect(card.firstElementChild?.getAttribute("aria-hidden")).toBe("true");
    expect(classesOf(card.firstElementChild)).toContain("col-span-full");
  });

  // md未満は画像が小さいので、アイコンの無い小さなラベルに出し分ける
  it("カテゴリは、md未満はアイコンの無いもの、md以上はアイコン付きのものを出す", () => {
    renderLatest();
    const [compact, withIcon] = screen.getAllByText("技術");

    expect(compact.getAttribute("data-compact")).toBe("true");
    expect(classesOf(compact.parentElement)).toContain("md:hidden");
    expect(withIcon.getAttribute("data-compact")).toBe("false");
    expect(classesOf(withIcon.parentElement)).toContain("max-md:hidden");
  });

  it("タグは、先頭の3つまで出す", () => {
    renderLatest();

    expect(screen.getByText("Laravel")).toBeDefined();
    expect(screen.getByText("PHP")).toBeDefined();
    expect(screen.queryByText("AWS")).toBeNull();
  });

  // 飾りなので、リンクの名前には含めない
  it("右下に「記事を読む ▶」を、読み上げない飾りとして出す", () => {
    renderLatest();

    expect(screen.getByText("記事を読む ▶").getAttribute("aria-hidden")).toBe(
      "true",
    );
  });

  it("記事が無いときは、カードの代わりに案内を出す", () => {
    renderLatest(null);

    expect(screen.getByText("まだ記事がありません。")).toBeDefined();
    expect(screen.queryByText("記事を読む ▶")).toBeNull();
  });

  it("記事が無くても、一覧へのボタンは出す", () => {
    renderLatest(null);
    const more = screen.getByRole("link", { name: "最近の投稿" });

    expect(more.getAttribute("href")).toBe("/articles?sort=latest");
  });
});
