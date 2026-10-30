import clsx from "clsx";
import type { TocHeading } from "@/app/lib/articleMarkdown";

interface TableOfContentsProps {
  headings: TocHeading[];
  className?: string;
}

const INDENT_BY_DEPTH = { 1: "", 2: "pl-3", 3: "pl-6" } as const;

export default function TableOfContents({
  headings,
  className,
}: TableOfContentsProps) {
  if (headings.length === 0) return null;

  return (
    <nav
      aria-label="目次"
      className={clsx("border rounded p-4 text-sm text-gray-500", className)}
    >
      <p className="font-semibold mb-2">目次</p>
      {/* 見出しが多い記事でもいいねボタンが画面外に出ないよう、目次の中だけでスクロールさせる */}
      <ol className="max-h-[60vh] overflow-y-auto space-y-1.5">
        {headings.map((heading) => (
          <li key={heading.id} className={INDENT_BY_DEPTH[heading.depth]}>
            <a
              href={`#${encodeURIComponent(heading.id)}`}
              className="block hover:text-blue-500 transition-colors duration-150 wrap-break-word"
            >
              {heading.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
