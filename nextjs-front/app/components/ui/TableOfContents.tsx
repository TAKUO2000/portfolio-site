"use client";

import type { TocHeading } from "@/app/lib/articleMarkdown";

interface TableOfContentsProps {
  headings: TocHeading[];
}

const INDENT_BY_DEPTH = { 1: "", 2: "pl-3", 3: "pl-6" } as const;

/**
 * 見出しまでなめらかにスクロールする。CSS の scroll-behavior をページ全体に付けると、リロードで位置が
 * 戻るときまでアニメーションするので、目次を押したときだけ自分でスクロールする
 */
function scrollToHeading(event: React.MouseEvent<HTMLAnchorElement>) {
  // 新しいタブで開く操作（Ctrl・Cmd・中クリックなど）は、ブラウザに任せる
  if (
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  ) {
    return;
  }

  const hash = event.currentTarget.hash;
  const target = document.getElementById(decodeURIComponent(hash.slice(1)));
  if (!target) return;

  event.preventDefault();
  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  // 止まる位置は、見出しの scroll-margin（記事ページの scroll-mt-8）に従う
  target.scrollIntoView({ behavior: reduceMotion ? "instant" : "smooth" });
  // リンクを普通にたどったときと同じく、URL に見出しを残す（見出しの位置を共有できるように）。
  // 同じ見出しを続けて押しても履歴は増やさない（増やすと「戻る」で前のページに戻れなくなる）
  if (window.location.hash !== hash) {
    history.pushState(null, "", hash);
  }
}

export default function TableOfContents({ headings }: TableOfContentsProps) {
  if (headings.length === 0) return null;

  return (
    <nav
      aria-label="目次"
      className="pixel-border-2 p-4 text-sm text-gray-500 [--pixel-c:var(--color-gray-500)]"
    >
      <p className="font-semibold mb-2">目次</p>
      {/* 見出しが多い記事でもいいねボタンが画面外に出ないよう、目次の中だけでスクロールさせる */}
      <ol className="max-h-[60vh] overflow-y-auto space-y-1.5">
        {headings.map((heading) => (
          <li key={heading.id} className={INDENT_BY_DEPTH[heading.depth]}>
            <a
              href={`#${encodeURIComponent(heading.id)}`}
              onClick={scrollToHeading}
              className="block wrap-break-word hover:text-foreground hover:underline"
            >
              {heading.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
