/**
 * APIが返すpublished_at(UTCのISO文字列)を「2026.09.14」表記にする。
 *
 * toLocaleDateStringはサーバーとブラウザで結果がずれてハイドレーション不一致に
 * なりうるため、日本時間へ手で寄せてから組み立てる。
 */
export function formatPublishedDate(publishedAt: string): string {
  const jst = new Date(new Date(publishedAt).getTime() + 9 * 60 * 60 * 1000);
  const month = String(jst.getUTCMonth() + 1).padStart(2, "0");
  const day = String(jst.getUTCDate()).padStart(2, "0");

  return `${jst.getUTCFullYear()}.${month}.${day}`;
}
