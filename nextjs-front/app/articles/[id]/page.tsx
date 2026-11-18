import type { Metadata } from "next";
import Image from "next/image";
import ReactMarkdown from "react-markdown";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import CategoryBox from "@/app/components/ui/CategoryBox";
import TagBox from "@/app/components/ui/TagBox";
import WindowTitleBar from "@/app/components/ui/WindowTitleBar";
import ArticleSidebar from "@/app/components/ui/ArticleSidebar";
import {
  articleRehypePlugins,
  articleRemarkPlugins,
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
      <main className="mx-auto w-full max-w-5xl px-5 pt-8 pb-16 md:px-4 md:pb-18">
        {/* md以上は本文と目次の横並び */}
        <div className="flex items-start gap-9">
          {/* 本文エリア (md以上で8割)。ウィンドウ風の枠と影は外側にはみ出すので、md未満は左右を少し空ける */}
          <article className="pixel-window mx-1 min-w-0 bg-background [--pixel-c:var(--color-foreground)] md:mx-0 md:flex-4">
            <WindowTitleBar />
            <div className="bg-black/10 p-4 md:p-6">
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
              {/* CategoryBoxとTagBoxは自前で右マージンを持つので、横のgapは付けない */}
              <div className="mb-3.5 flex flex-wrap gap-y-2 pl-0.5">
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
              <div className="prose prose-neutral prose-pixel max-w-none wrap-break-word [&_:is(h1,h2,h3)]:scroll-mt-8">
                <ReactMarkdown
                  remarkPlugins={articleRemarkPlugins}
                  rehypePlugins={articleRehypePlugins}
                >
                  {article.body}
                </ReactMarkdown>
              </div>
            </div>
          </article>

          {/* 目次・いいね (md以上で2割)。md未満は画面の下に固定する。幅の割合は、本文の md:flex-4 と ArticleSidebar の md:flex-1 で決まる */}
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
        className="h-[calc(4rem+env(safe-area-inset-bottom))] bg-foreground md:hidden"
        aria-hidden="true"
      />
    </>
  );
}
