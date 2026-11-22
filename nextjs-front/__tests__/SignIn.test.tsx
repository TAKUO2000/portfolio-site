import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import SignIn from "@/app/auth/sign-in/SignIn";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

beforeEach(() => {
  render(<SignIn />);
});

afterEach(() => {
  cleanup();
});

describe("SignIn", () => {
  // アカウントを持っていない人が、サインインのページから登録の場所へ移れるように
  it("サインアップのページへのリンクがある", () => {
    const link = screen.getByRole("link", { name: "サインアップ" });

    expect(link.getAttribute("href")).toBe("/auth/sign-up");
  });

  it("パスワードの再設定のページへのリンクがある", () => {
    const link = screen.getByRole("link", {
      name: "パスワードを忘れた方はこちら",
    });

    expect(link.getAttribute("href")).toBe("/auth/forgot-password");
  });
});
