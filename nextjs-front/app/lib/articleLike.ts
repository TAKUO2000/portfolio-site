"use client";

import { API_BASE_URL, getCsrfToken } from "@/app/auth/authClient";

/**
 * 記事詳細のいいねボタンから呼ぶAPI。
 *
 * いいねはログイン必須で、Cookieのセッションで認証する。
 * 記事詳細はサーバーコンポーネントで取得していてログイン状態を持たないため、
 * 自分がいいね済みかはブラウザから別に取りに行く。
 */

export interface LikeStatus {
  liked: boolean;
  like_count: number;
}

/** メールアドレスを確認していないユーザーがいいねしようとしたとき(409)のエラー */
export class EmailNotVerifiedError extends Error {
  constructor() {
    super("メールアドレスの確認が済んでいません。");
    this.name = "EmailNotVerifiedError";
  }
}

const JSON_HEADERS = {
  Accept: "application/json",
  "X-Requested-With": "XMLHttpRequest",
};

function likeUrl(articleId: number): string {
  return `${API_BASE_URL}/api/articles/${articleId}/like`;
}

/** 未ログイン(401)はnullを返し、呼び出し側でログインへの案内に切り替えられるようにする */
export async function fetchLikeStatus(
  articleId: number,
): Promise<LikeStatus | null> {
  const response = await fetch(likeUrl(articleId), {
    credentials: "include",
    headers: JSON_HEADERS,
  });

  if (response.status === 401) return null;
  if (!response.ok) throw new Error("いいねの状態を取得できませんでした。");

  return (await response.json()).data;
}

/** liked=trueでいいね、falseで取り消し。何度呼んでも結果は同じになる */
export async function setLike(
  articleId: number,
  liked: boolean,
): Promise<LikeStatus> {
  const xsrfToken = await getCsrfToken();
  const response = await fetch(likeUrl(articleId), {
    method: liked ? "POST" : "DELETE",
    credentials: "include",
    headers: { ...JSON_HEADERS, "X-XSRF-TOKEN": xsrfToken },
  });

  if (response.status === 409) throw new EmailNotVerifiedError();
  if (!response.ok) throw new Error("いいねできませんでした。");

  return (await response.json()).data;
}
