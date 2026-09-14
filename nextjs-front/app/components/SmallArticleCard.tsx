import Image from "next/image";
import Link from "next/link";
import { formatPublishedDate } from "@/app/lib/formatDate";

interface SmallArticleCardProps {
  title: string;
  author: string;
  image: string | null;
  href: string;
  publishedAt?: string;
}

/**
 * 幅の狭い場所に並べる記事カード。
 * サイドバーや記事詳細の「関連記事」など、概要文まで置く余裕がない箇所で使う。
 */
export default function SmallArticleCard({
  title,
  author,
  image,
  href,
  publishedAt,
}: SmallArticleCardProps) {
  return (
    <Link
      href={href}
      className="group flex gap-3 transition-opacity hover:opacity-80"
    >
      <article className="contents">
        <div className="relative aspect-3/2 w-24 shrink-0 bg-black sm:w-28">
          {image && (
            <Image
              src={image}
              alt={title}
              fill
              sizes="112px"
              className="object-cover"
            />
          )}
        </div>

        <div className="min-w-0">
          <h3 className="line-clamp-2 text-sm font-bold leading-snug">
            {title}
          </h3>
          <p className="mt-1 truncate text-xs text-gray-500">
            {author}
            {publishedAt && ` ・ ${formatPublishedDate(publishedAt)}`}
          </p>
        </div>
      </article>
    </Link>
  );
}
