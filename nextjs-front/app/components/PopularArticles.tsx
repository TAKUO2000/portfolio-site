import Image from "next/image";
import Link from "next/link";
import { ArticleMeta } from "@/app/components/ArticleCard";
import CategoryBox from "@/app/components/ui/CategoryBox";
import TagBox from "@/app/components/ui/TagBox";
import {
  CATEGORY_COLORS,
  CATEGORY_DEFAULT_COLOR,
} from "@/app/constants/colorsData";
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
    <section id={id} className="bg-[#f4f1eb] px-6 py-12 md:py-20">
      <div className="mx-auto max-w-197.5">
        <div className="mb-6 flex justify-center md:mb-10">
          {/* スマホの幅でも1行に収まる大きさにする（最新記事の見出しと同じ） */}
          <h2 className="text-2xl font-bold min-[360px]:text-3xl md:px-16 md:py-3 md:text-4xl">
            {title}
          </h2>
        </div>

        {articles.length === 0 ? (
          <p className="text-center text-base text-gray-500">
            まだ記事がありません。
          </p>
        ) : (
          // md未満は、画像を左に置いた小さなカードにする（縦に積むと3枚で画面3つ分ほどになり、最新記事より目立つ）。
          // 出すのはカテゴリ・タイトル・著者と日付だけ。タグ・概要文・右下の矢印は md 以上だけ
          <ol className="space-y-3 md:space-y-6">
            {articles.map((article) => {
              const categoryColor =
                CATEGORY_COLORS[article.category.id] ?? CATEGORY_DEFAULT_COLOR;

              return (
                <li key={article.id}>
                  <Link
                    href={`/articles/${article.id}`}
                    className="group relative grid overflow-hidden bg-white shadow-sm ring-1 ring-black/5 transition-shadow hover:shadow-lg grid-cols-[104px_1fr] md:grid-cols-[288px_1fr]"
                  >
                    <article className="contents">
                      {/* 文章が長くて行が高くなっても、画像の下に余白ができないよう、行の高さいっぱいに広げる */}
                      <div className="relative h-full min-h-26 w-full bg-black md:min-h-45.5">
                        {article.header_image && (
                          <Image
                            src={article.header_image}
                            alt={article.title}
                            fill
                            sizes="(min-width: 768px) 288px, 104px"
                            className="object-cover"
                          />
                        )}
                        {/* md未満は画像が小さく、アイコン付きのカテゴリが収まらないので、文字だけのものを右の列に出す */}
                        <div className="absolute left-2 top-2 drop-shadow-sm max-md:hidden">
                          <CategoryBox
                            category={article.category.name}
                            id={article.category.id}
                          />
                        </div>
                      </div>

                      <div className="flex min-w-0 flex-col gap-1 px-3 py-2.5 md:gap-0 md:p-5">
                        <span
                          className={`self-start rounded-md px-2 py-0.5 text-[11px] font-semibold md:hidden ${categoryColor.bg} ${categoryColor.text}`}
                        >
                          {article.category.name}
                        </span>

                        {/* md以上：タグは左、著者・日付・♡は右上に寄せる。md未満：タグは出さず、著者・日付・♡をカードの下端に置く */}
                        <div className="order-last mt-auto flex min-w-0 md:order-0 md:mt-0 md:mb-1.5 md:min-h-6 md:items-start md:justify-between md:gap-3">
                          <div className="flex flex-wrap items-center gap-y-1 max-md:hidden">
                            {article.tags.slice(0, 3).map((tag) => (
                              <TagBox key={tag.id} tag={tag.name} />
                            ))}
                          </div>
                          <ArticleMeta
                            author={article.user.name}
                            publishedAt={article.published_at}
                            likeCount={article.like_count}
                            // 360px未満は1行に収まらないので、切らずに折り返す
                            className="min-w-0 max-[359px]:whitespace-normal md:shrink-0"
                          />
                        </div>

                        {/* 区切りの無い長い英数字も、カードの幅で折り返す。md未満は2行まで */}
                        <h3 className="line-clamp-2 text-base font-bold leading-snug wrap-break-word md:line-clamp-none md:text-2xl md:leading-tight">
                          {article.title}
                        </h3>

                        {/* 右下のアイコンと重ならないよう余白を空ける */}
                        <p className="mt-2 line-clamp-2 flex-1 pr-28 text-base leading-relaxed text-gray-700 wrap-break-word max-md:hidden">
                          {article.summary}
                        </p>
                      </div>

                      {/* クリックで詳細へ飛ぶことを示す。ホバーでラベルが開く */}
                      <span
                        aria-hidden
                        className="absolute bottom-3 right-4 flex items-center gap-1 text-xs text-gray-500 transition-colors group-hover:text-foreground max-md:hidden"
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
              );
            })}
          </ol>
        )}

        <div className="mt-8 flex justify-center md:mt-12">
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
