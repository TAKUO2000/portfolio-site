import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import HeaderAuthStatus from "@/app/components/HeaderAuthStatus";
import { getCurrentUser } from "@/app/auth/authClient";
import type { User } from "@/app/types/models";

// vitestではSVGRが効かずSVGがURL文字列になるため、空のコンポーネントに置き換える
vi.mock("@/public/Pencil.svg", () => ({ default: () => null }));
vi.mock("@/public/Plus.svg", () => ({ default: () => null }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("@/app/auth/authClient", () => ({
  API_BASE_URL: "http://api.test",
  getCsrfToken: vi.fn(),
  getCurrentUser: vi.fn(),
}));

const getCurrentUserMock = vi.mocked(getCurrentUser);

const user: User = {
  id: 1,
  name: "Test User",
  email: "user@example.com",
  role: "user",
  email_verified: true,
};

beforeEach(() => {
  vi.resetAllMocks();
});

afterEach(cleanup);

describe("HeaderAuthStatus", () => {
  it("メールアドレスが未確認なら、確認の画面へのリンクを出す", async () => {
    getCurrentUserMock.mockResolvedValue({ ...user, email_verified: false });

    render(<HeaderAuthStatus />);

    const link = await screen.findByRole("link", { name: "メールを確認" });
    expect(link.getAttribute("href")).toBe("/auth/verify-email");
  });

  it("確認済みなら、確認の画面へのリンクを出さない", async () => {
    getCurrentUserMock.mockResolvedValue(user);

    render(<HeaderAuthStatus />);

    expect(await screen.findByText("Test User")).toBeDefined();
    expect(screen.queryByRole("link", { name: "メールを確認" })).toBeNull();
  });

  it("未ログインなら、登録とログインのリンクを出す", async () => {
    getCurrentUserMock.mockResolvedValue(null);

    render(<HeaderAuthStatus />);

    expect(await screen.findByRole("link", { name: "Sign up" })).toBeDefined();
    expect(screen.getByRole("link", { name: "Sign in" })).toBeDefined();
  });
});
