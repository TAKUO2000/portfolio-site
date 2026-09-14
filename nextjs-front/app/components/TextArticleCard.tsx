import Link from "next/link";
import { formatPublishedDate } from "@/app/lib/formatDate";

interface TextArticleCardProps {
  title: string;
  author: string;
  href: string;
  summary?: string;
  publishedAt?: string;
}

/**
 * 画像を持たない記事カード。
 * 人気記事ランキングやアーカイブ一覧など、数を詰めて並べたい箇所で使う。
 */
export default function TextArticleCard({
  title,
  author,
  href,
  summary,
  publishedAt,
}: TextArticleCardProps) {
  return (
    <Link
      href={href}
      className="group block border-l-2 border-gray-300 pl-4 transition-colors hover:border-black"
    >
      <article>
        <h3 className="line-clamp-2 text-base font-bold leading-snug">
          {title}
        </h3>
        {summary && (
          <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-gray-700">
            {summary}
          </p>
        )}
        <p className="mt-2 truncate text-xs text-gray-500">
          {author}
          {publishedAt && ` ・ ${formatPublishedDate(publishedAt)}`}
        </p>
      </article>
    </Link>
  );
}
