import { defaultSchema } from "rehype-sanitize";
import type { Schema } from "hast-util-sanitize";

// 手書きHTML(<img style="width:300px">等)での画像サイズ指定のみを許可するstyle値。
// styleを無条件に許可すると要素の隠蔽やクリックジャッキング等に悪用され得るため、
// レイアウト調整に必要なwidth/height(px・%)のみに絞り込む
const IMAGE_STYLE_PATTERN = /^((width|height):\s*\d+(\.\d+)?(px|%);?\s*){1,2}$/;

// 公開記事ページ・エディタプレビュー共通のベーススキーマ
export const markdownSanitizeSchema: Schema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    img: [
      ...(defaultSchema.attributes?.img ?? []),
      ["style", IMAGE_STYLE_PATTERN],
    ],
  },
};

// MarkdownEditorのプレビューは貼り付け画像をblob URLで表示するため、
// デフォルトで弾かれるblob:プロトコルをsrcのみ許可する。
// 公開記事ページでは不要なため、プレビュー専用スキーマとして分離する。
export const markdownPreviewSanitizeSchema: Schema = {
  ...markdownSanitizeSchema,
  protocols: {
    ...markdownSanitizeSchema.protocols,
    src: [...(markdownSanitizeSchema.protocols?.src ?? []), "blob"],
  },
};
