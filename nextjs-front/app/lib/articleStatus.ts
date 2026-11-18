import type { MyArticle } from "@/app/types/models";

/** 公開状態の呼び方。記事管理一覧の絞り込み・トグルと編集画面のバッジで同じ言葉を使う */
export const ARTICLE_STATUS_LABELS: Record<MyArticle["status"], string> = {
  published: "公開",
  draft: "非公開",
};

/**
 * 公開状態の配色。記事管理一覧のトグルと編集画面のバッジで同じ見た目にそろえる。
 * 公開は地と枠を同じ色で塗り（枠は外側に 2px）、非公開は 2px の破線の枠にする（枠は内側）。
 * 余白は使う側で決める。非公開は枠の分だけ 2px ずつ減らすと、2つの大きさがそろう。
 * Tailwindはソース中の文字列からクラスを拾うため、組み立てずに書き切る
 */
export const ARTICLE_STATUS_COLORS: Record<MyArticle["status"], string> = {
  published: "pixel-fill-2 text-green-700 [--pixel-c:var(--color-green-100)]",
  draft: "border-2 border-dashed border-gray-400 text-gray-600",
};
