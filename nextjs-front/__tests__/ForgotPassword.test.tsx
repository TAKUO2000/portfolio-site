import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import ForgotPassword from "@/app/auth/forgot-password/page";

// エラー文言の組み立ては本物を使い、通信に関わる部分だけ差し替える
vi.mock("@/app/auth/authClient", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/app/auth/authClient")>()),
  API_BASE_URL: "http://api.test",
  getCsrfToken: vi.fn().mockResolvedValue("token"),
}));

function mockFetch(status: number, body: unknown) {
  const fetchMock = vi.fn(
    async () => new Response(JSON.stringify(body), { status }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function submit(email = "user@example.com") {
  fireEvent.change(screen.getByLabelText("メールアドレス"), {
    target: { value: email },
  });
  fireEvent.click(screen.getByRole("button", { name: "再設定用メールを送る" }));
}

beforeEach(() => {
  render(<ForgotPassword />);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("ForgotPassword", () => {
  it("送信できたら、サーバーの文言を出す", async () => {
    const fetchMock = mockFetch(200, { status: "登録されていれば送りました" });

    submit();

    expect(await screen.findByText("登録されていれば送りました")).toBeDefined();
    expect(fetchMock).toHaveBeenCalledWith(
      "http://api.test/api/forgot-password",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ email: "user@example.com" }),
      }),
    );
  });

  it("入力エラー(422)なら、その内容を出す", async () => {
    mockFetch(422, {
      message: "形式が違います",
      errors: { email: ["メールアドレスの形式が違います"] },
    });

    submit();

    expect(
      await screen.findByText("メールアドレスの形式が違います"),
    ).toBeDefined();
  });

  it("回数制限(429)なら、時間をおくよう案内する", async () => {
    mockFetch(429, { message: "Too Many Attempts." });

    submit();

    expect(
      await screen.findByText(
        "短い時間に何度も送信されました。少し時間をおいてからお試しください。",
      ),
    ).toBeDefined();
  });

  it("通信に失敗したら、エラーを出す", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("Failed to fetch");
      }),
    );

    submit();

    expect(await screen.findByText("Failed to fetch")).toBeDefined();
  });
});
