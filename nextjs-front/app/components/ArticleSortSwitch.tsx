"use client";

import { useRouter } from "next/navigation";
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
 */
export default function ArticleSortSwitch({ current }: ArticleSortSwitchProps) {
  const router = useRouter();

  return (
    <div className="flex gap-2">
      {SORT_OPTIONS.map(({ value, label }) => (
        <NormalButton
          key={value}
          color={current === value ? "green" : "white"}
          buttonLabel={label}
          onClick={() => router.push(`/articles?sort=${value}`)}
        />
      ))}
    </div>
  );
}
