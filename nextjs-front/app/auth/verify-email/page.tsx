"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import {
  API_BASE_URL,
  getApiErrorMessage,
  getCsrfToken,
  getCurrentUser,
} from "../authClient";
import type { User } from "@/app/types/models";

// 登録の直後と、確認前にいいねしようとしたときに来る画面。確認メールの再送もここで行う
export default function VerifyEmail() {
  // undefinedは読み込み中、nullは未ログイン
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    let isActive = true;

    getCurrentUser().then((currentUser) => {
      if (isActive) setUser(currentUser);
    });

    return () => {
      isActive = false;
    };
  }, []);

  async function handleResend() {
    setErrorMessage("");
    setStatusMessage("");
    setIsSending(true);

    try {
      const xsrfToken = await getCsrfToken();
      const response = await fetch(
        `${API_BASE_URL}/api/email/verification-notification`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            Accept: "application/json",
            "X-Requested-With": "XMLHttpRequest",
            "X-XSRF-TOKEN": xsrfToken,
          },
        },
      );

      const responseBody = await response.json().catch(() => null);

      if (!response.ok) {
        setErrorMessage(
          getApiErrorMessage(
            response.status,
            responseBody,
            "確認メールを送れませんでした。",
          ),
        );
        return;
      }

      if (responseBody?.status === "already-verified") {
        setUser((current) => current && { ...current, email_verified: true });
        return;
      }

      setStatusMessage("確認メールを送り直しました。");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "送信処理中にエラーが発生しました。",
      );
    } finally {
      setIsSending(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f4f1eb] px-6 py-16">
      <section className="mx-auto flex w-full max-w-sm flex-col gap-8">
        <div className="space-y-2">
          <p className="text-sm font-semibold text-neutral-600">Verify email</p>
          <h1 className="text-3xl font-bold text-neutral-950">
            メールアドレスの確認
          </h1>
        </div>

        {user === undefined && (
          <p className="text-sm text-neutral-600">読み込み中...</p>
        )}

        {user === null && (
          <p className="text-sm text-neutral-600">
            確認メールを送り直すには、
            <Link
              className="font-semibold text-neutral-950 underline"
              href="/auth/sign-in"
            >
              ログイン
            </Link>
            してください。
          </p>
        )}

        {user?.email_verified === true && (
          <div className="flex flex-col gap-5">
            <p className="rounded border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
              メールアドレスは確認済みです。
            </p>
            <Link
              className="flex h-11 items-center justify-center rounded bg-neutral-950 px-4 text-sm font-semibold text-white transition hover:bg-neutral-800"
              href="/"
            >
              トップへ
            </Link>
          </div>
        )}

        {user && user.email_verified === false && (
          <div className="flex flex-col gap-5">
            <p className="text-sm text-neutral-700">
              <span className="font-semibold">{user.email}</span>
              に確認メールを送りました。メールのリンクを開くと、確認が終わります。確認が済むまで、いいねはできません。
            </p>

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
              type="button"
              onClick={handleResend}
              disabled={isSending}
            >
              {isSending ? "送信中..." : "確認メールを送り直す"}
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
