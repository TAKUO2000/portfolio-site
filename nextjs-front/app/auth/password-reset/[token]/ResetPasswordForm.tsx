"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

import {
  API_BASE_URL,
  getApiErrorMessage,
  getCsrfToken,
} from "../../authClient";
import AuthPage from "@/app/auth/AuthPage";
import {
  AUTH_ERROR,
  AUTH_FORM,
  AUTH_INPUT,
  AUTH_LABEL,
  AUTH_SUBMIT,
  AUTH_SUCCESS,
} from "@/app/auth/authStyles";

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

    // 打ち間違いはサーバーに聞くまでもないので、送る前に止める
    if (password !== passwordConfirmation) {
      setErrorMessage("新しいパスワードと確認用のパスワードが違います。");
      return;
    }

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
    <AuthPage eyebrow="Reset password" title="新しいパスワードの設定">
      {isCompleted ? (
        <div className="flex flex-col gap-5.5">
          <p className={AUTH_SUCCESS}>
            パスワードを再設定しました。新しいパスワードでログインしてください。
          </p>
          <Link className={AUTH_SUBMIT} href="/auth/sign-in">
            ログイン画面へ
          </Link>
        </div>
      ) : (
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

          <label className={AUTH_LABEL}>
            新しいパスワード
            <input
              className={AUTH_INPUT}
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>

          <label className={AUTH_LABEL}>
            新しいパスワード（確認）
            <input
              className={AUTH_INPUT}
              type="password"
              autoComplete="new-password"
              value={passwordConfirmation}
              onChange={(event) => setPasswordConfirmation(event.target.value)}
              required
            />
          </label>

          {errorMessage && <p className={AUTH_ERROR}>{errorMessage}</p>}

          <button className={AUTH_SUBMIT} type="submit" disabled={isSubmitting}>
            {isSubmitting ? "設定中..." : "パスワードを再設定する"}
          </button>
        </form>
      )}
    </AuthPage>
  );
}
