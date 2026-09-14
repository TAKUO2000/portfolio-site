import Header from "../components/Header";
import Footer from "../components/Footer";
import ArticleCard from "../components/ArticleCard";
import { fetchArticles, toSortOrder } from "@/app/lib/articles";

export default async function ArticlesListPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string }>;
}) {
  const { sort } = await searchParams;

  const articles = (await fetchArticles({ sort: toSortOrder(sort) })).data;

  return (
    <>
      <Header />
      <main className="h-auto w-full max-w-5xl mx-auto px-4 py-8">
        {articles.map((article, index) => (
          <div key={article.id}>
            {index !== 0 && <hr className="my-8 border-gray" />}
            <ArticleCard
              title={article.title}
              author={article.user.name}
              summary={article.summary}
              image={article.header_image}
              href={`articles/${article.id}`}
              priority={index === 0}
            />
          </div>
        ))}
      </main>
      <Footer />
    </>
  );
}
