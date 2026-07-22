"use client";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

type ValidationErrors = Record<string, string[]>;

function getCookie(name: string): string | null {
  const cookie = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`));

  if (!cookie) {
    return null;
  }

  return decodeURIComponent(cookie.split("=")[1]);
}

export async function getCsrfToken(): Promise<string> {
  const csrfResponse = await fetch(`${API_BASE_URL}/sanctum/csrf-cookie`, {
    credentials: "include",
    headers: {
      Accept: "application/json",
      "X-Requested-With": "XMLHttpRequest",
    },
  });

  if (!csrfResponse.ok) {
    throw new Error("CSRF Cookie の取得に失敗しました。");
  }

  const xsrfToken = getCookie("XSRF-TOKEN");

  if (!xsrfToken) {
    throw new Error("XSRF-TOKEN Cookie が見つかりません。");
  }

  return xsrfToken;
}

export function getApiErrorMessages( // バックエンドからの複数のerrorが配列で返却
  status: number,
  response: unknown,
  fallbackMessage: string,
): string[] {
  if (
    response &&
    typeof response === "object" &&
    "errors" in response &&
    response.errors &&
    typeof response.errors === "object"
  ) {
    const errors = response.errors as ValidationErrors;
    const messages = Object.values(errors).flat();

    if (messages.length > 0) {
      return messages;
    }
  }

  if (
    response &&
    typeof response === "object" &&
    "message" in response &&
    typeof response.message === "string"
  ) {
    return [response.message];
  }

  if (status === 419) {
    return [
      "セッションの確認に失敗しました。ページを再読み込みしてもう一度お試しください。",
    ];
  }

  return [fallbackMessage];
}

export function getApiErrorMessage(
  status: number,
  response: unknown,
  fallbackMessage: string,
): string {
  return getApiErrorMessages(status, response, fallbackMessage)[0];
}
