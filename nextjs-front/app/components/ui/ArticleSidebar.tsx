"use client";

import clsx from "clsx";
import { useState } from "react";
import ArticleActionButtons from "@/app/components/ui/ArticleActionButtons";
import TableOfContents from "@/app/components/ui/TableOfContents";
import type { TocHeading } from "@/app/lib/articleMarkdown";

interface ArticleSidebarProps {
  headings: TocHeading[];
  articleId: number;
  likeCount: number;
}

// md以上は本文の右に固定する目次といいね。md未満は画面の下に固定したバーにし、目次はボタンで開閉する
export default function ArticleSidebar({
  headings,
  articleId,
  likeCount,
}: ArticleSidebarProps) {
  // スマホ幅での目次の開閉。md以上では常に表示するので使わない
  const [isTocOpen, setIsTocOpen] = useState(false);
  const hasToc = headings.length > 0;

  // 目次の見出しへ移動したら、本文が隠れたままにならないよう閉じる
  const closeTocOnNavigate = (event: React.MouseEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest("a")) {
      setIsTocOpen(false);
    }
  };

  return (
    <aside className="fixed inset-x-0 bottom-0 z-40 flex flex-col gap-3 border-t border-black/10 bg-background/95 px-4 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] backdrop-blur md:sticky md:top-8 md:right-auto md:bottom-auto md:left-auto md:z-auto md:w-1/5 md:shrink-0 md:gap-4 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
      {hasToc && (
        <div
          id="article-toc"
          onClick={closeTocOnNavigate}
          className={clsx(!isTocOpen && "hidden", "md:block")}
        >
          <TableOfContents headings={headings} />
        </div>
      )}
      <div className="flex items-center justify-between gap-3 md:block">
        {hasToc && (
          <button
            type="button"
            className="flex items-center gap-2 rounded-full border border-gray-400 px-4 py-2 text-sm font-semibold text-gray-600 transition-opacity hover:opacity-70 md:hidden"
            onClick={() => setIsTocOpen((isOpen) => !isOpen)}
            aria-expanded={isTocOpen}
            aria-controls="article-toc"
          >
            目次
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className={clsx(
                "size-4 transition-transform",
                isTocOpen && "rotate-180",
              )}
              aria-hidden="true"
            >
              {/* 開くと上に伸びるので、閉じているときは上向きの矢印にする */}
              <path d="M6 15l6-6 6 6" />
            </svg>
          </button>
        )}
        <ArticleActionButtons
          articleId={articleId}
          likeCount={likeCount}
          className="ml-auto md:ml-0"
        />
      </div>
    </aside>
  );
}
