import Header from "../components/Header";
import Footer from "../components/Footer";
import ArticleSortSwitch from "../components/ArticleSortSwitch";
import { VerticalArticleCard } from "../components/ArticleCard";
import { fetchArticles, toSortOrder } from "@/app/lib/articles";

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
      <main className="h-auto w-full max-w-5xl mx-auto px-4 py-8">
        <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-3xl font-bold">記事一覧ページ</h1>
          <ArticleSortSwitch current={currentSort} />
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
