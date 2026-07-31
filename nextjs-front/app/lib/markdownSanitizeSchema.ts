import { defaultSchema } from "rehype-sanitize";
import type { Schema } from "hast-util-sanitize";

// 公開記事ページ・エディタプレビュー共通のベーススキーマ
export const markdownSanitizeSchema: Schema = {
  ...defaultSchema,
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
