"use client";

import { useState } from "react";

import { useRequireAdmin } from "@/app/auth/useRequireAdmin";
import ArticleForm from "@/app/components/article-form/ArticleForm";
import NormalButton from "@/app/components/ui/NormalButton";
import Toast, { type ToastNotice, nextNotice } from "@/app/components/ui/Toast";

export default function NewArticle() {
  const isAuthorized = useRequireAdmin();
  const [notice, setNotice] = useState<ToastNotice | null>(null);

  if (!isAuthorized) return null;

  return (
    <>
      <ArticleForm
        heading="記事投稿"
        // ヘッダーの無い画面なので、書くのをやめて記事管理へ移る道をここに置く。
        // ヘッダーのメニューからどの画面でも来られるため、「戻る」ではなく行き先で呼ぶ
        headingActions={
          <NormalButton buttonLabel="記事管理へ" href="/articles/manage" />
        }
        onNotify={(type, message) => setNotice(nextNotice(type, message))}
      />
      <Toast notice={notice} onClose={() => setNotice(null)} />
    </>
  );
}
