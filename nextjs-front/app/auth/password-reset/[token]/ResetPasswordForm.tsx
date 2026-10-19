"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

import {
  API_BASE_URL,
  getApiErrorMessage,
  getCsrfToken,
} from "../../authClient";

type Props = {
  token: string;
  initialEmail: string;
};

export default function ResetPasswordForm({ token, initialEmail }: Props) {
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isCompleted, setIsCompleted] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const xsrfToken = await getCsrfToken();
      const response = await fetch(`${API_BASE_URL}/api/reset-password`, {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
          "X-XSRF-TOKEN": xsrfToken,
        },
        body: JSON.stringify({
          token,
          email,
          password,
          password_confirmation: passwordConfirmation,
        }),
      });

      if (!response.ok) {
        const responseBody = await response.json().catch(() => null);
        setErrorMessage(
          getApiErrorMessage(
            response.status,
            responseBody,
            "パスワードの再設定に失敗しました。入力内容を確認してください。",
          ),
        );
        return;
      }

      setIsCompleted(true);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "再設定処理中にエラーが発生しました。",
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
            Reset password
          </p>
          <h1 className="text-3xl font-bold text-neutral-950">
            新しいパスワードの設定
          </h1>
        </div>

        {isCompleted ? (
          <div className="flex flex-col gap-5">
            <p className="rounded border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
              パスワードを再設定しました。新しいパスワードでログインしてください。
            </p>
            <Link
              className="flex h-11 items-center justify-center rounded bg-neutral-950 px-4 text-sm font-semibold text-white transition hover:bg-neutral-800"
              href="/auth/sign-in"
            >
              ログイン画面へ
            </Link>
          </div>
        ) : (
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

            <label className="flex flex-col gap-2 text-sm font-semibold text-neutral-800">
              新しいパスワード
              <input
                className="h-11 rounded border border-neutral-300 bg-white px-3 text-base font-normal outline-none transition focus:border-neutral-950"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </label>

            <label className="flex flex-col gap-2 text-sm font-semibold text-neutral-800">
              新しいパスワード（確認）
              <input
                className="h-11 rounded border border-neutral-300 bg-white px-3 text-base font-normal outline-none transition focus:border-neutral-950"
                type="password"
                autoComplete="new-password"
                value={passwordConfirmation}
                onChange={(event) =>
                  setPasswordConfirmation(event.target.value)
                }
                required
              />
            </label>

            {errorMessage && (
              <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {errorMessage}
              </p>
            )}

            <button
              className="h-11 rounded bg-neutral-950 px-4 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-400"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? "設定中..." : "パスワードを再設定する"}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
