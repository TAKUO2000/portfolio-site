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
import AuthPage from "@/app/auth/AuthPage";
import {
  AUTH_ERROR,
  AUTH_LINK,
  AUTH_SUBMIT,
  AUTH_SUCCESS,
} from "@/app/auth/authStyles";

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

      // 別のタブやスマホで確認リンクを開いたあとに再送を押した場合。送らずに、確認済みの表示に切り替える
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
    <AuthPage eyebrow="Verify email" title="メールアドレスの確認">
      {user === undefined && (
        <p className="text-sm text-neutral-600">読み込み中...</p>
      )}

      {user === null && (
        <p className="text-sm text-neutral-600">
          確認メールを送り直すには、
          <Link className={AUTH_LINK} href="/auth/sign-in">
            ログイン
          </Link>
          してください。
        </p>
      )}

      {user?.email_verified === true && (
        <div className="flex flex-col gap-5.5">
          <p className={AUTH_SUCCESS}>メールアドレスは確認済みです。</p>
          <Link className={AUTH_SUBMIT} href="/">
            トップへ
          </Link>
        </div>
      )}

      {user && user.email_verified === false && (
        <div className="flex flex-col gap-5.5">
          <p className="text-sm text-neutral-700">
            <span className="text-neutral-950">{user.email}</span>
            に確認メールを送りました。メールのリンクを開くと、確認が終わります。確認が済むまで、いいねはできません。
          </p>

          <button
            className={AUTH_SUBMIT}
            type="button"
            onClick={handleResend}
            disabled={isSending}
          >
            {isSending ? "送信中..." : "確認メールを送り直す"}
          </button>

          {/* 結果はボタンの下に出す。送り直すたびに前の結果を消して出し直すので、
              ボタンの上に置くと、消えた間だけボタンが上にずれる */}
          {errorMessage && <p className={AUTH_ERROR}>{errorMessage}</p>}

          {statusMessage && <p className={AUTH_SUCCESS}>{statusMessage}</p>}
        </div>
      )}
    </AuthPage>
  );
}
