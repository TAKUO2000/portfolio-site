"use client";

import {
  API_BASE_URL,
  getApiErrorMessage,
  getCsrfToken,
} from "@/app/auth/authClient";
import type { MyArticle, MyArticleIndexResponse } from "@/app/types/models";

/**
 * 記事管理画面から呼ぶAPI（一覧・公開状態の切り替え・削除）。
 *
 * ログイン中のユーザーの記事を扱うため、Cookieのセッションで認証する。
 * サーバーコンポーネントからは呼べないので、ブラウザ向けのAPI_BASE_URLを使う。
 */

/** 失敗したときのステータスを持たせ、呼び出し側が404などで振る舞いを変えられるようにする */
export class MyArticleApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

/**
 * Laravelが返す401/403/404の文言は英語の定型文なので、画面向けの言い回しに置き換える。
 * それ以外（419や422など）はサーバーの文言を優先する。
 */
async function toApiError(
  response: Response,
  fallbackMessage: string,
): Promise<MyArticleApiError> {
  switch (response.status) {
    case 401:
      return new MyArticleApiError(
        "ログインの有効期限が切れました。再度ログインしてください。",
        401,
      );
    case 403:
      return new MyArticleApiError("この記事を操作する権限がありません。", 403);
    case 404:
      return new MyArticleApiError(
        "記事が見つかりません。すでに削除された可能性があります。",
        404,
      );
  }

  const body = await response.json().catch(() => null);
  return new MyArticleApiError(
    getApiErrorMessage(response.status, body, fallbackMessage),
    response.status,
  );
}

const JSON_HEADERS = {
  Accept: "application/json",
  "X-Requested-With": "XMLHttpRequest",
};

export interface FetchMyArticlesParams {
  status?: MyArticle["status"];
  keyword?: string;
  page: number;
  perPage: number;
}

/** GET /api/articles/mine */
export async function fetchMyArticles({
  status,
  keyword,
  page,
  perPage,
}: FetchMyArticlesParams): Promise<MyArticleIndexResponse> {
  const params = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
  });
  if (status) params.set("status", status);
  if (keyword) params.set("keyword", keyword);

  const response = await fetch(`${API_BASE_URL}/api/articles/mine?${params}`, {
    credentials: "include",
    headers: JSON_HEADERS,
  });

  if (!response.ok) {
    throw await toApiError(
      response,
      "記事一覧の取得に失敗しました。ページを再読み込みしてください。",
    );
  }

  return response.json();
}

/** PATCH /api/articles/{id}/status */
export async function updateMyArticleStatus(
  id: number,
  status: MyArticle["status"],
): Promise<MyArticle> {
  const xsrfToken = await getCsrfToken();
  const response = await fetch(`${API_BASE_URL}/api/articles/${id}/status`, {
    method: "PATCH",
    credentials: "include",
    headers: {
      ...JSON_HEADERS,
      "Content-Type": "application/json",
      "X-XSRF-TOKEN": xsrfToken,
    },
    body: JSON.stringify({ status }),
  });

  if (!response.ok) {
    throw await toApiError(response, "公開状態の切り替えに失敗しました。");
  }

  return (await response.json()).data;
}

/** DELETE /api/articles/{id} */
export async function deleteMyArticle(id: number): Promise<void> {
  const xsrfToken = await getCsrfToken();
  const response = await fetch(`${API_BASE_URL}/api/articles/${id}`, {
    method: "DELETE",
    credentials: "include",
    headers: { ...JSON_HEADERS, "X-XSRF-TOKEN": xsrfToken },
  });

  if (!response.ok) {
    throw await toApiError(response, "記事の削除に失敗しました。");
  }
}
