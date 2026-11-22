import type { Metadata } from "next";

import Footer from "@/app/components/Footer";
import Header from "@/app/components/Header";
import NewArticle from "./NewArticle";

export const metadata: Metadata = {
  title: "記事投稿",
  // ログインした人だけが使うページなので、検索結果に出さない
  robots: { index: false, follow: false },
};

export default function NewArticlePage() {
  return (
    <>
      <Header />
      <NewArticle />
      <Footer />
    </>
  );
}
