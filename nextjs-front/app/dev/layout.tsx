import { notFound } from "next/navigation";

// 部品の見本ページ。開発環境（next dev）でだけ開け、本番やプレビューでは404にする
export default function DevLayout({ children }: { children: React.ReactNode }) {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }
  return children;
}
