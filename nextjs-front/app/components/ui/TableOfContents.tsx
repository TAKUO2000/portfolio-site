import type { TocHeading } from "@/app/lib/articleMarkdown";

interface TableOfContentsProps {
  headings: TocHeading[];
}

const INDENT_BY_DEPTH = { 1: "", 2: "pl-3", 3: "pl-6" } as const;

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
