"use client";

import { type ReactNode, useEffect, useEffectEvent, useState } from "react";
import { useRouter } from "next/navigation";

import {
  API_BASE_URL,
  getApiErrorMessages,
  getCsrfToken,
} from "@/app/auth/authClient";
import type { ArticleEdit, Category, Tag } from "@/app/types/models";
import type { ToastNotice } from "@/app/components/ui/Toast";

import TitleInput from "@/app/components/article-form/TitleInput";
import SummaryInput from "@/app/components/article-form/SummaryInput";
import CategorySelect from "@/app/components/article-form/CategorySelect";
import TagSelect from "@/app/components/article-form/TagSelect";
import MarkdownEditor from "@/app/components/article-form/MarkdownEditor";
import NormalButton from "@/app/components/ui/NormalButton";
import type { PendingImage } from "@/app/types/models";
import HeaderImageInput from "@/app/components/article-form/HeaderImageInput";
import { uploadImageToS3 } from "@/app/lib/uploadImage";

interface ArticleFormProps {
  heading: string;
  /**
   * 編集するときの保存済みの記事。フォームの初期値にし、保存はPUTでこの記事を更新する。
   * 新規投稿では渡さない（初回の保存でPOSTし、以降は作られた記事をPUTで更新する）
   */
  initialArticle?: ArticleEdit;
  /** 保存ボタンの行の左端に置く操作（編集画面の削除ボタンなど） */
  extraActions?: ReactNode;
  /**
   * 非公開で保存できたときに、サーバーが返した保存後の記事を渡す。
   * 編集画面の削除モーダルに、保存し直したタイトルを出すために使う
   */
  onSaved?: (article: ArticleEdit) => void;
  /**
   * 保存結果の通知。トーストは画面に1つにしたいので、出すのはページ側に任せる
   * （編集画面では削除の失敗も同じトーストで出す）
   */
  onNotify: (
    type: ToastNotice["type"],
    message: ToastNotice["message"],
  ) => void;
}

/**
 * 記事の投稿・編集フォーム。
 *
 * 新規投稿も2回目以降の保存は同じ記事の更新になるため、編集は「保存済みの記事を
 * 読み込んだ状態から始める」だけの違いとして同じフォームで扱う。
 */
