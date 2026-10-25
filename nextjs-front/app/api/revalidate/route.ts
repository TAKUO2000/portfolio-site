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

  // 接頭辞の無い「Authorization: <secret>」は受け付けない
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ")
    ? header.slice("Bearer ".length)
    : "";
  if (!matchesSecret(token, secret)) {
    return Response.json({ revalidated: false }, { status: 401 });
  }

  // 古いページを残したまま作り直させる（次の1回は古いページを返し、裏で作り直す）。
  // { expire: 0 } で古いページを捨てると、作り直しの瞬間にAPIが落ちていたとき
  // 出せるページが無くなり500になる。"max" なら前のページを出し続けられる
  revalidateTag(ARTICLES_CACHE_TAG, "max");

  return Response.json({ revalidated: true });
}

/** 比べるのにかかる時間からシークレットを推測されないよう、長さを揃えて定数時間で比べる */
function matchesSecret(token: string, secret: string): boolean {
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(token), digest(secret));
}
