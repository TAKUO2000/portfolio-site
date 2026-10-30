import type { Metadata } from "next";
import Image from "next/image";
import ReactMarkdown from "react-markdown";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import CategoryBox from "@/app/components/ui/CategoryBox";
import TagBox from "@/app/components/ui/TagBox";
import ArticleActionButtons from "@/app/components/ui/ArticleActionButtons";
import TableOfContents from "@/app/components/ui/TableOfContents";
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
        {/* md以上は本文と目次の横並び。md未満は縦に並べ、目次→本文→いいねの順にする */}
        <div className="flex flex-col gap-6 md:flex-row md:gap-8 md:items-start">
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

          {/* 目次エリア (md以上で2割)。md未満はasideの箱を無くし、目次だけを本文の上へ出す */}
          <aside className="contents md:w-1/5 md:shrink-0 md:sticky md:top-8 md:flex md:flex-col md:gap-4">
            <TableOfContents
              headings={headings}
              className="order-first md:order-none"
            />
            <ArticleActionButtons
              articleId={article.id}
              likeCount={article.like_count}
            />
          </aside>
        </div>
      </main>
      <Footer />
    </>
  );
}
