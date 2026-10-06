"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  API_BASE_URL,
  getApiErrorMessages,
  getCsrfToken,
  getCurrentUser,
} from "@/app/auth/authClient";
import type { ArticleEdit, Category, Tag } from "@/app/types/models";

import TitleInput from "@/app/components/article-form/TitleInput";
import SummaryInput from "@/app/components/article-form/SummaryInput";
import CategorySelect from "@/app/components/article-form/CategorySelect";
import TagSelect from "@/app/components/article-form/TagSelect";
import MarkdownEditor from "@/app/components/article-form/MarkdownEditor";
import NormalButton from "@/app/components/ui/NormalButton";
import type { PendingImage } from "@/app/types/models";
import HeaderImageInput from "@/app/components/article-form/HeaderImageInput";
import { uploadImageToS3 } from "@/app/lib/uploadImage";

export default function NewArticlePage() {
  const router = useRouter();

  const [pendingHeader, setPendingHeader] = useState<PendingImage | null>(null);
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]); // 本文への貼り付け画像キャッシュ用（複数可）

  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(
    null,
  );

  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [pendingTags, setPendingTags] = useState<string[]>([]);

  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [body, setBody] = useState("");

  // どちらのボタンで送信中かを持つ。2つのボタンでラベルを出し分けるため真偽値にしない
  const [submittingStatus, setSubmittingStatus] = useState<
    "draft" | "published" | null
  >(null);
  // 保存済みの記事。2回目以降の保存はPOSTではなくPUTで同じ記事を更新する
  const [savedArticleId, setSavedArticleId] = useState<number | null>(null);
  // 保存時にサーバーが本置き場へ移したヘッダー画像。選び直さない限りこのキーを送り続ける
  const [savedHeaderImage, setSavedHeaderImage] = useState<{
    key: string;
    url: string;
  } | null>(null);
  const [savedMessage, setSavedMessage] = useState("");
  const [errorMessages, setErrorMessages] = useState<string[]>([]);

  const [isAuthorized, setIsAuthorized] = useState(false);

  // ログイン済みかつroleがadminのユーザーのみアクセス可能。それ以外はトップへ戻す
  useEffect(() => {
    let isActive = true;

    getCurrentUser().then((user) => {
      if (!isActive) return;
      if (user?.role === "admin") {
        setIsAuthorized(true);
      } else {
        router.replace("/");
      }
    });

    return () => {
      isActive = false;
    };
  }, [router]);

  useEffect(() => {
    if (!isAuthorized) return;

    (async () => {
      try {
        const [resCategories, resTags] = await Promise.all([
          fetch(`${API_BASE_URL}/api/categories`),
          fetch(`${API_BASE_URL}/api/tags`),
        ]);

        if (!resCategories.ok || !resTags.ok) {
          throw new Error();
        }

        const [categoriesData, tagsData] = await Promise.all([
          resCategories.json(),
          resTags.json(),
        ]);
        setCategories(categoriesData);
        setTags(tagsData);
      } catch {
        setErrorMessages([
          "カテゴリ・タグの取得に失敗しました。ページを再読み込みしてください。",
        ]);
      }
    })();
  }, [isAuthorized]);

  async function handleSubmit(status: "draft" | "published") {
    if (submittingStatus !== null) return;
    setErrorMessages([]);
    setSavedMessage("");

    const errors = validateArticleForm({
      selectedCategoryId,
      title,
      summary,
      body,
      hasHeaderImage: pendingHeader !== null || savedHeaderImage !== null,
    });
    setErrorMessages(errors);
    if (errors.length > 0) {
      return;
    }

    setSubmittingStatus(status);
    try {
      // 本文中に残っているblobプレビュー分だけ、送信時点で署名付きURLを取得してS3へアップロードする
      // （本文から削除された貼り付け画像はアップロードしない）
      const usedImages = pendingImages.filter((img) =>
        body.includes(img.blobUrl),
      );

      const uploadedImages = await Promise.all(
        usedImages.map(async (img) => ({
          blobUrl: img.blobUrl,
          ...(await uploadImageToS3(img.file)),
        })),
      );

      // 本文中のblob URLをアップロード先のURLに差し替える。
      // このURLは一時置き場のものだが、記事保存時にサーバーが本文から拾って
      // 本置き場へ移し、本文のURLも書き換える（本文が画像参照の唯一の正）
      let finalBody = body;
      for (const img of uploadedImages) {
        finalBody = finalBody.replaceAll(img.blobUrl, img.imageUrl);
      }
      // ヘッダー画像も同様に送信時点でアップロードする。
      // 選び直されていなければ保存済みのキーをそのまま送る（サーバーは自分の記事のキーなら引き継ぐ）。
      // 必須項目なのでvalidateArticleFormを通っていればどちらかは必ずある
      const headerImageKey = pendingHeader
        ? (await uploadImageToS3(pendingHeader.file)).objectKey
        : savedHeaderImage?.key;

      // 初回は新規作成、2回目以降は同じ記事の更新。こうしないと保存のたびに記事が増える
      const isUpdate = savedArticleId !== null;

      const sentPendingTags = pendingTags;

      const xsrfToken = await getCsrfToken();
      const response = await fetch(
        isUpdate
          ? `${API_BASE_URL}/api/articles/${savedArticleId}`
          : `${API_BASE_URL}/api/articles`,
        {
          method: isUpdate ? "PUT" : "POST",
          credentials: "include",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            "X-Requested-With": "XMLHttpRequest",
            "X-XSRF-TOKEN": xsrfToken,
          },
          body: JSON.stringify({
            category_id: selectedCategoryId,
            title,
            summary,
            body: finalBody,
            status,
            tags: selectedTagIds,
            ...(sentPendingTags.length > 0
              ? { new_tags: sentPendingTags }
              : {}),
            header_image_key: headerImageKey,
          }),
        },
      );

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

      const savedArticle: ArticleEdit | undefined = responseBody?.data;

      if (!savedArticle?.id) {
        setErrorMessages(["記事の保存中に予期しないエラーが発生しました。"]);
        return;
      }

      if (status === "published") {
        pendingImages.forEach((img) => URL.revokeObjectURL(img.blobUrl));
        if (pendingHeader) URL.revokeObjectURL(pendingHeader.blobUrl);

        router.push(`/articles/${savedArticle.id}`);
        return;
      }

      // 下書きは公開ページに出ないため遷移先がない。このページに留めて書き続けられるようにする。
      //
      // 画像は保存時にサーバーが一時置き場から本置き場へ移し、本文中のURLも書き換えるため、
      // 画面の入力値をそのまま持ち越すと次の保存で既に無いキーを送ることになる。
      // 保存できた内容はサーバーの返す値を正としてフォームに取り込む
      setSavedArticleId(savedArticle.id);
      // 新規タグはサーバーが保存時に作る。作られたタグは選択肢の一覧にまだ無いため、
      // 足しておかないと選択済みの表示（名前）が引けず画面から消えてしまう
      setTags((tags) => {
        const knownIds = new Set(tags.map((tag) => tag.id));
        return [
          ...tags,
          ...savedArticle.tags.filter((tag) => !knownIds.has(tag.id)),
        ];
      });
      setSelectedTagIds(savedArticle.tags.map((tag) => tag.id));
      // 新規タグはIDが付いてselectedTagIdsに入るので、送った分だけ入力中の一覧から外す
      // （保存中に足されたタグは残す）
      setPendingTags((tags) =>
        tags.filter((tag) => !sentPendingTags.includes(tag)),
      );
      // 画像の移動で本文が書き換わったときだけ取り込む。
      // 書き換えが無ければ送った内容と同じなので、保存中に書き足された分を消さずに済む
      if (savedArticle.body !== finalBody) {
        setBody(savedArticle.body);
      }
      setSavedHeaderImage({
        key: savedArticle.header_image_key,
        url: savedArticle.header_image_url,
      });

      // 本置き場へ移った画像のblobプレビューは本文から消えているので解放する
      usedImages.forEach((img) => URL.revokeObjectURL(img.blobUrl));
      setPendingImages((images) =>
        images.filter((img) => !usedImages.includes(img)),
      );
      if (pendingHeader) {
        URL.revokeObjectURL(pendingHeader.blobUrl);
        setPendingHeader(null);
      }

      setSavedMessage("下書きを保存しました。公開ページには表示されません。");
    } catch (error) {
      setErrorMessages([
        error instanceof Error
          ? error.message
          : "記事の保存中にエラーが発生しました。",
      ]);
    } finally {
      setSubmittingStatus(null);
    }
  }

  if (!isAuthorized) return null;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-12 bg-gray-50">
      <h1 className="text-2xl font-bold">記事投稿</h1>

      <HeaderImageInput
        pendingHeader={pendingHeader}
        setPendingHeader={setPendingHeader}
        savedHeaderImageUrl={savedHeaderImage?.url}
        onRemoveSavedHeaderImage={() => setSavedHeaderImage(null)}
      />
      <div className="flex gap-2">
        <CategorySelect
          categories={categories}
          selectedCategoryId={selectedCategoryId}
          setSelectedCategoryId={setSelectedCategoryId}
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

      {savedMessage && (
        <p className="rounded border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
          {savedMessage}
        </p>
      )}

      <div className="flex justify-end gap-3">
        <NormalButton
          buttonLabel={
            submittingStatus === "draft" ? "保存中..." : "下書き保存"
          }
          disabled={submittingStatus !== null}
          onClick={() => handleSubmit("draft")}
        />
        <NormalButton
          color="green"
          buttonLabel={
            submittingStatus === "published" ? "公開中..." : "公開する"
          }
          disabled={submittingStatus !== null}
          onClick={() => handleSubmit("published")}
        />
      </div>
    </main>
  );
}

function validateArticleForm({
  selectedCategoryId,
  title,
  summary,
  body,
  hasHeaderImage,
}: {
  selectedCategoryId: number | null;
  title: string;
  summary: string;
  body: string;
  hasHeaderImage: boolean;
}): string[] {
  const errors: string[] = [];
  if (!selectedCategoryId) errors.push("カテゴリを選択してください。");
  if (title === "") errors.push("タイトルを入力してください");
  else if (title.length > 255)
    errors.push("タイトルは255文字以内で入力してください");
  if (summary === "") errors.push("概要を入力してください");
  if (body === "") errors.push("本文を入力してください");
  if (!hasHeaderImage) errors.push("ヘッダー画像を選択してください。");
  return errors;
}
