import type { Metadata } from "next";

import Footer from "@/app/components/Footer";
import Header from "@/app/components/Header";
import EditArticle from "./EditArticle";

export const metadata: Metadata = {
  title: "記事編集",
};

export default function EditArticlePage() {
  return (
    <>
      <Header />
      <EditArticle />
      <Footer />
    </>
  );
}
