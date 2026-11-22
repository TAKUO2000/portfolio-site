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

export default function SignUp() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const xsrfToken = await getCsrfToken();
      const registerResponse = await fetch(`${API_BASE_URL}/api/register`, {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
          "X-XSRF-TOKEN": xsrfToken,
        },
        body: JSON.stringify({
          name,
          email,
          password,
          password_confirmation: passwordConfirmation,
        }),
      });

      if (!registerResponse.ok) {
        const responseBody = await registerResponse.json().catch(() => null);
        setErrorMessage(
          getApiErrorMessage(
            registerResponse.status,
            responseBody,
            "サインアップに失敗しました。入力内容を確認してください。",
          ),
        );
        return;
      }

      // 登録するとメールアドレスの確認メールが送られるので、確認を促す画面へ移る
      router.push("/auth/verify-email");
      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "サインアップ処理中にエラーが発生しました。",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthPage eyebrow="Sign up" title="サインアップ">
      <form className={AUTH_FORM} onSubmit={handleSubmit}>
        <label className={AUTH_LABEL}>
          名前
          <input
            className={AUTH_INPUT}
            type="text"
            autoComplete="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
        </label>

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
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>

        <label className={AUTH_LABEL}>
          パスワード確認
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
          {isSubmitting ? "サインアップ中..." : "サインアップ"}
        </button>
      </form>

      <p className="text-center text-sm text-neutral-600">
        すでにアカウントをお持ちですか？{" "}
        <Link className={AUTH_LINK} href="/auth/sign-in">
          サインイン
        </Link>
      </p>
    </AuthPage>
  );
}
