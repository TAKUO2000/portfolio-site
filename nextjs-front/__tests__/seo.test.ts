// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

import { getSiteUrl, isIndexable } from "@/app/lib/site";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";

vi.mock("next/navigation", () => ({ notFound: vi.fn() }));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("getSiteUrl", () => {
  it("末尾のスラッシュを落とす（/sitemap.xml などをつなげたときに // にならないように）", () => {
    vi.stubEnv("SITE_URL", "https://takuosblog.com/");

    expect(getSiteUrl()).toBe("https://takuosblog.com");
  });

  it("未設定のときはlocalhostにする", () => {
    vi.stubEnv("SITE_URL", undefined);

    expect(getSiteUrl()).toBe("http://localhost:3000");
  });
});

describe("isIndexable", () => {
  it.each([
    ["production", true],
    ["preview", false],
    ["development", false],
    [undefined, false],
  ])("VERCEL_ENVが%sのとき%s", (vercelEnv, expected) => {
    vi.stubEnv("VERCEL_ENV", vercelEnv);

    expect(isIndexable()).toBe(expected);
  });
});

describe("robots.txt", () => {
  it("本番は巡回を許し、サイトマップの場所を伝える", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("SITE_URL", "https://takuosblog.com");

    expect(robots()).toEqual({
      rules: { userAgent: "*", allow: "/", disallow: "/api/" },
      sitemap: "https://takuosblog.com/sitemap.xml",
    });
  });

  it("本番以外（ステージングなど）は、SITE_URLが本番の値でも全体を巡回させない", () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("SITE_URL", "https://takuosblog.com");

    expect(robots()).toEqual({ rules: { userAgent: "*", disallow: "/" } });
  });
});

describe("sitemap.xml", () => {
  /** APIのページごとの記事を返すfetchに差し替える */
  function stubArticlePages(pages: { id: number; updated_at: string }[][]) {
    const fetchMock = vi.fn(async (url: string) => {
      const page = Number(new URL(url).searchParams.get("page"));
      return new Response(
        JSON.stringify({
          data: pages[page - 1] ?? [],
          meta: { current_page: page, last_page: Math.max(pages.length, 1) },
        }),
      );
    });
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
  }

  it("トップ・記事一覧と、APIの全ページの公開記事を載せる", async () => {
    vi.stubEnv("SITE_URL", "https://takuosblog.com");
    const fetchMock = stubArticlePages([
      [{ id: 3, updated_at: "2026-11-01T00:00:00.000000Z" }],
      [{ id: 1, updated_at: "2026-11-20T00:00:00.000000Z" }],
    ]);

    await expect(sitemap()).resolves.toEqual([
      // トップと記事一覧の最終更新日は、いちばん新しく変わった記事に合わせる
      {
        url: "https://takuosblog.com",
        lastModified: "2026-11-20T00:00:00.000000Z",
      },
      {
        url: "https://takuosblog.com/articles",
        lastModified: "2026-11-20T00:00:00.000000Z",
      },
      {
        url: "https://takuosblog.com/articles/3",
        lastModified: "2026-11-01T00:00:00.000000Z",
      },
      {
        url: "https://takuosblog.com/articles/1",
        lastModified: "2026-11-20T00:00:00.000000Z",
      },
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("記事が0件でも、トップと記事一覧は載せる", async () => {
    vi.stubEnv("SITE_URL", "https://takuosblog.com");
    stubArticlePages([]);

    await expect(sitemap()).resolves.toEqual([
      { url: "https://takuosblog.com", lastModified: undefined },
      { url: "https://takuosblog.com/articles", lastModified: undefined },
    ]);
  });
});
