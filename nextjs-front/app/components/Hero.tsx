"use client";

import dynamic from "next/dynamic";

// threeは重いので初期JSに含めず、WebGLの無いサーバー側では描画しない
const PointingHandCanvas = dynamic(() => import("./PointingHandCanvas"), {
  ssr: false,
});

const SCROLL_DURATION_MS = 900;

export default function Hero() {
  const navLinks = [
    { href: "#latest-article", label: "最新記事" },
    { href: "#popular-articles", label: "人気記事" },
    { href: "#about-site", label: "このサイトについて" },
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
      <PointingHandCanvas
        className="absolute inset-0 pointer-events-none"
        modelPosition={[0, 0.2, -0.6]}
        modelRotation={[0, 0, 0]}
      />
      <h1 className="relative text-7xl font-extrabold mb-3">TAKUO_Log</h1>
      <p className="relative text-lg text-[#010101] mb-8">
        TAKUO2000が読んだ本と、学んだ技術の保管庫。
      </p>
      <div className="relative mt-20 sm:mt-40 flex flex-wrap justify-center gap-4 sm:gap-10">
        {navLinks.map((link) => (
          <a
            key={link.href}
            href={link.href}
            onClick={(event) => scrollToSection(event, link.href)}
            data-point-target // ホバー中は手がこのボタンの中心を指す
            className="bg-black text-white text-base px-6 sm:px-10 py-4 hover:opacity-70 transition-opacity"
          >
            {link.label}
          </a>
        ))}
      </div>
    </section>
  );
}
