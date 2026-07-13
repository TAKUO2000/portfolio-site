"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  API_BASE_URL,
  getApiErrorMessage,
  getCsrfToken,
} from "@/app/auth/authClient";
import type { Category, Tag } from "@/app/types/models";

import TitleInput from "@/app/components/article-form/TitleInput";
import SummaryInput from "@/app/components/article-form/SummaryInput";
import CategorySelect from "@/app/components/article-form/CategorySelect";
import TagSelect from "@/app/components/article-form/TagSelect";
import MarkdownEditor from "@/app/components/article-form/MarkdownEditor";
import NormalButton from "@/app/components/ui/NormalButton";

export default function NewArticlePage() {
  const router = useRouter();

  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCatgoryId, setSelectedCatgoryId] = useState<number | null>(
    null,
  );

  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [pendingTags, setPendingTags] = useState<string[]>([]); // ※新規タグ作成は未対応のため送信時は無視

  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [body, setBody] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    (async () => {
      const [resCategories, resTags] = await Promise.all([
        fetch(`${API_BASE_URL}/api/categories`).then((r) => r.json()),
        fetch(`${API_BASE_URL}/api/tags`).then((r) => r.json()),
      ]);
      setCategories(resCategories);
      setTags(resTags);
    })();
  }, []);

  async function handleSubmit(status: "draft" | "published") {
    if (isSubmitting) return;
    setErrorMessage("");

    if (!selectedCatgoryId) {
      setErrorMessage("カテゴリを選択してください。");
      return;
    }

    setIsSubmitting(true);
    try {
      const xsrfToken = await getCsrfToken();
      const response = await fetch(`${API_BASE_URL}/api/articles`, {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
          "X-XSRF-TOKEN": xsrfToken,
        },
        body: JSON.stringify({
          category_id: selectedCatgoryId,
          title,
          summary,
          body,
          status,
          tags: selectedTagIds,
        }),
      });

      const responseBody = await response.json().catch(() => null);

      if (!response.ok) {
        setErrorMessage(
          getApiErrorMessage(
            response.status,
            responseBody,
            "記事の保存に失敗しました。",
          ),
        );
        return;
      }

      router.push(`/articles/${responseBody.id}`);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "記事の保存中にエラーが発生しました。",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-12 bg-gray-50">
      <h1 className="text-2xl font-bold">記事投稿</h1>

      <div className="flex gap-2">
        <CategorySelect
          categories={categories}
          selectedCatgoryId={selectedCatgoryId}
          setSelectedCatgoryId={setSelectedCatgoryId}
        />
        <TagSelect
          tags={tags}
          selectedTagIds={selectedTagIds}
          setSelectedTagIds={setSelectedTagIds}
          pendingTags={pendingTags}
          setPendingTags={setPendingTags}
        />
      </div>

      <TitleInput title={title} setTitle={setTitle} />
      <SummaryInput summary={summary} setSummary={setSummary} />
      <MarkdownEditor body={body} setBody={setBody} />

      {errorMessage && (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {errorMessage}
        </p>
      )}

      <div className="flex justify-end gap-3">
        <NormalButton
          buttonLabel={isSubmitting ? "保存中..." : "下書き保存"}
          onClick={() => handleSubmit("draft")}
        />
        <NormalButton
          color="green"
          buttonLabel={isSubmitting ? "公開中..." : "公開する"}
          onClick={() => handleSubmit("published")}
        />
      </div>
    </main>
  );
}
