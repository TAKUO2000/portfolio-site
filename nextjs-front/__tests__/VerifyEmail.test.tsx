import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import VerifyEmail from "@/app/auth/verify-email/page";
import { getCurrentUser } from "@/app/auth/authClient";
import type { User } from "@/app/types/models";

// エラー文言の組み立ては本物を使い、通信に関わる部分だけ差し替える
vi.mock("@/app/auth/authClient", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/app/auth/authClient")>()),
  API_BASE_URL: "http://api.test",
  getCsrfToken: vi.fn().mockResolvedValue("token"),
  getCurrentUser: vi.fn(),
}));

const getCurrentUserMock = vi.mocked(getCurrentUser);

const unverifiedUser: User = {
  id: 1,
  name: "Test User",
  email: "user@example.com",
  role: "user",
  email_verified: false,
};

function mockFetch(status: number, body: unknown) {
  const fetchMock = vi.fn(
    async () => new Response(JSON.stringify(body), { status }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function resendButton() {
  return screen.getByRole("button", { name: "確認メールを送り直す" });
}

beforeEach(() => {
  vi.resetAllMocks();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("VerifyEmail", () => {
  it("未ログインなら、ログインを案内する", async () => {
    getCurrentUserMock.mockResolvedValue(null);

    render(<VerifyEmail />);

    const link = await screen.findByRole("link", { name: "ログイン" });
    expect(link.getAttribute("href")).toBe("/auth/sign-in");
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("確認済みなら、その旨とトップへのリンクを出す", async () => {
    getCurrentUserMock.mockResolvedValue({
      ...unverifiedUser,
      email_verified: true,
    });

    render(<VerifyEmail />);

    expect(
      await screen.findByText("メールアドレスは確認済みです。"),
    ).toBeDefined();
    expect(
      screen.getByRole("link", { name: "トップへ" }).getAttribute("href"),
    ).toBe("/");
  });

  it("未確認なら、送り先のアドレスと再送ボタンを出す", async () => {
    getCurrentUserMock.mockResolvedValue(unverifiedUser);

    render(<VerifyEmail />);

    expect(await screen.findByText("user@example.com")).toBeDefined();
    expect(resendButton()).toBeDefined();
  });

  it("再送できたら、送り直したことを出す", async () => {
    getCurrentUserMock.mockResolvedValue(unverifiedUser);
    const fetchMock = mockFetch(200, { status: "verification-link-sent" });

    render(<VerifyEmail />);
    fireEvent.click(await screen.findByRole("button"));

    expect(
      await screen.findByText("確認メールを送り直しました。"),
    ).toBeDefined();
    expect(fetchMock).toHaveBeenCalledWith(
      "http://api.test/api/email/verification-notification",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("再送しようとしたら確認済みだった場合は、確認済みの表示に切り替える", async () => {
    // 別のタブやスマホで確認リンクを開いたあと、この画面に戻って再送を押した場合
    getCurrentUserMock.mockResolvedValue(unverifiedUser);
    mockFetch(200, { status: "already-verified" });

    render(<VerifyEmail />);
    fireEvent.click(await screen.findByRole("button"));

    expect(
      await screen.findByText("メールアドレスは確認済みです。"),
    ).toBeDefined();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("回数制限(429)なら、時間をおくよう案内する", async () => {
    getCurrentUserMock.mockResolvedValue(unverifiedUser);
    mockFetch(429, { message: "Too Many Attempts." });

    render(<VerifyEmail />);
    fireEvent.click(await screen.findByRole("button"));

    expect(
      await screen.findByText(
        "短い時間に何度も送信されました。少し時間をおいてからお試しください。",
      ),
    ).toBeDefined();
  });

  it("通信に失敗したら、エラーを出す", async () => {
    getCurrentUserMock.mockResolvedValue(unverifiedUser);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("Failed to fetch");
      }),
    );

    render(<VerifyEmail />);
    fireEvent.click(await screen.findByRole("button"));

    expect(await screen.findByText("Failed to fetch")).toBeDefined();
  });
});
