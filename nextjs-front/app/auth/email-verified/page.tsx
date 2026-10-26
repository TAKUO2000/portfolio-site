import type { Metadata } from "next";
import Link from "next/link";

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
    <main className="min-h-screen bg-[#f4f1eb] px-6 py-16">
      <section className="mx-auto flex w-full max-w-sm flex-col gap-8">
        <div className="space-y-2">
          <p className="text-sm font-semibold text-neutral-600">Verify email</p>
          <h1 className="text-3xl font-bold text-neutral-950">
            メールアドレスの確認
          </h1>
        </div>

        {isVerified ? (
          <p className="rounded border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
            メールアドレスを確認しました。いいねできるようになりました。
          </p>
        ) : (
          <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            このリンクは無効か、期限が切れています。ログインして、確認メールを送り直してください。
          </p>
        )}

        <div className="flex flex-col gap-3">
          <Link
            className="flex h-11 items-center justify-center rounded bg-neutral-950 px-4 text-sm font-semibold text-white transition hover:bg-neutral-800"
            href={isVerified ? "/" : "/auth/verify-email"}
          >
            {isVerified ? "トップへ" : "確認メールを送り直す"}
          </Link>
          <Link
            className="text-center text-sm font-semibold text-neutral-950"
            href="/auth/sign-in"
          >
            ログイン
          </Link>
        </div>
      </section>
    </main>
  );
}
