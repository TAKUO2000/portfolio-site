"use client";

import { useEffect, useState } from "react";
import CategoryBox from "@/app/components/ui/CategoryBox";
import TagBox from "@/app/components/ui/TagBox";
import TagSelect from "@/app/components/article-form/TagSelect";
import {
  ArticleCard,
  SmallArticleCard,
  TextArticleCard,
  VerticalArticleCard,
} from "@/app/components/ArticleCard";
import type {
  ArticleSummary,
  Category,
  PendingImage,
  Tag,
} from "@/app/types/models";
import CategorySelect from "../components/article-form/CategorySelect";
import MarkdownEditor from "../components/article-form/MarkdownEditor";
import NormalButton from "../components/ui/NormalButton";
import TitleInput from "../components/article-form/TitleInput";
import SummaryInput from "../components/article-form/SummaryInput";
import HeaderImageInput from "../components/article-form/HeaderImageInput";
import { API_BASE_URL } from "../auth/authClient";
import ComponentSectionDev from "./components/ComponentSectionDev";

export default function DevPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(
    null,
  );

  const [sampleArticles, setSampleArticles] = useState<ArticleSummary[]>([]); // 記事カードの表示確認用。シーダーが入れた記事を借りる
  const sampleArticle = sampleArticles[0] ?? null;

  const [tags, setTags] = useState<Tag[]>([]); // 登録済みのtag一覧格納用
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]); // TagSelect内で選らんだTag管理用(既にDB登録済み)
  const [pendingTags, setPendingTags] = useState<string[]>([]); // TagSelectで新しく追加されたDBに保存されていないタグ

  const [title, setTitle] = useState<string>("");
  const [summary, setSummary] = useState<string>("");

  const [body, setBody] = useState(""); // MarkdownEditorの本文管理用

  const [pendingHeaderImage, setPendingHeaderImage] =
    useState<PendingImage | null>(null); // header画像キャッシュ用
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]); // 本文への貼り付け画像キャッシュ用（複数可）

  useEffect(() => {
    // 並列にカテゴリとタグを取得＆格納
    (async () => {
      const [resCategories, resTags, resArticles] = await Promise.all([
        fetch(`${API_BASE_URL}/api/categories`).then((r) => r.json()),
        fetch(`${API_BASE_URL}/api/tags`).then((r) => r.json()),
        fetch(`${API_BASE_URL}/api/articles?per_page=3`).then((r) => r.json()),
      ]);
      setCategories(resCategories);
      setTags(resTags);
      setSampleArticles(resArticles.data);
    })(); // 即時実行
  }, []);

  return (
    <div className="p-8 flex flex-col gap-12">
      <section>
        <h1 className="text-2xl font-bold mb-6 border-b pb-2">
          全体的に使用するコンポーネント
        </h1>
        <div className="flex flex-col gap-8">
          <ComponentSectionDev title="CategoryBox">
            {categories.map((cat) => (
              <CategoryBox key={cat.id} category={cat.name} id={cat.id} />
            ))}
          </ComponentSectionDev>

          <ComponentSectionDev title="TagBox">
            {tags.map((tag) => (
              <TagBox key={tag.id} tag={tag.name} id={tag.id} />
            ))}
          </ComponentSectionDev>

          <ComponentSectionDev title="Button">
            <NormalButton
              color="green"
              buttonLabel="保存する"
              onClick={() => console.log("hello")}
            />
            <NormalButton
              color="red"
              buttonLabel="削除"
              onClick={() => console.log("hello")}
            />
            <NormalButton
              buttonLabel="キャンセル"
              onClick={() => console.log("hello")}
            />
          </ComponentSectionDev>

          <ComponentSectionDev
            title="ArticleCard"
            className="flex flex-col"
            collapsible
          >
            {sampleArticle ? (
              <ArticleCard
                title={sampleArticle.title}
                author={sampleArticle.user.name}
                summary={sampleArticle.summary}
                image={sampleArticle.header_image}
                href={`/articles/${sampleArticle.id}`}
              />
            ) : (
              <p className="text-xs text-gray-500">
                記事が1件もないため表示できません。シーダーを流してください。
              </p>
            )}

            <hr className="my-8 border-gray-300" />

            {/* ヘッダー画像が無い記事の見え方も確認する */}
            <ArticleCard
              title="ヘッダー画像なしの記事"
              author="著者名"
              summary="header_imageがnullのときは黒いプレースホルダーが出ます。"
              image={null}
              href="#"
            />
          </ComponentSectionDev>

          <ComponentSectionDev
            title="SmallArticleCard（サイドバー・関連記事向け）"
            className="flex flex-col gap-4 max-w-80"
            collapsible
          >
            {sampleArticles.map((article) => (
              <SmallArticleCard
                key={article.id}
                title={article.title}
                author={article.user.name}
                image={article.header_image}
                href={`/articles/${article.id}`}
                publishedAt={article.published_at}
              />
            ))}
            <SmallArticleCard
              title="ヘッダー画像なしの記事"
              author="著者名"
              image={null}
              href="#"
            />
          </ComponentSectionDev>

          <ComponentSectionDev
            title="VerticalArticleCard（グリッド表示向け）"
            className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
            collapsible
          >
            {sampleArticles.map((article) => (
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
              />
            ))}
          </ComponentSectionDev>

          <ComponentSectionDev
            title="TextArticleCard（ランキング・アーカイブ向け）"
            className="flex flex-col gap-5 max-w-150"
            collapsible
          >
            {sampleArticles.map((article) => (
              <TextArticleCard
                key={article.id}
                title={article.title}
                author={article.user.name}
                summary={article.summary}
                href={`/articles/${article.id}`}
                publishedAt={article.published_at}
              />
            ))}
            {/* 概要文を省いた詰めた表示 */}
            <TextArticleCard
              title="概要文なしの記事（タイトルだけ詰めて並べたいとき）"
              author="著者名"
              href="#"
              publishedAt="2026-09-12T18:35:39.000000Z"
            />
          </ComponentSectionDev>
        </div>
      </section>

      <section>
        <h1 className="text-2xl font-bold mb-6 border-b pb-2">
          記事投稿用コンポーネント
        </h1>
        <div className="flex flex-col gap-8">
          <ComponentSectionDev title="CategorySelect" className="flex flex-col">
            <CategorySelect
              categories={categories}
              selectedCategoryId={selectedCategoryId}
              setSelectedCategoryId={setSelectedCategoryId}
            />
            <p className="mt-3 text-xs text-gray-500">
              selected: {JSON.stringify(selectedCategoryId)}
            </p>
          </ComponentSectionDev>

          <ComponentSectionDev title="TagSelect" className="flex flex-col">
            <TagSelect
              tags={tags}
              selectedTagIds={selectedTagIds}
              setSelectedTagIds={setSelectedTagIds}
              pendingTags={pendingTags}
              setPendingTags={setPendingTags}
            />
            <p className="mt-3 text-xs text-gray-500">
              selected: {JSON.stringify(selectedTagIds)} / pending:{" "}
              {JSON.stringify(pendingTags)}
            </p>
          </ComponentSectionDev>

          <ComponentSectionDev title="TitleInput" className="flex flex-col">
            <TitleInput title={title} setTitle={setTitle} />
          </ComponentSectionDev>

          <ComponentSectionDev title="SummaryInput" className="flex flex-col">
            <SummaryInput summary={summary} setSummary={setSummary} />
          </ComponentSectionDev>

          <ComponentSectionDev
            title="markdownEditer"
            className="flex flex-col"
            collapsible
          >
            <MarkdownEditor
              body={body}
              setBody={setBody}
              pendingImages={pendingImages}
              setPendingImages={setPendingImages}
            />
          </ComponentSectionDev>

          <ComponentSectionDev
            title="HeaderImageInput（認証必須）"
            className="flex flex-col"
            collapsible
          >
            <HeaderImageInput
              pendingHeader={pendingHeaderImage}
              setPendingHeader={setPendingHeaderImage}
            />
          </ComponentSectionDev>
        </div>
      </section>
    </div>
  );
}
