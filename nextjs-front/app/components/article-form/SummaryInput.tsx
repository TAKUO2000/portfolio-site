"use client";

interface SummaryInputProps {
  summary: string;
  setSummary: (summary: string) => void;
}
// 後に記事本文から概要文を出力する機能追加予定なのでTitleInputとコンポーネント分けてます
export default function SummaryInput({
  summary,
  setSummary,
}: SummaryInputProps) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor="summary" className="text-sm font-medium text-gray-700">
        概要
      </label>
      <textarea
        id="summary"
        value={summary}
        onChange={(e) => setSummary(e.target.value)}
        rows={3}
        maxLength={255}
        placeholder="概要を入力（記事一覧の記事カード内に表示されます）"
        className="border border-gray-300 rounded px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
      />
    </div>
  );
}