export default function ArticleForm({
  heading,
  initialArticle,
  extraActions,
  onNotify,
  onSaved,
}: ArticleFormProps) {
  const router = useRouter();

  const [pendingHeader, setPendingHeader] = useState<PendingImage | null>(null);
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]); // 本文への貼り付け画像キャッシュ用（複数可）

  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(
    initialArticle?.category.id ?? null,
  );

  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>(
    initialArticle?.tags.map((tag) => tag.id) ?? [],
  );
  const [pendingTags, setPendingTags] = useState<string[]>([]);

  const [title, setTitle] = useState(initialArticle?.title ?? "");
  const [summary, setSummary] = useState(initialArticle?.summary ?? "");
  const [body, setBody] = useState(initialArticle?.body ?? "");

  // どちらのボタンで送信中かを持つ。2つのボタンでラベルを出し分けるため真偽値にしない
  const [submittingStatus, setSubmittingStatus] = useState<
    "draft" | "published" | null
  >(null);
  // 保存済みの記事。2回目以降の保存はPOSTではなくPUTで同じ記事を更新する
  const [savedArticleId, setSavedArticleId] = useState<number | null>(
    initialArticle?.id ?? null,
  );
  // 保存済みの公開状態。保存ボタンのどちらを押すと何が変わるかを判断できるよう、ボタンの横に出す。
  // まだ一度も保存していない新規投稿はnull
  const [savedStatus, setSavedStatus] = useState<ArticleEdit["status"] | null>(
    initialArticle?.status ?? null,
  );
  // 保存時にサーバーが本置き場へ移したヘッダー画像。選び直さない限りこのキーを送り続ける
  const [savedHeaderImage, setSavedHeaderImage] = useState<{
    key: string;
    url: string;
  } | null>(toSavedHeaderImage(initialArticle));

  // 取得の失敗を知らせるためだけに使う。onNotifyはページが描画のたびに作り直すため、
  // 依存に入れると取得をやり直してしまう。最新のonNotifyを呼べればよいのでEffect Eventにする
  const notifyLoadError = useEffectEvent(() => {
    onNotify(
      "error",
      "カテゴリ・タグの取得に失敗しました。ページを再読み込みしてください。",
    );
  });

  useEffect(() => {
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
        notifyLoadError();
      }
    })();
  }, []);

  async function handleSubmit(status: "draft" | "published") {
    if (submittingStatus !== null) return;
    const errors = validateArticleForm({
      selectedCategoryId,
      title,
      summary,
      body,
      hasHeaderImage: pendingHeader !== null || savedHeaderImage !== null,
    });
    if (errors.length > 0) {
      onNotify("error", errors);
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
            ...(pendingTags.length > 0 ? { new_tags: pendingTags } : {}),
            header_image_key: headerImageKey,
          }),
        },
      );

      const responseBody = await response.json().catch(() => null);

      if (!response.ok) {
        onNotify(
          "error",
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
        onNotify("error", "記事の保存中に予期しないエラーが発生しました。");
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
      setSavedStatus(savedArticle.status);
      onSaved?.(savedArticle);
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
      // 新規タグはIDが付いてselectedTagIdsに入るので、入力中の一覧からは外す
      setPendingTags([]);
      setSavedHeaderImage(toSavedHeaderImage(savedArticle));

      // 保存中はフォームを操作できないため、送った内容から変わっていない前提で取り込める
      setBody(savedArticle.body);

      // 本置き場へ移った画像のblobプレビューは本文から消えているので解放する
      usedImages.forEach((img) => URL.revokeObjectURL(img.blobUrl));
      setPendingImages((images) =>
        images.filter((img) => !usedImages.includes(img)),
      );
      if (pendingHeader) {
        URL.revokeObjectURL(pendingHeader.blobUrl);
        setPendingHeader(null);
      }

      onNotify(
        "success",
        "非公開で保存しました。公開ページには表示されません。",
      );
    } catch (error) {
      onNotify(
        "error",
        error instanceof Error
          ? error.message
          : "記事の保存中にエラーが発生しました。",
      );
    } finally {
      setSubmittingStatus(null);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-12 bg-gray-50">
      <h1 className="text-2xl font-bold">{heading}</h1>

      {/* 送信中は入力を止める。保存結果をフォームへ取り込むときに、保存中の入力と競合させないため。
          クリック・ドロップを持つdiv/spanもあり、fieldsetのdisabledでは止まらないのでinertを使う */}
      <div
        inert={submittingStatus !== null}
        className={`flex flex-col gap-8 ${submittingStatus !== null ? "opacity-60" : ""}`}
      >
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
      </div>

      <div className="flex justify-end gap-3">
        {extraActions && <div className="mr-auto">{extraActions}</div>}
        <SavedStatusBadge status={savedStatus} />
        <NormalButton
          buttonLabel={
            submittingStatus === "draft" ? "保存中..." : "非公開で保存"
          }
          disabled={submittingStatus !== null}
          onClick={() => handleSubmit("draft")}
        />
        <NormalButton
          color="green"
          buttonLabel={
            submittingStatus === "published" ? "保存中..." : "公開で保存"
          }
          disabled={submittingStatus !== null}
          onClick={() => handleSubmit("published")}
        />
      </div>
    </main>
  );
}

/** 保存済みの公開状態の表示。記事管理一覧のトグルと同じ配色にそろえている */
function SavedStatusBadge({
  status,
}: {
  status: ArticleEdit["status"] | null;
}) {
  const { label, className } =
    status === "published"
      ? { label: "公開中", className: "bg-green-100 text-green-700" }
      : status === "draft"
        ? {
            label: "非公開中",
            className: "border border-dashed border-gray-400 text-gray-600",
          }
        : {
            label: "未保存",
            className: "border border-dashed border-gray-300 text-gray-400",
          };

  return (
    <span
      className={`self-center rounded-full px-3 py-1 text-xs font-semibold ${className}`}
    >
      <span className="sr-only">現在の状態：</span>
      {label}
    </span>
  );
}

/** ヘッダー画像の行が無ければキー・URLはnull。その場合は保存済み扱いにせず、保存時に選び直しを求める */
function toSavedHeaderImage(
  article: ArticleEdit | undefined,
): { key: string; url: string } | null {
  return article?.header_image_key && article.header_image_url
    ? { key: article.header_image_key, url: article.header_image_url }
    : null;
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
