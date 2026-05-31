"use client";

const SCROLL_DURATION_MS = 900;

export default function Hero() {
  const navLinks = [
    { href: "#latest-article", label: "最新記事" },
    { href: "#popular-articles", label: "人気記事" },
    { href: "#about-site", label: "このサイトについて" },
  ];

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
    <section className="bg-[#f4f1eb] text-center py-24 px-6 h-screen flex flex-col items-center justify-center">
      <h1 className="text-6xl font-bold mb-3">TAKUO_Log</h1>
      <p className="text-base text-[#010101] mb-8">
        TAKUO2000が読んだ本と、学んだ技術の保管庫。
      </p>
      <div className="flex justify-center gap-4">
        {navLinks.map((link) => (
          <a
            key={link.href}
            href={link.href}
            onClick={(event) => scrollToSection(event, link.href)}
            className="bg-black text-white text-base px-6 py-2 hover:opacity-70 transition-opacity"
          >
            {link.label}
          </a>
        ))}
      </div>
    </section>
  );
}
