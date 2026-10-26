import type { Metadata } from "next";
import Image from "next/image";
import ReactMarkdown from "react-markdown";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import CategoryBox from "@/app/components/ui/CategoryBox";
import TagBox from "@/app/components/ui/TagBox";
import ArticleActionButtons from "@/app/components/ui/ArticleActionButtons";
import TableOfContents from "@/app/components/ui/TableOfContents";
import type { ArticleDetail } from "@/app/types/models";
import {
  articleRehypePlugins,
  extractHeadings,
} from "@/app/lib/articleMarkdown";
import { getApiBaseUrl } from "@/app/lib/apiBaseUrl";

async function fetchArticle(id: string): Promise<ArticleDetail> {
  const res = await fetch(`${getApiBaseUrl()}/api/articles/${id}`, {
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    throw new Error("記事の取得に失敗しました。");
  }
  return (await res.json()).data;
}

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
      <main className="w-5xl mx-auto px-4 py-8">
        {/* 本文 + 目次 の横並びレイアウト */}
        <div className="flex gap-8 items-start">
          {/* 本文エリア (8割) */}
          <article className="w-4/5 min-w-0 bg-black/10 rounded-xl p-6">
            {headerImage && (
              <Image
                src={headerImage.url}
                alt={article.title}
                width={1200}
                height={800}
                className="h-80 max-w-120 object-cover object-center mb-6 mx-auto block"
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
            <h1 className="text-3xl font-bold mb-6">{article.title}</h1>
            <div className="prose prose-neutral [&_ul>li::marker]:text-black [&_:is(h1,h2,h3)]:scroll-mt-8 max-w-none wrap-break-word">
              <ReactMarkdown rehypePlugins={articleRehypePlugins}>
                {article.body}
              </ReactMarkdown>
            </div>
          </article>

          {/* 目次エリア (2割) */}
          <aside className="w-1/5 shrink-0 sticky top-8 flex flex-col gap-4">
            <TableOfContents headings={headings} />
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
