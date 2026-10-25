import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchArticles } from "@/app/lib/articles";

afterEach(() => {
  vi.unstubAllGlobals();
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
