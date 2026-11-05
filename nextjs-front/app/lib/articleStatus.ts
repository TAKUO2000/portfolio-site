import type { MyArticle } from "@/app/types/models";

/** 公開状態の呼び方。記事管理一覧の絞り込み・トグルと編集画面のバッジで同じ言葉を使う */
export const ARTICLE_STATUS_LABELS: Record<MyArticle["status"], string> = {
  published: "公開",
  draft: "非公開",
};

/**
 * 公開状態の配色。記事管理一覧のトグルと編集画面のバッジで同じ見た目にそろえる。
 * Tailwindはソース中の文字列からクラスを拾うため、組み立てずに書き切る
 */
export const ARTICLE_STATUS_COLORS: Record<MyArticle["status"], string> = {
  published: "bg-green-100 text-green-700",
  draft: "border border-dashed border-gray-400 text-gray-600",
};
