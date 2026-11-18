import type { Metadata } from "next";
import { DotGothic16, Silkscreen } from "next/font/google";
import "./globals.css";
import { SITE_DATA } from "./constants/siteData";

// 本文と日本語。日本語の字形は分割されて必要な分だけ読み込まれるので、先読みするのは英数字だけにする
const dotGothic = DotGothic16({
  variable: "--font-dotgothic",
  weight: "400",
  subsets: ["latin"],
});

// 英字の見出し・ロゴ・ナビ（globals.css の font-pixel）
const silkscreen = Silkscreen({
  variable: "--font-silkscreen",
  weight: ["400", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // 子のページがtitleを決めると「<ページ名> | <サイト名>」になる。決めないページはサイト名だけを出す
  title: {
    template: `%s | ${SITE_DATA.title}`,
    default: SITE_DATA.title,
  },
  description: SITE_DATA.description,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${dotGothic.variable} ${silkscreen.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
