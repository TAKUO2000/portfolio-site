import { createHash, timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";

import { ARTICLES_CACHE_TAG } from "@/app/lib/articles";

/**
 * 記事一覧のキャッシュを捨てる。記事の公開・更新・削除のあとにAPI（Laravel）から呼ばれる。
 *
 * 誰でも呼べるとキャッシュを捨て続けられてしまうため、REVALIDATE_SECRETを
 * Bearerトークンとして送ってもらい、一致したときだけ受け付ける。
 */
export async function POST(request: Request) {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret) {
    console.error(
      "REVALIDATE_SECRETが設定されていないため、再検証を受け付けません。",
    );
    return Response.json({ revalidated: false }, { status: 500 });
  }

  const token =
    request.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  if (!matchesSecret(token, secret)) {
    return Response.json({ revalidated: false }, { status: 401 });
  }

  // アクセスの少ないサイトなので、古いページを1回返すより、次の1人目に待ってもらう方を選ぶ。
  // 記事を公開した直後にトップを開いても、新しい記事が出るようにするため
  revalidateTag(ARTICLES_CACHE_TAG, { expire: 0 });

  return Response.json({ revalidated: true });
}

/** 比べるのにかかる時間からシークレットを推測されないよう、長さを揃えて定数時間で比べる */
function matchesSecret(token: string, secret: string): boolean {
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(token), digest(secret));
}
