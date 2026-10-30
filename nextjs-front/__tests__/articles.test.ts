import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchArticle, fetchArticles } from "@/app/lib/articles";

const { notFound } = vi.hoisted(() => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_HTTP_ERROR_FALLBACK;404");
  }),
}));
vi.mock("next/navigation", () => ({ notFound }));

afterEach(() => {
  vi.unstubAllGlobals();
  notFound.mockClear();
});

describe("fetchArticles", () => {
  it("記事の変更時に捨てられるよう、タグと時間による作り直しを付けて取得する", async () => {
    const fetchMock = vi.fn<
      (url: string, init: RequestInit) => Promise<Response>
    >(async () => new Response(JSON.stringify({ data: [] })));
    vi.stubGlobal("fetch", fetchMock);

    await fetchArticles({ sort: "latest", perPage: 1 });

    // app/api/revalidate が捨てるタグと揃っていないと、記事を公開してもトップが変わらない
    expect(fetchMock.mock.calls[0][1].next).toEqual({
      tags: ["articles"],
      revalidate: 3600,
    });
  });
});

describe("fetchArticle", () => {
  it("記事を返す", async () => {
    const article = { id: 1, title: "記事のタイトル" };
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ data: article }))),
    );

    await expect(fetchArticle("1")).resolves.toEqual(article);
  });

  it("存在しない記事や下書き（404）は、エラー画面ではなく404にする", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 404 })),
    );

    await expect(fetchArticle("999")).rejects.toThrow(
      "NEXT_HTTP_ERROR_FALLBACK;404",
    );
    expect(notFound).toHaveBeenCalled();
  });

  it("APIの障害（5xx）は404にせず、エラーにする", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 500 })),
    );

    await expect(fetchArticle("1")).rejects.toThrow("(status: 500)");
    expect(notFound).not.toHaveBeenCalled();
  });
});
