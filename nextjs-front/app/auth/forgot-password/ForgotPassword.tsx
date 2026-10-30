"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

import { API_BASE_URL, getApiErrorMessage, getCsrfToken } from "../authClient";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setStatusMessage("");
    setIsSubmitting(true);

    try {
      const xsrfToken = await getCsrfToken();
      const response = await fetch(`${API_BASE_URL}/api/forgot-password`, {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
          "X-XSRF-TOKEN": xsrfToken,
        },
        body: JSON.stringify({ email }),
      });

      const responseBody = await response.json().catch(() => null);

      if (!response.ok) {
        setErrorMessage(
          getApiErrorMessage(
            response.status,
            responseBody,
            "再設定用メールの送信に失敗しました。入力内容を確認してください。",
          ),
        );
        return;
      }

      // サーバーの文言は文字列のときだけ使う（形が想定外でも画面を壊さない）
      const status =
        typeof responseBody?.status === "string" ? responseBody.status : null;
      setStatusMessage(
        status ??
          "入力したメールアドレスが登録されていれば、パスワード再設定用のメールを送信しました。",
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "送信処理中にエラーが発生しました。",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f4f1eb] px-6 py-16">
      <section className="mx-auto flex w-full max-w-sm flex-col gap-8">
        <div className="space-y-2">
          <p className="text-sm font-semibold text-neutral-600">
            Forgot password
          </p>
          <h1 className="text-3xl font-bold text-neutral-950">
            パスワードの再設定
          </h1>
          <p className="text-sm text-neutral-600">
            登録したメールアドレスを入力してください。パスワード再設定用のURLをメールでお送りします。
          </p>
        </div>

        <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
          <label className="flex flex-col gap-2 text-sm font-semibold text-neutral-800">
            メールアドレス
            <input
              className="h-11 rounded border border-neutral-300 bg-white px-3 text-base font-normal outline-none transition focus:border-neutral-950"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>

          {errorMessage && (
            <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {errorMessage}
            </p>
          )}

          {statusMessage && (
            <p className="rounded border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
              {statusMessage}
            </p>
          )}

          <button
            className="h-11 rounded bg-neutral-950 px-4 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-400"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? "送信中..." : "再設定用メールを送る"}
          </button>
        </form>

        <p className="text-center text-sm text-neutral-600">
          <Link className="font-semibold text-neutral-950" href="/auth/sign-in">
            ログインに戻る
          </Link>
        </p>
      </section>
    </main>
  );
}
