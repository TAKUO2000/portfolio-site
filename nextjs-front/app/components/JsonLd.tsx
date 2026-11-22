/**
 * 構造化データ（JSON-LD）を埋め込む。
 *
 * 記事のタイトルなど利用者が入力した値が入るため、「<」をエスケープして
 * </script> でスクリプトを閉じられないようにする
 */
export default function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
