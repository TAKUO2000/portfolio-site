import Header from "../components/Header";
import Footer from "../components/Footer";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

type SortOrder = "latest" | "popular";

interface Article {
  id: number;
  title: string;
  summary: string;
  published_at: string | null;
  user: { id: number; name: string };
  category: { id: number; name: string };
}

interface PaginatedArticles {
  data: Article[];
  current_page: number;
  last_page: number;
}

async function fetchArticles(sort: SortOrder): Promise<PaginatedArticles> {
  const res = await fetch(`${API_BASE_URL}/api/articles?sort=${sort}`, {
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    console.log("記事一覧の取得に失敗しました。");
    throw new Error("記事一覧の取得に失敗しました。");
  }

  return res.json();
}

export default async function ArticlesPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string }>;
}) {
  const { sort } = await searchParams;
  const validSort: SortOrder = sort === "popular" ? "popular" : "latest";

  const articles = await fetchArticles(validSort);

  return (
    <>
      <Header />
      <main className="h-200 ">
        {articles.data.map((article) => (
          <article key={article.id}>
            <h2>{article.title}</h2>
            <p>{article.summary}</p>
          </article>
        ))}
      </main>
      <Footer />
    </>
  );
}
