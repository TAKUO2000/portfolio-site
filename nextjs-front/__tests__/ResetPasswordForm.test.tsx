import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import ResetPasswordForm from "@/app/auth/password-reset/[token]/ResetPasswordForm";

// エラー文言の組み立ては本物を使い、通信に関わる部分だけ差し替える
vi.mock("@/app/auth/authClient", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/app/auth/authClient")>()),
  API_BASE_URL: "http://api.test",
  getCsrfToken: vi.fn().mockResolvedValue("token"),
}));

function mockFetch(status: number, body: unknown = {}) {
  const fetchMock = vi.fn(
    async () => new Response(JSON.stringify(body), { status }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function submit(password: string, confirmation: string) {
  fireEvent.change(screen.getByLabelText("新しいパスワード"), {
    target: { value: password },
  });
  fireEvent.change(screen.getByLabelText("新しいパスワード（確認）"), {
    target: { value: confirmation },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "パスワードを再設定する" }),
  );
}

beforeEach(() => {
  render(<ResetPasswordForm token="abc" initialEmail="user@example.com" />);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("ResetPasswordForm", () => {
  it("メールのリンクのメールアドレスを、最初から入れておく", () => {
    expect(
      (screen.getByLabelText("メールアドレス") as HTMLInputElement).value,
    ).toBe("user@example.com");
  });

  it("確認用のパスワードが違えば、送らずにエラーを出す", async () => {
    const fetchMock = mockFetch(200);

    submit("password1", "password2");

    expect(
      await screen.findByText(
        "新しいパスワードと確認用のパスワードが違います。",
      ),
    ).toBeDefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("再設定できたら、ログインへの案内を出す", async () => {
    const fetchMock = mockFetch(200, { status: "再設定しました" });

    submit("new-password", "new-password");

    expect(
      await screen.findByText(
        "パスワードを再設定しました。新しいパスワードでログインしてください。",
      ),
    ).toBeDefined();
    expect(
      screen.getByRole("link", { name: "ログイン画面へ" }).getAttribute("href"),
    ).toBe("/auth/sign-in");
    expect(fetchMock).toHaveBeenCalledWith(
      "http://api.test/api/reset-password",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          token: "abc",
          email: "user@example.com",
          password: "new-password",
          password_confirmation: "new-password",
        }),
      }),
    );
  });

  it("トークンが無効(422)なら、その内容を出す", async () => {
    mockFetch(422, {
      message: "無効です",
      errors: { email: ["このパスワード再設定トークンは無効です。"] },
    });

    submit("new-password", "new-password");

    expect(
      await screen.findByText("このパスワード再設定トークンは無効です。"),
    ).toBeDefined();
  });

  it("通信に失敗したら、エラーを出す", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("Failed to fetch");
      }),
    );

    submit("new-password", "new-password");

    expect(await screen.findByText("Failed to fetch")).toBeDefined();
  });
});
