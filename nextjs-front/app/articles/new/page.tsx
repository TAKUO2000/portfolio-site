"use client";

import { useState } from "react";

import { useRequireAdmin } from "@/app/auth/useRequireAdmin";
import ArticleForm from "@/app/components/article-form/ArticleForm";
import Toast, { type ToastNotice, nextNotice } from "@/app/components/ui/Toast";

export default function NewArticlePage() {
  const isAuthorized = useRequireAdmin();
  const [notice, setNotice] = useState<ToastNotice | null>(null);

  if (!isAuthorized) return null;

  return (
    <>
      <ArticleForm
        heading="記事投稿"
        onNotify={(type, message) => setNotice(nextNotice(type, message))}
      />
      <Toast notice={notice} onClose={() => setNotice(null)} />
    </>
  );
}
