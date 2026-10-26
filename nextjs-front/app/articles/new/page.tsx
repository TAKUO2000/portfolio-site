import type { Metadata } from "next";

import NewArticle from "./NewArticle";

export const metadata: Metadata = {
  title: "記事投稿",
};

export default function NewArticlePage() {
  return <NewArticle />;
}
