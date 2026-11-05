import { afterEach, describe, expect, it, vi } from "vitest";
import {
  EmailNotVerifiedError,
  fetchLikeStatus,
  setLike,
} from "@/app/lib/articleLike";

vi.mock("@/app/auth/authClient", () => ({
  API_BASE_URL: "http://api.test",
  getCsrfToken: vi.fn().mockResolvedValue("token"),
}));

function mockFetch(status: number, body: unknown = {}) {
  // Responseの本文は1回しか読めないため、呼ばれるたびに作り直す
  const fetchMock = vi.fn<
    (
      url: string,
      init: RequestInit & { headers: Record<string, string> },
    ) => Promise<Response>
  >(async () => new Response(JSON.stringify(body), { status }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("articleLike", () => {
  it("いいねの状態をdataから取り出す", async () => {
    mockFetch(200, { data: { liked: false, like_count: 2 } });

    await expect(fetchLikeStatus(1)).resolves.toEqual({
      liked: false,
      like_count: 2,
    });
  });

  it("liked=trueならPOST、falseならDELETEでCSRFトークンを付けて送る", async () => {
    const fetchMock = mockFetch(200, { data: { liked: true, like_count: 1 } });

    await setLike(1, true);
    await setLike(1, false);

    expect(fetchMock.mock.calls.map(([, init]) => init.method)).toEqual([
      "POST",
      "DELETE",
    ]);
    expect(fetchMock.mock.calls[0][0]).toBe(
      "http://api.test/api/articles/1/like",
    );
    expect(fetchMock.mock.calls[0][1].headers["X-XSRF-TOKEN"]).toBe("token");
  });

  it("状態の取得が未ログイン(401)ならnullを返す", async () => {
    mockFetch(401);

    await expect(fetchLikeStatus(1)).resolves.toBeNull();
  });

  it("状態の取得が401以外で失敗したらエラーにする", async () => {
    mockFetch(500);

    await expect(fetchLikeStatus(1)).rejects.toThrow();
  });

  it("いいね・取り消しに失敗したらエラーにする", async () => {
    mockFetch(429);

    await expect(setLike(1, true)).rejects.toThrow();
  });

  it("メールアドレスが未確認(409)なら、それと分かるエラーにする", async () => {
    mockFetch(409);

    await expect(setLike(1, true)).rejects.toBeInstanceOf(
      EmailNotVerifiedError,
    );
  });
});
