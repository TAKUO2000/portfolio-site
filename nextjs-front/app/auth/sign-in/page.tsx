"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { API_BASE_URL, getApiErrorMessage, getCsrfToken } from "../authClient";

export default function SignIn() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const xsrfToken = await getCsrfToken();
      const loginResponse = await fetch(`${API_BASE_URL}/api/login`, {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
          "X-XSRF-TOKEN": xsrfToken,
        },
        body: JSON.stringify({ email, password }),
      });

      if (!loginResponse.ok) {
        const responseBody = await loginResponse.json().catch(() => null);
        setErrorMessage(
          getApiErrorMessage(
            loginResponse.status,
            responseBody,
            "ログインに失敗しました。入力内容を確認してください。",
          ),
        );
        return;
      }

      router.push("/");
      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "ログイン処理中にエラーが発生しました。",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f4f1eb] px-6 py-16">
      <section className="mx-auto flex w-full max-w-sm flex-col gap-8">
        <div className="space-y-2">
          <p className="text-sm font-semibold text-neutral-600">Sign in</p>
          <h1 className="text-3xl font-bold text-neutral-950">ログイン</h1>
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

          <label className="flex flex-col gap-2 text-sm font-semibold text-neutral-800">
            パスワード
            <input
              className="h-11 rounded border border-neutral-300 bg-white px-3 text-base font-normal outline-none transition focus:border-neutral-950"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
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
            {isSubmitting ? "ログイン中..." : "ログイン"}
          </button>
        </form>
      </section>
    </main>
  );
}
