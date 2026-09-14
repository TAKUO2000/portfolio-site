import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import CategoryBox from "@/app/components/ui/CategoryBox";
import { formatPublishedDate } from "@/app/lib/formatDate";
import TagBox from "@/app/components/ui/TagBox";
import type { Category, Tag } from "@/app/types/models";

/**
 * 記事カードの一式。
 *
 * サムネイルとメタ行（著者・投稿日）を共有するため、置き場所を1つにまとめている。
 * 用途ごとの使い分けは各コンポーネントのコメントを参照。
 */

interface ArticleCardBaseProps {
  title: string;
  author: string;
  href: string;
  publishedAt?: string;
}

interface ArticleThumbnailProps {
  image: string | null;
  alt: string;
  /** 枠の大きさ。アスペクト比や幅はカードごとに変える */
  className: string;
  sizes: string;
  priority?: boolean;
  /** 画像に重ねる要素。位置は渡す側で決める */
  overlay?: ReactNode;
}

/** 画像が無い記事もあるため、枠だけは必ず描いて高さを保つ */
function ArticleThumbnail({
  image,
  alt,
  className,
  sizes,
  priority = false,
  overlay,
}: ArticleThumbnailProps) {
  return (
    <div className={`relative bg-black ${className}`}>
      {image && (
        <Image
          src={image}
          alt={alt}
          fill
          sizes={sizes}
          className="object-cover"
          priority={priority}
        />
      )}
      {overlay}
    </div>
  );
}

/** 著者と投稿日の行。投稿日を出さないカードもあるので、空の要素は詰めて繋ぐ */
function ArticleMeta({
  author,
  publishedAt,
  className = "",
}: {
  author?: string;
  publishedAt?: string;
  className?: string;
}) {
  const parts = [author, publishedAt && formatPublishedDate(publishedAt)];
  const text = parts.filter(Boolean).join(" ・ ");

  if (!text) return null;

  return (
    <p className={`truncate text-xs text-gray-500 ${className}`}>{text}</p>
  );
}

interface ArticleCardProps extends ArticleCardBaseProps {
  summary: string;
  image: string | null;
  priority?: boolean;
}

/**
 * 横並びの標準カード。
 * 1カラムの記事一覧など、幅を広く取れる場所で使う。
 */
export function ArticleCard({
  title,
  author,
  summary,
  image,
  href,
  publishedAt,
  priority = false,
}: ArticleCardProps) {
  return (
    <Link
      href={href}
      className="group grid grid-cols-1 gap-5 transition-opacity hover:opacity-80 md:grid-cols-[288px_1fr] md:gap-8"
    >
      <article className="contents">
        <ArticleThumbnail
          image={image}
          alt={title}
          className="aspect-3/2 w-full md:aspect-auto md:h-50 md:w-75"
          sizes="(min-width: 768px) 288px, 100vw"
          priority={priority}
        />

        <div className="min-w-0 pt-0 md:pt-1">
          <div className="mb-4 flex flex-col gap-1 md:flex-row md:items-start md:justify-between md:gap-8">
            <h3 className="text-2xl font-bold leading-tight md:text-3xl">
              {title}
            </h3>
            <p className="shrink-0 text-base text-gray-500 md:pt-2 md:text-lg">
              {author}
            </p>
          </div>
          <p className="line-clamp-4 text-base leading-tight text-black md:line-clamp-5">
            {summary}
          </p>
          <ArticleMeta publishedAt={publishedAt} className="mt-3" />
        </div>
      </article>
    </Link>
  );
}

interface SmallArticleCardProps extends ArticleCardBaseProps {
  image: string | null;
}

/**
 * 幅の狭い場所に並べるカード。
 * サイドバーや記事詳細の「関連記事」など、概要文まで置く余裕がない箇所で使う。
 */
export function SmallArticleCard({
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
        <ArticleThumbnail
          image={image}
          alt={title}
          className="aspect-3/2 w-24 shrink-0 sm:w-28"
          sizes="112px"
        />

        <div className="min-w-0">
          <h3 className="line-clamp-2 text-sm font-bold leading-snug">
            {title}
          </h3>
          <ArticleMeta
            author={author}
            publishedAt={publishedAt}
            className="mt-1"
          />
        </div>
      </article>
    </Link>
  );
}

interface VerticalArticleCardProps extends ArticleCardBaseProps {
  summary: string;
  image: string | null;
  category?: Category;
  tags?: Tag[];
  priority?: boolean;
}

/**
 * 画像を上、テキストを下に置くカード。
 * 1行に2〜3枚並べるグリッド表示（一覧ページや検索結果）で使う。
 */
export function VerticalArticleCard({
  title,
  author,
  summary,
  image,
  href,
  category,
  tags,
  publishedAt,
  priority = false,
}: VerticalArticleCardProps) {
  return (
    // 画像は角丸で切り抜いてカード上端まで出すため、余白はテキスト側だけに付ける
    <Link
      href={href}
      className="group flex h-full flex-col overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-black/5 transition-shadow hover:shadow-md"
    >
      <article className="contents">
        <ArticleThumbnail
          image={image}
          alt={title}
          className="aspect-16/10 w-full"
          sizes="(min-width: 768px) 33vw, 100vw"
          priority={priority}
          overlay={
            category && (
              <div className="absolute left-2 top-2 drop-shadow-sm">
                <CategoryBox category={category.name} id={category.id} />
              </div>
            )
          }
        />

        {/* flex-1で高さを揃え、投稿日をカード下端に寄せる */}
        <div className="flex min-w-0 flex-1 flex-col px-4 pb-3 pt-3">
          {/*
            カードを並べたときに各行の開始位置を揃えるため、タグとタイトルは
            中身の量にかかわらず高さを固定する（タグ無し・1行タイトルでも詰めない）
          */}
          <div className="mb-1.5 flex min-h-6 flex-wrap items-center gap-y-1">
            {/* タグが多い記事もあるため、はみ出さないよう先頭3件だけ出す */}
            {tags?.slice(0, 3).map((tag) => (
              <TagBox key={tag.id} tag={tag.name} id={tag.id} />
            ))}
            {tags && tags.length > 3 && (
              <span className="text-xs text-gray-500">+{tags.length - 3}</span>
            )}
          </div>
          <h3 className="line-clamp-2 min-h-[2lh] text-lg font-bold leading-snug decoration-2 underline-offset-4 group-hover:underline">
            {title}
          </h3>
          <p className="mt-1.5 line-clamp-3 flex-1 text-sm leading-snug text-gray-700">
            {summary}
          </p>
          <ArticleMeta
            author={author}
            publishedAt={publishedAt}
            className="mt-2.5"
          />
        </div>
      </article>
    </Link>
  );
}

interface TextArticleCardProps extends ArticleCardBaseProps {
  summary?: string;
}

/**
 * 画像を持たないカード。
 * 人気記事ランキングやアーカイブ一覧など、数を詰めて並べたい箇所で使う。
 */
export function TextArticleCard({
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
        <ArticleMeta
          author={author}
          publishedAt={publishedAt}
          className="mt-2"
        />
      </article>
    </Link>
  );
}
