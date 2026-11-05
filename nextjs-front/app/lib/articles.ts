import { notFound } from "next/navigation";

import { getApiBaseUrl } from "@/app/lib/apiBaseUrl";
import type { ArticleDetail, ArticleIndexResponse } from "@/app/types/models";

export type SortOrder = "latest" | "popular";

/**
 * 記事一覧のキャッシュに付けるタグ。記事が公開・更新・削除されると、
 * APIから app/api/revalidate が呼ばれ、このタグのキャッシュを捨てる
 */
export const ARTICLES_CACHE_TAG = "articles";

/**
 * 記事一覧のキャッシュを時間で作り直す間隔（秒）。
 * いいねでは再検証を呼ばないため、人気順やいいね数はこの間隔で追いつく
 */
const ARTICLES_REVALIDATE_SECONDS = 3600;

/** クエリ文字列など外から来た値をsortに落とす。未知の値は既定のlatestにする */
export function toSortOrder(value: string | undefined): SortOrder {
  return value === "popular" ? "popular" : "latest";
}

/**
 * 公開記事の一覧を取得する。
 *
 * サーバーコンポーネントからの利用を想定している。結果はNext.jsのデータキャッシュに載せ、
 * 記事の変更時（タグによる再検証）と一定時間ごとに取り直す。
 */
export async function fetchArticles({
  sort,
  perPage,
}: {
  sort: SortOrder;
  perPage?: number;
}): Promise<ArticleIndexResponse> {
  const params = new URLSearchParams({ sort });
  if (perPage !== undefined) {
    params.set("per_page", String(perPage));
  }

  const res = await fetch(`${getApiBaseUrl()}/api/articles?${params}`, {
    headers: { Accept: "application/json" },
    next: {
      tags: [ARTICLES_CACHE_TAG],
      revalidate: ARTICLES_REVALIDATE_SECONDS,
    },
  });

  if (!res.ok) {
    throw new Error(`記事一覧の取得に失敗しました。(status: ${res.status})`);
  }

  return res.json();
}

/**
 * 公開記事を1件取得する。
 *
 * 記事ページの本体とgenerateMetadataの両方から呼ぶ。同じURL・オプションのfetchは
 * 1回の表示の中で結果が共有されるため、APIへのリクエストは1回で済む。
 * 存在しない記事や下書き（APIが404を返す）はエラー画面ではなく404にする。
 */
export async function fetchArticle(id: string): Promise<ArticleDetail> {
  // idはURLから来る値。「../tags」のような値をそのままパスに入れるとAPIの別の口を呼べてしまうので、
  // 数字だけを通す（APIも数字以外は404にしている）
  if (!/^\d+$/.test(id)) {
    notFound();
  }

  const res = await fetch(`${getApiBaseUrl()}/api/articles/${id}`, {
    headers: { Accept: "application/json" },
  });

  if (res.status === 404) {
    notFound();
  }
  if (!res.ok) {
    throw new Error(`記事の取得に失敗しました。(status: ${res.status})`);
  }
  return (await res.json()).data;
}
