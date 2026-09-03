/**
 * サーバーコンポーネントからAPIを呼ぶときのベースURLを返す。
 *
 * サーバーコンポーネントはコンテナ内部から実行されるため、Docker Compose環境では
 * ブラウザ向けのNEXT_PUBLIC_API_BASE_URL(localhost)ではなく、Docker内部名で解決できる
 * API_INTERNAL_BASE_URLを優先する。
 *
 * ブラウザから呼ぶ場合はNEXT_PUBLIC_API_BASE_URLを使う（app/auth/authClient.ts）。
 */
export function getApiBaseUrl(fallback = "http://localhost:8000"): string {
  return (
    process.env.API_INTERNAL_BASE_URL ??
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    fallback
  );
}
