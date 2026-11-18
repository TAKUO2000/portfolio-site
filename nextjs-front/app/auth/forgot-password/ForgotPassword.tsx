"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

import { API_BASE_URL, getApiErrorMessage, getCsrfToken } from "../authClient";
import AuthPage from "@/app/auth/AuthPage";
import {
  AUTH_ERROR,
  AUTH_FORM,
  AUTH_INPUT,
  AUTH_LABEL,
  AUTH_LINK,
  AUTH_SUBMIT,
  AUTH_SUCCESS,
} from "@/app/auth/authStyles";

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
    <AuthPage
      eyebrow="Forgot password"
      title="パスワードの再設定"
      description="登録したメールアドレスを入力してください。パスワード再設定用のURLをメールでお送りします。"
    >
      <form className={AUTH_FORM} onSubmit={handleSubmit}>
        <label className={AUTH_LABEL}>
          メールアドレス
          <input
            className={AUTH_INPUT}
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>

        {errorMessage && <p className={AUTH_ERROR}>{errorMessage}</p>}

        {statusMessage && <p className={AUTH_SUCCESS}>{statusMessage}</p>}

        <button className={AUTH_SUBMIT} type="submit" disabled={isSubmitting}>
          {isSubmitting ? "送信中..." : "再設定用メールを送る"}
        </button>
      </form>

      <p className="text-center text-sm text-neutral-600">
        <Link className={AUTH_LINK} href="/auth/sign-in">
          ログインに戻る
        </Link>
      </p>
    </AuthPage>
  );
}
