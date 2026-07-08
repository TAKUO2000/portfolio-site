import Image from "next/image";
import ReactMarkdown from "react-markdown";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import CategoryBox from "@/app/components/ui/CategoryBox";
import TagBox from "@/app/components/ui/TagBox";
import ArticleActionButtons from "@/app/components/ui/ArticleActionButtons";
import type { Category, Tag } from "@/app/types/models";

interface ShowResponse {
  data: {
    id: number;
    title: string;
    body: string;
    published_at: string;
    user: { id: number; name: string };
    category: Category;
    tags: Tag[];
    like_count: number;
    images: ImageTypeUrl[];
  };
}

interface ImageTypeUrl {
  id: number;
  url: string;
  type: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

async function fetchArticles(id: string): Promise<ShowResponse> {
  const res = await fetch(`${API_BASE_URL}/api/articles/${id}`, {
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    console.log("記事一覧の取得に失敗しました。");
    throw new Error("記事一覧の取得に失敗しました。");
  }
  return res.json();
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const article = (await fetchArticles(id)).data;
  console.log(article);

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
                height={630}
                className="h-80 w-auto mb-6 rounded mx-auto block"
                loading="eager"
              />
            )}
            <div className="flex flex-wrap gap-2 mb-3">
              <CategoryBox
                category={article.category.name}
                id={article.category.id}
              />
              {article.tags.map((tag) => (
                <TagBox key={tag.id} tag={tag.name} id={tag.id} />
              ))}
            </div>
            <h1 className="text-3xl font-bold mb-6">{article.title}</h1>
            <div className="prose prose-neutral [&_ul>li::marker]:text-black max-w-none wrap-break-word">
              <ReactMarkdown>{article.body}</ReactMarkdown>
            </div>
          </article>

          {/* 目次エリア (2割) */}
          <aside className="w-1/5 shrink-0 sticky top-8">
            <div className="border rounded p-4 text-sm text-gray-500">
              <p className="font-semibold mb-2">目次</p>
              <p>（ダミー）</p>
            </div>
            <ArticleActionButtons likeCount={article.like_count} />
          </aside>
        </div>
      </main>
      <Footer />
    </>
  );
}
