"use client";

export type PageItem = number | "ellipsis";

/**
 * ページ送りに並べるページ番号を決める。
 *
 * 先頭・末尾と、今のページの前後1ページを出し、間は「…」で詰める。
 * 端にいるときも3ページ分は並ぶよう、表示範囲を内側へずらす（例: 1 2 3 … 12）。
 * 「…」が1ページ分しか隠さない場合は、記号より番号を出した方が短いので番号にする。
 */
export function getPageItems(current: number, last: number): PageItem[] {
  const start = Math.max(1, Math.min(current - 1, last - 2));
  const end = Math.min(last, Math.max(current + 1, 3));

  const pages = new Set([1, last]);
  for (let page = start; page <= end; page++) pages.add(page);
  const sorted = [...pages].sort((a, b) => a - b);

  const items: PageItem[] = [];
  sorted.forEach((page, index) => {
    const prev = sorted[index - 1];
    if (prev !== undefined) {
      if (page - prev === 2) items.push(prev + 1);
      else if (page - prev > 2) items.push("ellipsis");
    }
    items.push(page);
  });

  return items;
}

interface PaginationProps {
  currentPage: number;
  lastPage: number;
  onChange: (page: number) => void;
}

export default function Pagination({
  currentPage,
  lastPage,
  onChange,
}: PaginationProps) {
  const arrowClass =
    "cursor-pointer px-2 py-1.5 text-sm text-gray-700 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30";

  return (
    <nav
      aria-label="ページ送り"
      // ページ番号の枠は外側に 2px ずつはみ出すので、その分より広く間を空ける
      className="flex items-center justify-center gap-2 sm:gap-2.5"
    >
      <button
        type="button"
        className={arrowClass}
        disabled={currentPage <= 1}
        onClick={() => onChange(currentPage - 1)}
        aria-label="前のページ"
      >
        ◀
      </button>

      {getPageItems(currentPage, lastPage).map((item, index) =>
        item === "ellipsis" ? (
          // 「…」は位置で決まるので、indexをkeyにしても入れ替わりは起きない
          <span
            key={`ellipsis-${index}`}
            className="px-1 text-sm text-gray-500"
          >
            …
          </span>
        ) : (
          <button
            key={item}
            type="button"
            onClick={() => onChange(item)}
            aria-current={item === currentPage ? "page" : undefined}
            className={`pixel-border-2 h-8 min-w-8 cursor-pointer px-2 text-sm ${
              item === currentPage
                ? "bg-green-600 text-white [--pixel-c:var(--color-green-600)]"
                : "pixel-press-sm bg-white text-gray-700 [--pixel-c:var(--color-gray-300)]"
            }`}
          >
            {item}
          </button>
        ),
      )}

      <button
        type="button"
        className={arrowClass}
        disabled={currentPage >= lastPage}
        onClick={() => onChange(currentPage + 1)}
        aria-label="次のページ"
      >
        ▶
      </button>
    </nav>
  );
}
