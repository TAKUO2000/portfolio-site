/**
 * サイトのURL（末尾スラッシュなし）を返す。canonical・サイトマップ・構造化データの絶対URLに使う。
 *
 * 本番のビルドではSITE_URLが必須（next.config.ts）。開発中に未設定のときはlocalhostにする。
 */
export function getSiteUrl(): string {
  return (process.env.SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
}

/**
 * 検索エンジンに載せてよい環境かどうか。Vercelの本番（Production）だけtrueにする。
 *
 * ステージング（stg.takuosblog.com）はVercelのPreviewに独自ドメインを割り当てているため、
 * Vercelが *.vercel.app に自動で付ける noindex が付かない。こちらで載せないようにする。
 * SITE_URLの値では判定しない（Previewに本番の値を入れ間違えても、検索に出ないようにするため）
 */
export function isIndexable(): boolean {
  return process.env.VERCEL_ENV === "production";
}
