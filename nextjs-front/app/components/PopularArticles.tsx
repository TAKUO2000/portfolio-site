import Image from "next/image";
import Link from "next/link";
import { ArticleMeta } from "@/app/components/ArticleCard";
import CategoryBox from "@/app/components/ui/CategoryBox";
import SectionHeading from "@/app/components/ui/SectionHeading";
import TagBox from "@/app/components/ui/TagBox";
import WindowTitleBar from "@/app/components/ui/WindowTitleBar";
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
        <SectionHeading>{title}</SectionHeading>

        {articles.length === 0 ? (
          <p className="text-center text-base text-gray-500">
            まだ記事がありません。
          </p>
        ) : (
          // 3枚のカードを、1つのウィンドウ風の枠にまとめる。
          // md未満は、枠と影が画面の端に寄りすぎないよう、左右を少し空ける
          <div className="pixel-window mx-1 bg-background [--pixel-c:var(--color-foreground)] md:mx-0">
            <WindowTitleBar />
            {/* md未満は、画像を左に置いた小さなカードにする（縦に積むと3枚で画面3つ分ほどになり、最新記事より目立つ）。
                出すのはカテゴリ・タイトル・著者と日付だけ。タグ・概要文・右下の「記事を読む」は md 以上だけ */}
            {/* カードの枠と影は外側にはみ出すので、その分より広く間を空ける */}
            <ol className="flex flex-col gap-5.5 px-3 pt-4 pb-5 md:gap-8 md:px-8 md:pt-8 md:pb-9">
              {articles.map((article) => (
                <li key={article.id}>
                  <Link
                    href={`/articles/${article.id}`}
                    className="pixel-card pixel-press relative grid bg-white [--pixel-c:var(--color-foreground)] grid-cols-[104px_1fr] md:grid-cols-[288px_1fr]"
                  >
                    <article className="contents">
                      {/* 文章が長くて行が高くなっても、画像の下に余白ができないよう、行の高さいっぱいに広げる */}
                      <div className="relative h-full min-h-27 w-full bg-foreground md:min-h-45.5">
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
                        <div className="absolute left-3 top-3 max-md:hidden">
                          <CategoryBox
                            category={article.category.name}
                            id={article.category.id}
                          />
                        </div>
                      </div>

                      <div className="flex min-w-0 flex-col gap-1.5 px-3 py-2.5 md:gap-0 md:p-5 md:pb-10">
                        <div className="self-start pl-0.5 md:hidden">
                          <CategoryBox
                            category={article.category.name}
                            id={article.category.id}
                            compact
                          />
                        </div>

                        {/* md以上：タグは左、著者・日付・♡は右上に寄せる。md未満：タグは出さず、著者・日付・♡をカードの下端に置く */}
                        <div className="order-last mt-auto flex min-w-0 md:order-0 md:mt-0 md:mb-2.5 md:min-h-6 md:flex-wrap md:items-start md:justify-between md:gap-x-3 md:gap-y-2">
                          <div className="flex flex-wrap items-center gap-y-1.5 pl-0.5 max-md:hidden">
                            {article.tags.slice(0, 3).map((tag) => (
                              <TagBox key={tag.id} tag={tag.name} />
                            ))}
                          </div>
                          <ArticleMeta
                            author={article.user.name}
                            publishedAt={article.published_at}
                            likeCount={article.like_count}
                            // md未満は文章の列が狭く、1行に収まらないことがあるので、切らずに折り返す
                            className="min-w-0 max-md:whitespace-normal md:shrink-0 md:leading-6"
                          />
                        </div>

                        {/* 区切りの無い長い英数字も、カードの幅で折り返す。md未満は2行まで。
                            ドット絵の書体は太字にするとつぶれるので、太字にしない */}
                        <h3 className="line-clamp-2 text-base leading-snug wrap-break-word md:line-clamp-none md:text-2xl md:leading-tight">
                          {article.title}
                        </h3>

                        <p className="mt-2 line-clamp-2 flex-1 text-base leading-relaxed text-gray-700 wrap-break-word max-md:hidden">
                          {article.summary}
                        </p>
                      </div>

                      {/* クリックで詳細へ飛ぶことを示す */}
                      <span
                        aria-hidden
                        className="absolute right-4 bottom-3 text-xs text-gray-500 max-md:hidden"
                      >
                        記事を読む ▶
                      </span>
                    </article>
                  </Link>
                </li>
              ))}
            </ol>
          </div>
        )}

        <div className="mt-11 flex justify-center md:mt-14">
          <Link
            href={moreButtonHref}
            className="pixel-card pixel-press bg-foreground px-14 py-4 text-base text-white [--pixel-c:var(--color-foreground)]"
          >
            人気の投稿
          </Link>
        </div>
      </div>
    </section>
  );
}
