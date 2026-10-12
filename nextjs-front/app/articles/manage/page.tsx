import { Suspense } from "react";

import Header from "@/app/components/Header";
import Footer from "@/app/components/Footer";
import ManageArticles from "./ManageArticles";

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
