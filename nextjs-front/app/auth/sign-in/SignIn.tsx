"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { API_BASE_URL, getApiErrorMessage, getCsrfToken } from "../authClient";
import AuthPage from "@/app/auth/AuthPage";
import {
  AUTH_ERROR,
  AUTH_FORM,
  AUTH_INPUT,
  AUTH_LABEL,
  AUTH_LINK,
  AUTH_SUBMIT,
} from "@/app/auth/authStyles";

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
    <AuthPage eyebrow="Sign in" title="ログイン">
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
          パスワード
          <input
            className={AUTH_INPUT}
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>

        {errorMessage && <p className={AUTH_ERROR}>{errorMessage}</p>}

        <button className={AUTH_SUBMIT} type="submit" disabled={isSubmitting}>
          {isSubmitting ? "ログイン中..." : "ログイン"}
        </button>
      </form>

      <div className="space-y-3">
        <p className="text-center text-sm text-neutral-600">
          <Link className={AUTH_LINK} href="/auth/forgot-password">
            パスワードを忘れた方はこちら
          </Link>
        </p>
        {/* 会員登録のページの「すでにアカウントをお持ちですか？ ログイン」と同じ見た目にそろえる */}
        <p className="text-center text-sm text-neutral-600">
          アカウントをお持ちでない方は{" "}
          <Link className={AUTH_LINK} href="/auth/sign-up">
            新規登録
          </Link>
        </p>
      </div>
    </AuthPage>
  );
}
