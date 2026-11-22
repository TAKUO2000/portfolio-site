import type { Metadata } from "next";
import { Suspense } from "react";

import Header from "@/app/components/Header";
import Footer from "@/app/components/Footer";
import ManageArticles from "./ManageArticles";

export const metadata: Metadata = {
  title: "記事管理",
  // ログインした人だけが使うページなので、検索結果に出さない
  robots: { index: false, follow: false },
};

export default function ManageArticlesPage() {
  return (
    <>
      <Header />
      {/* 一覧はURLのクエリ(useSearchParams)を読むため、Suspenseで囲わないとビルドで失敗する */}
      <Suspense>
        <ManageArticles />
      </Suspense>
      <Footer />
    </>
  );
}
