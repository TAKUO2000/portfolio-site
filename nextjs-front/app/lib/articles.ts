import { getApiBaseUrl } from "@/app/lib/apiBaseUrl";
import type { ArticleIndexResponse } from "@/app/types/models";

export type SortOrder = "latest" | "popular";

/** クエリ文字列など外から来た値をsortに落とす。未知の値は既定のlatestにする */
export function toSortOrder(value: string | undefined): SortOrder {
  return value === "popular" ? "popular" : "latest";
}

/**
 * 公開記事の一覧を取得する。
 *
 * サーバーコンポーネントからの利用を想定しているため、fetchのキャッシュ設定は
 * Next.jsの既定（都度取得）に任せている。
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
  });

  if (!res.ok) {
    throw new Error(`記事一覧の取得に失敗しました。(status: ${res.status})`);
  }

  return res.json();
}
