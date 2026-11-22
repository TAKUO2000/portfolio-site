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
    <aside className="fixed inset-x-0 bottom-0 z-40 flex flex-col gap-3 border-t-2 border-black/10 bg-background/95 px-4.5 pt-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom))] backdrop-blur md:sticky md:top-8 md:right-auto md:bottom-auto md:left-auto md:z-auto md:min-w-0 md:flex-1 md:gap-5 md:border-0 md:bg-transparent md:p-0.5 md:backdrop-blur-none">
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
            className="pixel-border-2 flex h-10 cursor-pointer items-center gap-2 px-4 text-sm text-gray-600 [--pixel-c:var(--color-gray-400)] md:hidden"
            onClick={() => setIsTocOpen((isOpen) => !isOpen)}
            aria-expanded={isTocOpen}
            aria-controls="article-toc"
          >
            目次
            {/* 開くと上に伸びるので、閉じているときは上向き、開いているときは下向きにする */}
            <span aria-hidden="true" className="text-[10px]">
              {isTocOpen ? "▼" : "▲"}
            </span>
          </button>
        )}
        <ArticleActionButtons
          articleId={articleId}
          likeCount={likeCount}
          className="ml-auto md:ml-0"
          hideMessageOnMobile={isTocOpen}
        />
      </div>
    </aside>
  );
}
