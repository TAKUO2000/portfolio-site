import type { Metadata } from "next";

// ログイン・会員登録・パスワードの再設定などは、検索結果に出さない
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
