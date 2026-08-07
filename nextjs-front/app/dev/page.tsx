"use client";

import { useEffect, useState } from "react";
import CategoryBox from "@/app/components/ui/CategoryBox";
import TagBox from "@/app/components/ui/TagBox";
import TagSelect from "@/app/components/article-form/TagSelect";
import type { Category, PendingImage, Tag } from "@/app/types/models";
import CategorySelect from "../components/article-form/CategorySelect";
import MarkdownEditor from "../components/article-form/MarkdownEditor";
import NormalButton from "../components/ui/NormalButton";
import TitleInput from "../components/article-form/TitleInput";
import SummaryInput from "../components/article-form/SummaryInput";
import HeaderImageInput from "../components/article-form/HeaderImageInput";
import { API_BASE_URL } from "../auth/authClient";

export default function DevPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(
    null,
  );

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
      const [resCategories, resTags] = await Promise.all([
        fetch(`${API_BASE_URL}/api/categories`).then((r) => r.json()),
        fetch(`${API_BASE_URL}/api/tags`).then((r) => r.json()),
      ]);
      setCategories(resCategories);
      setTags(resTags);
    })(); // 即時実行
  }, []);

  return (
    <div className="p-8 flex flex-col gap-12">
      <section>
        <h1 className="text-2xl font-bold mb-6 border-b pb-2">
          全体的に使用するコンポーネント
        </h1>
        <div className="flex flex-col gap-8">
          <section>
            <h2 className="text-lg font-bold mb-4">CategoryBox</h2>
            <div className="flex gap-2">
              {categories.map((cat) => (
                <CategoryBox key={cat.id} category={cat.name} id={cat.id} />
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-4">TagBox</h2>
            <div className="flex gap-2">
              {tags.map((tag) => (
                <TagBox key={tag.id} tag={tag.name} id={tag.id} />
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-4">Button</h2>
            <div className="flex gap-2">
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
            </div>
          </section>
        </div>
      </section>

      <section>
        <h1 className="text-2xl font-bold mb-6 border-b pb-2">
          記事投稿用コンポーネント
        </h1>
        <div className="flex flex-col gap-8">
          <section>
            <h2 className="text-lg font-bold mb-4">CategorySelect</h2>
            <div className="">
              <CategorySelect
                categories={categories}
                selectedCategoryId={selectedCategoryId}
                setSelectedCategoryId={setSelectedCategoryId}
              />
            </div>
            <p className="mt-3 text-xs text-gray-500">
              selected: {JSON.stringify(selectedCategoryId)}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-4">TagSelect</h2>
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
          </section>

          <section>
            <h2 className="text-lg font-bold mb-4">TitleInput</h2>
            <TitleInput title={title} setTitle={setTitle} />
          </section>
          <section>
            <h2 className="text-lg font-bold mb-4">SummaryInput</h2>
            <SummaryInput summary={summary} setSummary={setSummary} />
          </section>

          <section>
            <h2 className="text-lg font-bold mb-4">markdownEditer</h2>
            <MarkdownEditor
              body={body}
              setBody={setBody}
              pendingImages={pendingImages}
              setPendingImages={setPendingImages}
            />
          </section>

          <section>
            <h2 className="text-lg font-bold mb-4">
              HeaderImageInput（認証必須）
            </h2>
            <HeaderImageInput
              pendingHeader={pendingHeaderImage}
              setPendingHeader={setPendingHeaderImage}
            />
          </section>
        </div>
      </section>
    </div>
  );
}
