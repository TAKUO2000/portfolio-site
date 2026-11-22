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
    // スマホ幅では、ヘッダーの場所は閉じたときの高さのまま動かさず、中身を上に重ねて置く。
    // メニューを開いても下の内容は押し下げられず、メニューがその上に重なる
    <header className="relative z-50 h-(--header-h) w-full text-white md:h-auto">
      <div className="absolute inset-x-0 top-0 bg-foreground md:static">
        {/* 高さは globals.css の --header-h（Hero の高さの計算でも使う）。上下の余白やロゴの大きさを変えて
            高さが変わるときは、--header-h も合わせる */}
        <nav className="max-w-5xl mx-auto px-3.5 py-3 min-h-(--header-h) flex flex-wrap items-center justify-between md:flex-nowrap md:px-6">
          {/* スマホ幅ではロゴを中央に置くため、メニューボタンと同じ幅の空きを左に作る */}
          <span className="size-11 md:hidden" aria-hidden="true" />
          {/* 幅 360px 未満では、ロゴとメニューボタンが1行に収まるよう、文字と間を少し詰める */}
          <Link
            href="/"
            className="flex items-center gap-2 font-pixel text-lg font-bold min-[360px]:gap-3 min-[360px]:text-[22px]"
          >
            {/* 20px のドット絵を2倍で出す。ぼかさずに拡大して、ドットの角を残す */}
            <Image
              src="/HeaderIconPixel.png"
              alt="" // 隣のサイト名と同じ内容なので読み上げない
              width={40}
              height={40}
              priority
              unoptimized
              className="size-10 shrink-0 [image-rendering:pixelated]"
            />
            TAKUO_Log
          </Link>
          {/* 指で押しやすいよう、押せる範囲は 44px にする */}
          <button
            type="button"
            className="flex size-11 cursor-pointer items-center justify-center md:hidden"
            onClick={() => setIsMenuOpen((isOpen) => !isOpen)}
            aria-expanded={isMenuOpen}
            aria-controls="header-menu"
            aria-label={isMenuOpen ? "メニューを閉じる" : "メニューを開く"}
          >
            {/* 1マス 4px のドット絵。線がにじまないよう crispEdges で描く */}
            {isMenuOpen ? (
              <svg
                viewBox="0 0 5 5"
                shapeRendering="crispEdges"
                className="size-5"
                aria-hidden="true"
              >
                <path
                  fill="currentColor"
                  d="M0 0h1v1H0zM1 1h1v1H1zM2 2h1v1H2zM3 3h1v1H3zM4 4h1v1H4zM4 0h1v1H4zM3 1h1v1H3zM1 3h1v1H1zM0 4h1v1H0z"
                />
              </svg>
            ) : (
              <svg
                viewBox="0 0 6 5"
                shapeRendering="crispEdges"
                className="h-5 w-6"
                aria-hidden="true"
              >
                <path
                  fill="currentColor"
                  d="M0 0h6v1H0zM0 2h6v1H0zM0 4h6v1H0z"
                />
              </svg>
            )}
          </button>
          {/* スマホ幅では折り返して2行目に縦並びで開き（下の内容には重なる）、md以上ではロゴの右に横並びで常に出す */}
          <div
            id="header-menu"
            onClick={closeMenuOnAction}
            className={`${isMenuOpen ? "flex" : "hidden"} basis-full flex-col items-start gap-4.5 px-2.5 pt-4.5 pb-2.5 md:flex md:min-w-0 md:flex-1 md:basis-auto md:flex-row md:items-center md:justify-between md:gap-4 md:ml-10 md:p-0`}
          >
            <Link
              href="/articles"
              className="font-pixel text-sm leading-11 hover:underline md:leading-5"
            >
              Articles
            </Link>
            <HeaderAuthStatus />
          </div>
        </nav>
        {/* 境目のディザ模様。高さを持たせず、下に続く内容の上に重ねる */}
        <div
          aria-hidden="true"
          className="pixel-dither-down pointer-events-none absolute inset-x-0 top-full z-10 text-foreground"
        />
      </div>
    </header>
  );
}
