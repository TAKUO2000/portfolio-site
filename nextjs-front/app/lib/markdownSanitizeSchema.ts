import { defaultSchema } from "rehype-sanitize";
import type { Schema } from "hast-util-sanitize";

// rehype-rawで許可した生HTML（<div style="..."> 等）のうち、
// styleによるレイアウト調整（画像の幅指定など）だけを許可するスキーマ
export const markdownSanitizeSchema: Schema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    "*": [...(defaultSchema.attributes?.["*"] ?? []), "style"],
  },
  protocols: {
    ...defaultSchema.protocols,
    // MarkdownEditorのプレビューは貼り付け画像をblob URLで表示するため、
    // デフォルトで弾かれるblob:プロトコルをsrcのみ許可する
    src: [...(defaultSchema.protocols?.src ?? []), "blob"],
  },
};
