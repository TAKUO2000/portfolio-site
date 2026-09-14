import Image from "next/image";
import Link from "next/link";
import CategoryBox from "@/app/components/ui/CategoryBox";
import { formatPublishedDate } from "@/app/lib/formatDate";
import type { Category } from "@/app/types/models";

interface VerticalArticleCardProps {
  title: string;
  author: string;
  summary: string;
  image: string | null;
  href: string;
  category?: Category;
  publishedAt?: string;
  priority?: boolean;
}

/**
 * 画像を上、テキストを下に置く記事カード。
 * 1行に2〜3枚並べるグリッド表示（カテゴリ一覧や検索結果など）で使う。
 */
export default function VerticalArticleCard({
  title,
  author,
  summary,
  image,
  href,
  category,
  publishedAt,
  priority = false,
}: VerticalArticleCardProps) {
  return (
    <Link
      href={href}
      className="group flex flex-col gap-3 transition-opacity hover:opacity-80"
    >
      <article className="contents">
        <div className="relative aspect-16/10 w-full bg-black">
          {image && (
            <Image
              src={image}
              alt={title}
              fill
              sizes="(min-width: 768px) 33vw, 100vw"
              className="object-cover"
              priority={priority}
            />
          )}
        </div>

        <div className="min-w-0">
          {category && (
            <div className="mb-2">
              <CategoryBox category={category.name} id={category.id} />
            </div>
          )}
          <h3 className="line-clamp-2 text-lg font-bold leading-snug">
            {title}
          </h3>
          <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-black">
            {summary}
          </p>
          <p className="mt-3 truncate text-xs text-gray-500">
            {author}
            {publishedAt && ` ・ ${formatPublishedDate(publishedAt)}`}
          </p>
        </div>
      </article>
    </Link>
  );
}
