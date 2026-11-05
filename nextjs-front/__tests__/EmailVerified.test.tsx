import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import EmailVerified from "@/app/auth/email-verified/page";

// サーバーコンポーネントなので、関数として呼んで返ってきた要素を描画する
async function renderWithStatus(status?: string) {
  render(await EmailVerified({ searchParams: Promise.resolve({ status }) }));
}

afterEach(cleanup);

describe("EmailVerified", () => {
  it("status=verified なら、確認できたこととトップへのリンクを出す", async () => {
    await renderWithStatus("verified");

    expect(
      screen.getByText(
        "メールアドレスを確認しました。いいねできるようになりました。",
      ),
    ).toBeDefined();
    expect(
      screen.getByRole("link", { name: "トップへ" }).getAttribute("href"),
    ).toBe("/");
  });

  it.each([["invalid"], [undefined], ["unexpected"]])(
    "status=%s なら、無効なことと再送へのリンクを出す",
    async (status) => {
      await renderWithStatus(status);

      expect(
        screen.getByText(
          "このリンクは無効か、期限が切れています。ログインして、確認メールを送り直してください。",
        ),
      ).toBeDefined();
      expect(
        screen
          .getByRole("link", { name: "確認メールを送り直す" })
          .getAttribute("href"),
      ).toBe("/auth/verify-email");
    },
  );
});
