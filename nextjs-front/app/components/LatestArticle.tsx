import Image from "next/image";
import Link from "next/link";
import { ArticleMeta } from "@/app/components/ArticleCard";
import CategoryBox from "@/app/components/ui/CategoryBox";
import SectionHeading from "@/app/components/ui/SectionHeading";
import TagBox from "@/app/components/ui/TagBox";
import WindowTitleBar from "@/app/components/ui/WindowTitleBar";
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
    <section id={id} className="bg-[#f4f1eb] px-6 py-12 md:py-20">
      <div className="mx-auto max-w-197.5">
        <SectionHeading>{title}</SectionHeading>
        {article ? (
          // md未満は、枠と影（外側に 4px、右と下は 8px）が画面の端に寄りすぎないよう、左右を少し空ける
          <article className="mx-1 md:mx-0">
            <Link
              href={`/articles/${article.id}`}
              className="pixel-window pixel-press-window relative grid bg-white [--pixel-c:var(--color-foreground)] md:grid-cols-2"
            >
              <WindowTitleBar className="col-span-full" />
              {/*
                md以上は文章の列と横並びになる。文章が長いと行が高くなるので、画像の枠も行の高さいっぱいに広げ、
                画像の下に余白ができないようにする（短いときは16:10相当の高さを保つ）
              */}
              <div className="relative aspect-2/1 w-full bg-foreground md:aspect-auto md:h-full md:min-h-62">
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
                {/* md未満は画像が小さいので、アイコンの無い小さなラベルにする */}
                <div className="absolute left-2.5 top-2.5 md:hidden">
                  <CategoryBox
                    category={article.category.name}
                    id={article.category.id}
                    compact
                  />
                </div>
                <div className="absolute left-3 top-3 max-md:hidden">
                  <CategoryBox
                    category={article.category.name}
                    id={article.category.id}
                  />
                </div>
              </div>

              {/* 下の余白は、右下の「記事を読む」と文章が重ならないように広くしている */}
              <div className="flex min-w-0 flex-col px-4.5 pt-4.5 pb-9 md:p-6 md:pb-10">
                {/* タグは左、著者・日付・♡は右上に寄せる。入りきらないときは折り返す */}
                <div className="mb-2.5 flex min-h-6 flex-wrap items-center justify-between gap-x-3 gap-y-2 md:items-start">
                  <div className="flex flex-wrap items-center gap-y-1.5 pl-0.5">
                    {article.tags.slice(0, 3).map((tag) => (
                      <TagBox key={tag.id} tag={tag.name} />
                    ))}
                  </div>
                  <ArticleMeta
                    author={article.user.name}
                    publishedAt={article.published_at}
                    likeCount={article.like_count}
                    className="shrink-0 leading-6"
                  />
                </div>

                {/* 最新記事は主役なので、人気記事のカードより一段大きくする。
                    ドット絵の書体は太字にするとつぶれるので、大きさで目立たせる */}
                {/* 区切りの無い長い英数字も、カードの幅で折り返す */}
                <h3 className="text-2xl leading-tight wrap-break-word md:text-[32px]">
                  {article.title}
                </h3>

                <p className="mt-2 line-clamp-2 flex-1 text-base leading-relaxed text-gray-700 wrap-break-word md:line-clamp-4">
                  {article.summary}
                </p>
              </div>

              {/* クリックで詳細へ飛ぶことを示す */}
              <span
                aria-hidden
                className="absolute right-3.5 bottom-2.5 text-xs text-gray-500 md:right-4 md:bottom-3"
              >
                記事を読む ▶
              </span>
            </Link>
          </article>
        ) : (
          <p className="text-center text-base text-gray-500">
            まだ記事がありません。
          </p>
        )}
      </div>

      <div className="mt-11 flex justify-center md:mt-14">
        <Link
          href={moreButtonHref}
          className="pixel-card pixel-press bg-foreground px-14 py-4 text-base text-white [--pixel-c:var(--color-foreground)]"
        >
          最近の投稿
        </Link>
      </div>
    </section>
  );
}
