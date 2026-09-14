import Image from "next/image";
import Link from "next/link";
import CategoryBox from "@/app/components/ui/CategoryBox";
import TagBox from "@/app/components/ui/TagBox";
import { formatPublishedDate } from "@/app/lib/formatDate";
import type { ArticleSummary } from "@/app/types/models";

interface PopularArticlesProps {
  id?: string;
  title: string;
  moreButtonHref: string;
  articles: readonly ArticleSummary[];
}

export default function PopularArticles({
  id,
  title,
  moreButtonHref,
  articles,
}: PopularArticlesProps) {
  return (
    <section id={id} className="bg-[#f4f1eb] px-6 py-20">
      <div className="mx-auto max-w-197.5">
        <div className="mb-10 flex justify-center">
          <h2 className="px-16 py-3 text-4xl font-bold">{title}</h2>
        </div>

        {articles.length === 0 ? (
          <p className="text-center text-base text-gray-500">
            まだ記事がありません。
          </p>
        ) : (
          <ol className="space-y-6">
            {articles.map((article) => (
              <li key={article.id}>
                <Link
                  href={`/articles/${article.id}`}
                  className="group relative grid overflow-hidden bg-white shadow-sm ring-1 ring-black/5 transition-shadow hover:shadow-lg md:grid-cols-[288px_1fr]"
                >
                  <article className="contents">
                    <div className="relative aspect-16/10 w-full bg-black md:aspect-auto md:h-45.5">
                      {article.header_image && (
                        <Image
                          src={article.header_image}
                          alt={article.title}
                          fill
                          sizes="(min-width: 768px) 288px, 100vw"
                          className="object-cover"
                        />
                      )}
                      <div className="absolute left-2 top-2 drop-shadow-sm">
                        <CategoryBox
                          category={article.category.name}
                          id={article.category.id}
                        />
                      </div>
                    </div>

                    <div className="flex min-w-0 flex-col p-5">
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

                      <h3 className="text-xl font-bold leading-tight md:text-2xl">
                        {article.title}
                      </h3>

                      {/* 右下のアイコンと重ならないよう余白を空ける */}
                      <p className="mt-2 line-clamp-2 flex-1 pr-28 text-base leading-relaxed text-gray-700">
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
                  </article>
                </Link>
              </li>
            ))}
          </ol>
        )}

        <div className="mt-12 flex justify-center">
          <Link
            href={moreButtonHref}
            className="bg-black px-14 py-4 text-sm font-bold text-white transition-opacity hover:opacity-80"
          >
            人気の投稿
          </Link>
        </div>
      </div>
    </section>
  );
}
