"use client"; // エラーバウンダリはClient Componentである必要がある

import { useEffect } from "react";
import NormalButton from "@/app/components/ui/NormalButton";

/**
 * 想定外のエラーをページ全体の代わりに表示する。
 *
 * これが無いとNext.jsの汎用エラー画面になり、何が起きたのか利用者に伝わらない。
 */
export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-100 w-full max-w-5xl flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <h1 className="text-2xl font-bold">ページを表示できませんでした</h1>
      <p className="text-sm text-gray-600">
        時間をおいて再度お試しください。続く場合はしばらく経ってからアクセスしてください。
      </p>
      <NormalButton
        color="green"
        buttonLabel="再読み込み"
        onClick={() => unstable_retry()}
      />
    </main>
  );
}
