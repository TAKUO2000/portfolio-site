"use client";

import dynamic from "next/dynamic";

// threeは重いので初期JSに含めず、WebGLの無いサーバー側では描画しない
const PointingHandCanvas = dynamic(() => import("./PointingHandCanvas"), {
  ssr: false,
});

const SCROLL_DURATION_MS = 900;

export default function Hero() {
  // shortLabel：スマホの幅（md未満）では3つを横に並べるので、長い文言だけ短くする。
  // それでも390px未満では1行に収まらないので、文節の切れ目で折り返す（「サイトに／ついて」。auto-phrase は Chrome・Edge）
  const navLinks: { href: string; label: string; shortLabel?: string }[] = [
    { href: "#latest-article", label: "最新記事" },
    { href: "#popular-articles", label: "人気記事" },
    {
      href: "#about-site",
      label: "このサイトについて",
      shortLabel: "サイトについて",
    },
  ];
  // 画面内スクロールの実装(HTML idを利用して実装)
  const scrollToSection = (
    event: React.MouseEvent<HTMLAnchorElement>,
    href: string,
  ) => {
    event.preventDefault();

    const target = document.querySelector<HTMLElement>(href);

    if (!target) {
      return;
    }

    const startY = window.scrollY;
    const targetY = target.getBoundingClientRect().top + startY;
    const distance = targetY - startY;
    let startTime: number | null = null;

    const easeInOutCubic = (progress: number) =>
      progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;

    const scrollFrame = (currentTime: number) => {
      startTime ??= currentTime;

      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / SCROLL_DURATION_MS, 1);

      window.scrollTo(0, startY + distance * easeInOutCubic(progress));

      if (progress < 1) {
        requestAnimationFrame(scrollFrame);
      } else {
        history.pushState(null, "", href);
      }
    };

    requestAnimationFrame(scrollFrame);
  };

  return (
    <section className="relative bg-[#f4f1eb] text-center py-24 px-6 min-h-screen flex flex-col items-center justify-center">
      {/* 背景の3D。ボタンのクリックを邪魔しないようポインターイベントは素通しにする */}
      {/* yは見出しの中心の裏。大きくするほど指も長く映るので、
          指先がボタンからはみ出さない範囲でscaleを決めている。
          スマホの幅では画面が狭く、手が大きく見えるので、少し小さくする */}
      <PointingHandCanvas
        className="absolute inset-0 pointer-events-none"
        modelPosition={[0, 0.59, -0.6]}
        modelRotation={[0, 0, 0]}
        modelScale={1.3}
        mobileModelScale={1.1}
      />
      <h1 className="relative text-5xl sm:text-7xl font-extrabold mb-3">
        TAKUO_Log
      </h1>
      <p className="relative text-lg text-[#010101] mb-8">
        TAKUO2000が読んだ本と、学んだ技術の保管庫。
      </p>
      {/* md未満は3つを横に等分して並べる（折り返して詰まって見えないように）。md以上は今までどおり */}
      <div className="relative mt-20 grid w-full grid-cols-3 gap-2 md:mt-40 md:flex md:w-auto md:justify-center md:gap-10">
        {navLinks.map((link) => (
          <a
            key={link.href}
            href={link.href}
            onClick={(event) => scrollToSection(event, link.href)}
            data-point-target // ホバー中は手がこのボタンの中心を指す
            className="flex min-h-14 items-center justify-center bg-black px-1 py-2 text-center text-sm text-white transition-opacity hover:opacity-70 md:min-h-0 md:px-10 md:py-4 md:text-base"
          >
            {link.shortLabel ? (
              <>
                <span className="[word-break:auto-phrase] md:hidden">
                  {link.shortLabel}
                </span>
                <span className="hidden md:inline">{link.label}</span>
              </>
            ) : (
              link.label
            )}
          </a>
        ))}
      </div>
    </section>
  );
}
