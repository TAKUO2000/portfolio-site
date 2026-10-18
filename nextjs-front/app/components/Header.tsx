"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import HeaderAuthStatus from "./HeaderAuthStatus";

export default function Header() {
  // スマホ幅でのメニューの開閉。md以上では常に表示するので使わない
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // メニュー内で移動・ログアウトしたら、開いたまま残らないよう閉じる
  const closeMenuOnAction = (event: React.MouseEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest("a, button")) {
      setIsMenuOpen(false);
    }
  };

  return (
    <header className="w-full bg-black text-white">
      <nav className="max-w-5xl mx-auto px-6 py-4 flex flex-wrap items-center justify-between md:flex-nowrap">
        {/* スマホ幅ではロゴを中央に置くため、メニューボタンと同じ幅の空きを左に作る */}
        <span className="size-6 md:hidden" aria-hidden="true" />
        {/* Heroの見出しと同じ書体・太さにして、どのページでもサイト名がわかるようにする */}
        <Link
          href="/"
          className="flex items-center gap-3 text-xl font-extrabold hover:opacity-70 transition-opacity"
        >
          {/* IconAboutSite.pngは絵柄が中心から左にずれていて余白も大きいので、
              絵柄を中心に切り出したヘッダー用の画像を丸く表示する */}
          <Image
            src="/HeaderIcon.png"
            alt="" // 隣のサイト名と同じ内容なので読み上げない
            width={36}
            height={36}
            priority
            className="size-9 shrink-0 rounded-full"
          />
          TAKUO_Log
        </Link>
        <button
          type="button"
          className="size-6 md:hidden hover:opacity-70 transition-opacity"
          onClick={() => setIsMenuOpen((isOpen) => !isOpen)}
          aria-expanded={isMenuOpen}
          aria-controls="header-menu"
          aria-label={isMenuOpen ? "メニューを閉じる" : "メニューを開く"}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            className="size-6"
            aria-hidden="true"
          >
            {isMenuOpen ? (
              <path d="M6 6l12 12M18 6L6 18" />
            ) : (
              <path d="M4 7h16M4 12h16M4 17h16" />
            )}
          </svg>
        </button>
        {/* スマホ幅では折り返して2行目に縦並びで開き、md以上ではロゴの右に横並びで常に出す */}
        <div
          id="header-menu"
          onClick={closeMenuOnAction}
          className={`${isMenuOpen ? "flex" : "hidden"} basis-full flex-col gap-4 pt-4 md:flex md:flex-1 md:basis-auto md:flex-row md:items-center md:justify-between md:ml-10 md:pt-0`}
        >
          <Link
            href="/articles"
            className="text-sm font-semibold hover:opacity-70 transition-opacity"
          >
            Articles
          </Link>
          <HeaderAuthStatus />
        </div>
      </nav>
    </header>
  );
}
