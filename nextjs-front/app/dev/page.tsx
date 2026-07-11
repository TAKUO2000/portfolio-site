"use client";

import { useEffect, useState } from "react";
import CategoryBox from "@/app/components/ui/CategoryBox";
import TagBox from "@/app/components/ui/TagBox";
import TagSelect from "@/app/components/article-form/TagSelect";
import type { Category, Tag } from "@/app/types/models";
import CategorySelect from "../components/article-form/CategorySelect";
import MarkdownEditor from "../components/article-form/MarkdownEditor";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export default function DevPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCatgoryId, setSelectedCatgoryId] = useState<number | null>(
    null,
  );

  const [tags, setTags] = useState<Tag[]>([]); // 登録済みのtag一覧格納用
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]); // TagSelect内で選らんだTag管理用(既にDB登録済み)
  const [pendingTags, setPendingTags] = useState<string[]>([]); // TagSelectで新しく追加されたDBに保存されていないタグ

  const [body, setBody] = useState(""); // MarkdownEditorの本文管理用

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
    <div className="p-8 flex flex-col gap-8">
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
        <h2 className="text-lg font-bold mb-4">CategorySelect</h2>
        <div className="">
          <CategorySelect
            categories={categories}
            selectedCatgoryId={selectedCatgoryId}
            setSelectedCatgoryId={setSelectedCatgoryId}
          />
        </div>
        <p className="mt-3 text-xs text-gray-500">
          selected: {JSON.stringify(selectedCatgoryId)}
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
        <h2 className="text-lg font-bold mb-4">markdownEditer</h2>
        <MarkdownEditor body={body} setBody={setBody} />
      </section>
    </div>
  );
}
