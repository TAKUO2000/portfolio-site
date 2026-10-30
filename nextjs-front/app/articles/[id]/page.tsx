import type { Metadata } from "next";
import Image from "next/image";
import ReactMarkdown from "react-markdown";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import CategoryBox from "@/app/components/ui/CategoryBox";
import TagBox from "@/app/components/ui/TagBox";
import ArticleSidebar from "@/app/components/ui/ArticleSidebar";
import {
  articleRehypePlugins,
  extractHeadings,
} from "@/app/lib/articleMarkdown";
import { fetchArticle } from "@/app/lib/articles";

// fetchArticleはページ本体と同じURL・オプションで呼ぶため、1回の表示の中では結果が共有され、APIへのリクエストは増えない
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const article = await fetchArticle(id);

  return { title: article.title };
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const article = await fetchArticle(id);
  const headings = extractHeadings(article.body);

  const headerImage = article.images.find((img) => img.type === "header");

  return (
    <>
      <Header />
      <main className="w-full max-w-5xl mx-auto px-4 py-8">
        {/* md以上は本文と目次の横並び */}
        <div className="flex gap-8 items-start">
          {/* 本文エリア (md以上で8割) */}
          <article className="min-w-0 md:w-4/5 bg-black/10 rounded-xl p-4 md:p-6">
            {headerImage && (
              <Image
                src={headerImage.url}
                alt={article.title}
                width={1200}
                height={800}
                className="w-full h-56 sm:h-80 max-w-120 object-cover object-center mb-6 mx-auto block"
                loading="eager"
              />
            )}
            <div className="flex flex-wrap gap-2 mb-3">
              <CategoryBox
                category={article.category.name}
                id={article.category.id}
              />
              {article.tags.map((tag) => (
                <TagBox key={tag.id} tag={tag.name} />
              ))}
            </div>
            <h1 className="text-2xl md:text-3xl font-bold mb-6">
              {article.title}
            </h1>
            <div className="prose prose-neutral [&_ul>li::marker]:text-black [&_:is(h1,h2,h3)]:scroll-mt-8 max-w-none wrap-break-word">
              <ReactMarkdown rehypePlugins={articleRehypePlugins}>
                {article.body}
              </ReactMarkdown>
            </div>
          </article>

          {/* 目次・いいね (md以上で2割)。md未満は画面の下に固定する */}
          <ArticleSidebar
            headings={headings}
            articleId={article.id}
            likeCount={article.like_count}
          />
        </div>
      </main>
      <Footer />
      {/* md未満は画面下に目次・いいねのバーが重なるので、フッターの末尾が隠れないよう高さ分を空ける。
          バーの高さと少しずれても隙間に見えないよう、フッターと同じ黒で塗る */}
      <div
        className="h-[calc(4rem+env(safe-area-inset-bottom))] bg-black md:hidden"
        aria-hidden="true"
      />
    </>
  );
}
