import type { MetadataRoute } from "next";

import { fetchAllArticles } from "@/app/lib/articles";
import { getSiteUrl } from "@/app/lib/site";

/**
 * トップ・記事一覧・公開している記事を載せる。
 *
 * 記事はfetchArticlesと同じタグ付きのキャッシュで取るので、記事の公開・更新・削除
 * （app/api/revalidate）と一定時間ごとに作り直される。
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const articles = await fetchAllArticles();

  // トップと記事一覧は、いちばん新しく変わった記事の日時を最終更新日にする（ISO 8601のUTCなので文字列で比べられる）
  const latestModified = articles
    .map((article) => article.updated_at)
    .sort()
    .at(-1);

  return [
    { url: siteUrl, lastModified: latestModified },
    { url: `${siteUrl}/articles`, lastModified: latestModified },
    ...articles.map((article) => ({
      url: `${siteUrl}/articles/${article.id}`,
      lastModified: article.updated_at,
    })),
  ];
}
