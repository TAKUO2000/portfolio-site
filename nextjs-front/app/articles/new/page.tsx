"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  API_BASE_URL,
  getApiErrorMessages,
  getCsrfToken,
} from "@/app/auth/authClient";
import type { Category, Tag } from "@/app/types/models";

import TitleInput from "@/app/components/article-form/TitleInput";
import SummaryInput from "@/app/components/article-form/SummaryInput";
import CategorySelect from "@/app/components/article-form/CategorySelect";
import TagSelect from "@/app/components/article-form/TagSelect";
import MarkdownEditor from "@/app/components/article-form/MarkdownEditor";
import NormalButton from "@/app/components/ui/NormalButton";
import type { PendingImage } from "@/app/types/models";
import HeaderImageInput from "@/app/components/article-form/HeaderImageInput";

export default function NewArticlePage() {
  const router = useRouter();

  const [pendingHeader, setPendingHeader] = useState<PendingImage | null>(null);
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]); // 本文への貼り付け画像キャッシュ用（複数可）

  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCatgoryId, setSelectedCatgoryId] = useState<number | null>(
    null,
  );

  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [pendingTags, setPendingTags] = useState<string[]>([]);

  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [body, setBody] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessages, setErrorMessages] = useState<string[]>([]);

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
    setErrorMessages([]);

    const errors = validateArticleForm({
      selectedCatgoryId,
      title,
      summary,
      body,
      pendingHeader,
    });
    setErrorMessages(errors);
    if (errors.length > 0) {
      return;
    }

    setIsSubmitting(true);
    try {
      // 本文中に残っているblobプレビュー分だけS3へ実アップロードしてURLを差し替える
      // （本文から削除された貼り付け画像はアップロードしない）
      const usedImages = pendingImages.filter((img) =>
        body.includes(img.blobUrl),
      );

      await Promise.all(
        usedImages.map(async (img) => {
          const uploadRes = await fetch(img.uploadUrl, {
            method: "PUT",
            headers: { "Content-Type": img.file.type },
            body: img.file,
          });
          if (!uploadRes.ok) {
            throw new Error("本文の画像アップロードに失敗しました。");
          }
        }),
      );

      let finalBody = body;
      for (const img of usedImages) {
        finalBody = finalBody.replaceAll(img.blobUrl, img.imageUrl);
      }
      const bodyImageUrls = usedImages.map((img) => img.imageUrl);

      // ヘッダー画像も同様にS3へ実アップロード
      let headerImageUrl: string | undefined;
      if (pendingHeader) {
        const uploadRes = await fetch(pendingHeader.uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": pendingHeader.file.type },
          body: pendingHeader.file,
        });
        if (!uploadRes.ok) {
          throw new Error("ヘッダー画像のアップロードに失敗しました。");
        }
        headerImageUrl = pendingHeader.imageUrl;
      }

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
          body: finalBody,
          status,
          tags: selectedTagIds,
          ...(headerImageUrl ? { header_image_url: headerImageUrl } : {}),
          ...(bodyImageUrls.length > 0
            ? { body_image_urls: bodyImageUrls }
            : {}),
        }),
      });

      const responseBody = await response.json().catch(() => null);

      if (!response.ok) {
        setErrorMessages(
          getApiErrorMessages(
            response.status,
            responseBody,
            "記事の保存に失敗しました。",
          ),
        );
        return;
      }

      pendingImages.forEach((img) => URL.revokeObjectURL(img.blobUrl));
      if (pendingHeader) URL.revokeObjectURL(pendingHeader.blobUrl);

      router.push(`/articles/${responseBody.id}`);
    } catch (error) {
      setErrorMessages([
        error instanceof Error
          ? error.message
          : "記事の保存中にエラーが発生しました。",
      ]);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-12 bg-gray-50">
      <h1 className="text-2xl font-bold">記事投稿</h1>

      <HeaderImageInput
        pendingHeader={pendingHeader}
        setPendingHeader={setPendingHeader}
      />
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
      <MarkdownEditor
        body={body}
        setBody={setBody}
        pendingImages={pendingImages}
        setPendingImages={setPendingImages}
      />

      {errorMessages.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {errorMessages.map((error, index) => (
            <p
              key={index}
              className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              {error}
            </p>
          ))}
        </div>
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

function validateArticleForm({
  selectedCatgoryId,
  title,
  summary,
  body,
  pendingHeader,
}: {
  selectedCatgoryId: number | null;
  title: string;
  summary: string;
  body: string;
  pendingHeader: PendingImage | null;
}): string[] {
  const errors: string[] = [];
  if (!selectedCatgoryId) errors.push("カテゴリを選択してください。");
  if (title === "") errors.push("タイトルを入力してください");
  else if (title.length > 255) errors.push("タイトルは255文字以内で入力してください");
  if (summary === "") errors.push("概要を入力してください");
  if (body === "") errors.push("本文を入力してください");
  if (!pendingHeader) errors.push("ヘッダー画像を選択してください。");
  return errors;
}
