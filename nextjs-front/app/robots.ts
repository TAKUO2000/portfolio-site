import type { MetadataRoute } from "next";

import { getSiteUrl, isIndexable } from "@/app/lib/site";

export default function robots(): MetadataRoute.Robots {
  // 本番以外（ステージング・プレビュー）は全体を巡回させない
  if (!isIndexable()) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }

  // ログインや記事の管理のページはここでDisallowにしない。巡回を止めると、
  // 各ページに付けた noindex を検索エンジンが読めなくなるため
  return {
    rules: { userAgent: "*", allow: "/", disallow: "/api/" },
    sitemap: `${getSiteUrl()}/sitemap.xml`,
  };
}
