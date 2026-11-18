import type { Metadata } from "next";

import Header from "../components/Header";
import Footer from "../components/Footer";
import ArticleSortSwitch from "../components/ArticleSortSwitch";
import { VerticalArticleCard } from "../components/ArticleCard";
import { fetchArticles, toSortOrder } from "@/app/lib/articles";

export const metadata: Metadata = {
  title: "記事一覧",
};

export default async function ArticlesListPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string }>;
}) {
  const { sort } = await searchParams;
  const currentSort = toSortOrder(sort);

  const articles = (await fetchArticles({ sort: currentSort })).data;

  return (
    <>
      <Header />
      <main className="mx-auto h-auto w-full max-w-5xl px-5 pt-8 pb-16 sm:px-4 sm:pb-18">
        <div className="mb-9 flex flex-col gap-4.5 sm:mb-10 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-3xl font-bold">記事一覧</h1>
          <ArticleSortSwitch current={currentSort} />
        </div>

        {/* カードの枠と影は外側にはみ出す（右と下は 8px）ので、その分より広く間を空ける */}
        <div className="grid gap-x-7 gap-y-7.5 px-1 sm:grid-cols-2 sm:gap-y-8 sm:px-0 lg:grid-cols-3">
          {articles.map((article, index) => (
            <VerticalArticleCard
              key={article.id}
              title={article.title}
              author={article.user.name}
              summary={article.summary}
              image={article.header_image}
              href={`/articles/${article.id}`}
              category={article.category}
              tags={article.tags}
              publishedAt={article.published_at}
              likeCount={article.like_count}
              priority={index < 3}
            />
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}
