import type { Metadata } from "next";

import EditArticle from "./EditArticle";

export const metadata: Metadata = {
  title: "記事編集",
};

export default function EditArticlePage() {
  return <EditArticle />;
}
