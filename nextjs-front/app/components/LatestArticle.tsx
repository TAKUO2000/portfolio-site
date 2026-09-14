import Image from "next/image";
import Link from "next/link";
import CategoryBox from "@/app/components/ui/CategoryBox";
import TagBox from "@/app/components/ui/TagBox";
import { formatPublishedDate } from "@/app/lib/formatDate";
import type { ArticleSummary } from "@/app/types/models";

interface LatestArticleProps {
  id?: string;
  title: string;
  moreButtonHref: string;
  /** 記事が1件もないときはnull */
  article: ArticleSummary | null;
  ref?: React.Ref<HTMLDivElement>;
}

export default function LatestArticle({
  id,
  title,
  moreButtonHref,
  article,
}: LatestArticleProps) {
  return (
    <section id={id} className="bg-[#f4f1eb] px-6 py-20">
      <div className="mx-auto max-w-197.5">
        <div className="mb-10 flex justify-center">
          <h2 className="text-4xl font-bold">{title}</h2>
        </div>
        {article ? (
          <article>
            <Link
              href={`/articles/${article.id}`}
              className="group relative grid overflow-hidden bg-white shadow-sm ring-1 ring-black/5 transition-shadow hover:shadow-lg md:grid-cols-2"
            >
              <div className="relative aspect-16/10 w-full bg-black">
                {article.header_image && (
                  <Image
                    src={article.header_image}
                    alt={article.title}
                    fill
                    sizes="(min-width: 768px) 395px, 100vw"
                    className="object-cover"
                    priority
                  />
                )}
                <div className="absolute left-2 top-2 drop-shadow-sm">
                  <CategoryBox
                    category={article.category.name}
                    id={article.category.id}
                  />
                </div>
              </div>

              <div className="flex min-w-0 flex-col p-5 md:p-6">
                {/* タグは左、著者・日付・♡は右上に寄せる */}
                <div className="mb-1.5 flex min-h-6 items-start justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-y-1">
                    {article.tags.slice(0, 3).map((tag) => (
                      <TagBox key={tag.id} tag={tag.name} id={tag.id} />
                    ))}
                  </div>
                  <p className="shrink-0 whitespace-nowrap text-xs text-gray-500">
                    {article.user.name} ・{" "}
                    {formatPublishedDate(article.published_at)} ・ ♡{" "}
                    {article.like_count}
                  </p>
                </div>

                {/* 最新記事は主役なので、人気記事のカードより一段大きくする */}
                <h3 className="text-2xl font-bold leading-tight md:text-3xl">
                  {article.title}
                </h3>

                {/* 右下のアイコンと重ならないよう余白を空ける */}
                <p className="mt-2 line-clamp-3 flex-1 pr-28 text-base leading-relaxed text-gray-700 md:line-clamp-4">
                  {article.summary}
                </p>
              </div>

              {/* クリックで詳細へ飛ぶことを示す。ホバーでラベルが開く */}
              <span
                aria-hidden
                className="absolute bottom-3 right-4 flex items-center gap-1 text-xs text-gray-500 transition-colors group-hover:text-foreground"
              >
                <span className="max-w-0 overflow-hidden whitespace-nowrap transition-all duration-300 group-hover:max-w-20">
                  記事を読む
                </span>
                <span className="transition-transform duration-200 group-hover:translate-x-0.5">
                  →
                </span>
              </span>
            </Link>
          </article>
        ) : (
          <p className="text-center text-base text-gray-500">
            まだ記事がありません。
          </p>
        )}
      </div>

      <div className="mt-12 flex justify-center">
        <a
          href={moreButtonHref}
          className="bg-black px-14 py-4 text-sm font-bold text-white transition-opacity hover:opacity-80"
        >
          最近の投稿
        </a>
      </div>
    </section>
  );
}
