import type { Metadata } from "next";
import Link from "next/link";
import AuthPage from "@/app/auth/AuthPage";
import {
  AUTH_ERROR,
  AUTH_LINK,
  AUTH_SUBMIT,
  AUTH_SUCCESS,
} from "@/app/auth/authStyles";

export const metadata: Metadata = {
  title: "メールアドレスの確認",
};

// 確認メールのリンクを開いたあと、BE（VerifyEmailController）がリダイレクトしてくる画面
export default async function EmailVerified({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { status } = await searchParams;
  const isVerified = status === "verified";

  return (
    <AuthPage eyebrow="Verify email" title="メールアドレスの確認">
      {isVerified ? (
        <p className={AUTH_SUCCESS}>
          メールアドレスを確認しました。いいねできるようになりました。
        </p>
      ) : (
        <p className={AUTH_ERROR}>
          このリンクは無効か、期限が切れています。ログインして、確認メールを送り直してください。
        </p>
      )}

      {/* ボタンの影が下に 8px はみ出すので、その分より広く間を空ける */}
      <div className="flex flex-col gap-5">
        <Link
          className={AUTH_SUBMIT}
          href={isVerified ? "/" : "/auth/verify-email"}
        >
          {isVerified ? "トップへ" : "確認メールを送り直す"}
        </Link>
        <Link
          className={`text-center text-sm ${AUTH_LINK}`}
          href="/auth/sign-in"
        >
          ログイン
        </Link>
      </div>
    </AuthPage>
  );
}
