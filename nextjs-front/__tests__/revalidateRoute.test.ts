// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/revalidate/route";

const { revalidateTag } = vi.hoisted(() => ({ revalidateTag: vi.fn() }));
vi.mock("next/cache", () => ({ revalidateTag }));

function postWith(authorization?: string) {
  return POST(
    new Request("http://front.test/api/revalidate", {
      method: "POST",
      headers: authorization ? { Authorization: authorization } : {},
    }),
  );
}

beforeEach(() => {
  vi.stubEnv("REVALIDATE_SECRET", "secret");
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  revalidateTag.mockClear();
});

describe("POST /api/revalidate", () => {
  it("シークレットが合えば記事一覧のキャッシュを捨てる", async () => {
    const res = await postWith("Bearer secret");

    expect(res.status).toBe(200);
    expect(revalidateTag).toHaveBeenCalledWith("articles", { expire: 0 });
  });

  it("シークレットが違えば401を返し、キャッシュは捨てない", async () => {
    const res = await postWith("Bearer wrong");

    expect(res.status).toBe(401);
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it("Bearerの接頭辞が無ければ、シークレットが合っていても401を返す", async () => {
    const res = await postWith("secret");

    expect(res.status).toBe(401);
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it("Authorizationが無ければ401を返す", async () => {
    const res = await postWith();

    expect(res.status).toBe(401);
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it("REVALIDATE_SECRETが未設定なら、空のトークンでも受け付けない", async () => {
    vi.stubEnv("REVALIDATE_SECRET", "");

    const res = await postWith("Bearer ");

    expect(res.status).toBe(500);
    expect(revalidateTag).not.toHaveBeenCalled();
  });
});
