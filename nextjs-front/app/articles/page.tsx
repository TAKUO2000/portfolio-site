import Header from "../components/Header";
import Footer from "../components/Footer";
import ArticleCard from "../components/ArticleCard";
import type { Category, Tag } from "@/app/types/models";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

type SortOrder = "latest" | "popular";

interface IndexResponse {
  data: Article[];
  links: Links;
  meta: Meta;
}

interface Article {
  id: number;
  title: string;
  summary: string;
  header_image: string;
  published_at: string;
  user: {
    id: number;
    name: string;
  }; /** idは著者ページに飛ぶ際に使用予定現在は不要だけど取得してます*/
  category: Category;
  tags: Tag[];
  like_count: number;
}

interface Links {
  first: string;
  last: string;
  prev: string | null;
  next: string | null;
}

interface Meta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

async function fetchArticles(sort: SortOrder): Promise<IndexResponse> {
  const res = await fetch(`${API_BASE_URL}/api/articles?sort=${sort}`, {
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    console.log("記事一覧の取得に失敗しました。");
    throw new Error("記事一覧の取得に失敗しました。");
  }

  return res.json();
}

export default async function ArticlesListPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string }>;
}) {
  const { sort } = await searchParams;
  const validSort: SortOrder = sort === "popular" ? "popular" : "latest";

  const articles = (await fetchArticles(validSort)).data;
  console.log(articles);

  return (
    <>
      <Header />
      <main className="h-auto w-full max-w-5xl mx-auto px-4 py-8">
        {articles.map((article, index) => (
          <div key={`${article.title}-${index}`}>
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
