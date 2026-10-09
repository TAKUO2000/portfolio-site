"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useRequireAdmin } from "@/app/auth/useRequireAdmin";
import ArticleForm from "@/app/components/article-form/ArticleForm";
import ConfirmDeleteModal from "@/app/components/ui/ConfirmDeleteModal";
import NormalButton from "@/app/components/ui/NormalButton";
import Toast, { type ToastNotice, nextNotice } from "@/app/components/ui/Toast";
import { setFlashNotice } from "@/app/lib/flashNotice";
import {
  MyArticleApiError,
  deleteMyArticle,
  fetchArticleForEdit,
} from "@/app/lib/myArticles";
import type { ArticleEdit } from "@/app/types/models";

export default function EditArticlePage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const articleId = Number(id);
  const isAuthorized = useRequireAdmin();

  const [article, setArticle] = useState<ArticleEdit | null>(null);
  // 記事を開けなかったときに、フォームの代わりに出す文言
  const [loadError, setLoadError] = useState("");

  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [notice, setNotice] = useState<ToastNotice | null>(null);

  useEffect(() => {
    if (!isAuthorized) return;
    let isActive = true;

    (async () => {
      // 数字でないidはAPIに送っても404になるだけなので、手前で弾く
      if (!Number.isInteger(articleId) || articleId < 1) {
        setLoadError("記事が見つかりません。");
        return;
      }

      try {
        const result = await fetchArticleForEdit(articleId);
        if (isActive) setArticle(result);
      } catch (error) {
        if (!isActive) return;
        setLoadError(
          error instanceof MyArticleApiError
            ? error.message
            : "記事の取得に失敗しました。ページを再読み込みしてください。",
        );
      }
    })();

    return () => {
      isActive = false;
    };
  }, [isAuthorized, articleId]);

  async function handleDelete() {
    if (!article || isDeleting) return;

    setIsDeleting(true);
    try {
      await deleteMyArticle(article.id);
      // 削除した記事の画面には居られないので一覧へ戻り、結果は戻った先で知らせる
      setFlashNotice("success", `「${article.title}」を削除しました`);
      router.push("/articles/manage");
    } catch (error) {
      setIsDeleting(false);
      setIsConfirmingDelete(false);
      setNotice(
        nextNotice(
          "error",
          error instanceof MyArticleApiError
            ? error.message
            : "記事の削除に失敗しました。",
        ),
      );
    }
  }

  if (!isAuthorized) return null;

  if (loadError) {
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-col items-start gap-6 px-6 py-12">
        <h1 className="text-2xl font-bold">記事編集</h1>
        <p role="alert" className="text-sm text-red-700">
          {loadError}
        </p>
        <Link href="/articles/manage" className="text-sm underline">
          記事管理へ戻る
        </Link>
      </main>
    );
  }

  if (!article) {
    return (
      <p className="py-16 text-center text-sm text-gray-500">読み込み中...</p>
    );
  }

  return (
    <>
      <ArticleForm
        heading="記事編集"
        initialArticle={article}
        onNotify={(type, message) => setNotice(nextNotice(type, message))}
        // フォームの初期値には使われ終わっているので、差し替えても入力中の内容は変わらない。
        // 削除モーダルのタイトルを保存後のものにするために持ち直す
        onSaved={setArticle}
        extraActions={
          <NormalButton
            color="red"
            buttonLabel="削除"
            onClick={() => setIsConfirmingDelete(true)}
            disabled={isDeleting}
          />
        }
      />

      <ConfirmDeleteModal
        targetTitle={isConfirmingDelete ? article.title : null}
        isDeleting={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setIsConfirmingDelete(false)}
      />
      <Toast notice={notice} onClose={() => setNotice(null)} />
    </>
  );
}
