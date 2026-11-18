import NormalButton from "@/app/components/ui/NormalButton";
import type { SortOrder } from "@/app/lib/articles";

interface ArticleSortSwitchProps {
  /** 今選ばれている並び順。押されているボタンの色を変えるのに使う */
  current: SortOrder;
}

const SORT_OPTIONS: { value: SortOrder; label: string }[] = [
  { value: "latest", label: "新着順" },
  { value: "popular", label: "人気順" },
];

/**
 * 記事一覧の並び替えボタン。
 *
 * 並び順はサーバー側で絞り込むため、stateではなくクエリパラメータを付け替える。
 * 遷移するだけなのでリンクとして描画し、新規タブで開く操作も効くようにしている。
 */
export default function ArticleSortSwitch({ current }: ArticleSortSwitchProps) {
  return (
    // ボタンの枠は外側に 2px ずつはみ出すので、その分より広く間を空ける
    <div className="flex gap-3 pl-0.5">
      {SORT_OPTIONS.map(({ value, label }) => (
        <NormalButton
          key={value}
          color={current === value ? "green" : "white"}
          buttonLabel={label}
          href={`/articles?sort=${value}`}
        />
      ))}
    </div>
  );
}
